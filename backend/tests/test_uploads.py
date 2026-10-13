import io
import os
import struct

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.throttling import ScopedRateThrottle

from apps.audit.models import AuditEvent

from .conftest import client_for, make_business, make_user

pytestmark = pytest.mark.django_db
URL = "/api/v1/business/me/logo/"


@pytest.fixture(autouse=True)
def media(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


def img_bytes(fmt="PNG", size=(64, 48), mode="RGB", **save):
    b = io.BytesIO()
    Image.new(mode, size, (200, 30, 30) if mode == "RGB" else 1).save(b, fmt, **save)
    return b.getvalue()


def up(c, data, name="logo.png", ctype="image/png", url=URL):
    return c.post(url, {"logo": SimpleUploadedFile(name, data, content_type=ctype)}, format="multipart")


def stored(media):
    return [os.path.join(r, f) for r, _, fs in os.walk(media) for f in fs]


def test_valid_image_is_accepted_resized_and_reencoded(owner_client, biz, media):
    r = up(owner_client, img_bytes("JPEG", (2000, 1500)), name="../../evil name.php.jpg", ctype="text/html")  # lying name and type
    assert r.status_code == 200
    url = r.json()["logoUrl"]
    assert url.startswith("/media/logos/") and url.endswith(".png") and "evil" not in url and ".php" not in url
    (path,) = stored(media)
    with Image.open(path) as im:
        assert im.format == "PNG" and max(im.size) <= 512


def test_metadata_is_stripped(owner_client, biz, media):
    exif = Image.Exif(); exif[0x010F] = "SecretCameraMaker"; exif[0x8825] = {1: "S", 2: (1, 2, 3)}
    b = io.BytesIO(); Image.new("RGB", (80, 80), "red").save(b, "JPEG", exif=exif); data = b.getvalue()
    assert b"SecretCameraMaker" in data
    up(owner_client, data, "p.jpg", "image/jpeg")
    (path,) = stored(media)
    raw = open(path, "rb").read()
    assert b"SecretCameraMaker" not in raw and len(Image.open(path).getexif()) == 0


def test_polyglot_trailing_payload_does_not_survive(owner_client, biz, media):
    up(owner_client, img_bytes() + b"<?php system($_GET['c']); ?><script>alert(1)</script>", "x.png")
    (path,) = stored(media)
    raw = open(path, "rb").read()
    assert b"<?php" not in raw and b"<script" not in raw


@pytest.mark.parametrize("name,data,ctype", [
    ("a.png", b"this is just text", "image/png"),
    ("a.png", b"", "image/png"),
    ("a.svg", b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "image/svg+xml"),
    ("a.png", b'<svg xmlns="http://www.w3.org/2000/svg"/>', "image/png"),
    ("a.html", b"<html><script>alert(1)</script></html>", "text/html"),
    ("a.php", b"<?php phpinfo(); ?>", "application/x-php"),
    ("a.pdf", b"%PDF-1.4 fake", "application/pdf"),
    ("a.png", img_bytes("PNG")[:40], "image/png"),  # truncated image
    ("a.gif", img_bytes("GIF"), "image/gif"),  # real image, disallowed type
    ("a.bmp", img_bytes("BMP"), "image/bmp"),
])
def test_non_images_and_disallowed_types_are_rejected(owner_client, biz, media, name, data, ctype):
    r = up(owner_client, data, name, ctype)
    assert r.status_code == 422 and "logo" in r.json()["error"]["fields"]
    assert stored(media) == []
    biz.refresh_from_db(); assert not biz.logo


def test_a_real_image_with_a_misleading_extension_is_judged_by_content(owner_client, biz):
    assert up(owner_client, img_bytes("PNG"), "photo.txt", "text/plain").status_code == 200  # valid bytes win over the name


def test_oversized_files_are_refused(owner_client, biz, media, settings):
    settings.MAX_UPLOAD_BYTES = 50_000
    noisy = os.urandom(120_000)
    big = io.BytesIO(); Image.frombytes("RGB", (200, 200), noisy[:200 * 200 * 3] if len(noisy) >= 120000 else noisy.ljust(120000)).save(big, "PNG")
    assert len(big.getvalue()) > 50_000
    r = up(owner_client, big.getvalue())
    assert r.status_code in (413, 422) and stored(media) == []


def test_decompression_bomb_is_refused(owner_client, biz, media):
    b = io.BytesIO(); Image.new("1", (17000, 17000)).save(b, "PNG")
    assert len(b.getvalue()) < 2_000_000  # tiny on the wire, enormous in memory
    r = up(owner_client, b.getvalue())
    assert r.status_code == 422 and stored(media) == []


def test_missing_field_wrong_method_and_no_business(owner_client, owner, anon):
    assert owner_client.post(URL, {}, format="multipart").status_code == 404  # no business yet
    make_business(owner)
    assert owner_client.post(URL, {}, format="multipart").status_code == 422
    assert owner_client.post(URL, {"logo": "just a string"}, format="multipart").status_code == 422
    assert owner_client.post(URL, '{"logo": "x"}', content_type="application/json").status_code == 415
    assert anon.post(URL, {}, format="multipart").status_code == 401


def test_replace_and_delete_remove_old_files(owner_client, biz, media):
    up(owner_client, img_bytes(size=(50, 50)))
    first = stored(media)
    up(owner_client, img_bytes(size=(60, 60)))
    second = stored(media)
    assert len(second) == 1 and second != first  # old file deleted, not orphaned
    r = owner_client.delete(URL)
    assert r.status_code == 200 and r.json()["logoUrl"] is None and stored(media) == []
    assert [e.metadata["change"] for e in AuditEvent.objects.filter(action="BUSINESS_LOGO_CHANGED").order_by("created_at")] == ["set", "set", "removed"]


def test_owners_can_only_change_their_own_logo(owner_client, other_client, biz, other, media):
    ob = make_business(other, "Other Biz")
    up(other_client, img_bytes())
    up(owner_client, img_bytes(size=(70, 70)))
    ob.refresh_from_db(); biz.refresh_from_db()
    assert ob.logo and biz.logo and ob.logo.name != biz.logo.name
    owner_client.delete(URL)
    ob.refresh_from_db(); assert ob.logo  # other owner's logo untouched


def test_logo_is_public_only_via_a_published_storefront(anon, owner_client, biz):
    up(owner_client, img_bytes())
    assert anon.get(f"/api/v1/storefronts/{biz.slug}/").json()["business"]["logoUrl"].startswith("/media/logos/")
    owner_client.post("/api/v1/business/me/unpublish/")
    assert anon.get(f"/api/v1/storefronts/{biz.slug}/").status_code == 404  # drafts (and their logos) are not advertised


def test_uploads_are_rate_limited(owner_client, biz, monkeypatch):
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "upload", "2/hour")
    assert [up(owner_client, img_bytes()).status_code for _ in range(4)] == [200, 200, 429, 429]


def test_logo_url_not_writable_through_the_business_json_api(owner_client, biz):
    r = owner_client.put("/api/v1/business/me/", {"name": "Fish", "category": "FISH_SEAFOOD", "logoUrl": "https://evil.example/x.png", "logo": "evil.png",
                         "hours": biz.hours, "phone": "0700 111 222", "description": "Fresh fish every day."}, format="json")
    assert r.status_code == 200 and r.json()["logoUrl"] is None
