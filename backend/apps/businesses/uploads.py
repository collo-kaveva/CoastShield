"""Logo upload hardening. We never trust the filename, extension or declared content type:
the bytes are decoded as an image, checked, stripped of metadata by re-encoding, resized, and stored under a random name."""
import io
import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}  # SVG and GIF are deliberately not accepted
MAX_PIXELS = 16_000_000  # decompression-bomb guard (Pillow raises at 2x this value)
MAX_SIDE = 512


class InvalidImage(Exception):
    pass


def process_logo(upload) -> ContentFile:
    if upload.size == 0:
        raise InvalidImage("That file is empty.")
    if upload.size > settings.MAX_UPLOAD_BYTES:
        raise InvalidImage(f"That image is too large (maximum {settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB).")
    data = upload.read(settings.MAX_UPLOAD_BYTES + 1)
    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise InvalidImage(f"That image is too large (maximum {settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB).")

    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    try:
        probe = Image.open(io.BytesIO(data))
        if probe.format not in ALLOWED_FORMATS:
            raise InvalidImage("Use a JPEG, PNG or WebP image.")
        if probe.width * probe.height > MAX_PIXELS:
            raise InvalidImage("That image has too many pixels. Use a smaller one.")
        probe.verify()  # structural check; the object is unusable afterwards
        img = Image.open(io.BytesIO(data))
        img.load()  # fully decode: truncated or malicious files fail here
    except InvalidImage:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError, SyntaxError, EOFError, MemoryError):
        raise InvalidImage("That file is not a valid image. Use a JPEG, PNG or WebP image.")

    img = ImageOps.exif_transpose(img)  # honour rotation, then drop all metadata (GPS, camera, comments) by re-encoding
    img = img.convert("RGBA" if "A" in img.getbands() or img.mode == "P" else "RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)  # first frame only; trailing/polyglot data cannot survive
    return ContentFile(out.getvalue(), name=f"{uuid.uuid4().hex}.png")  # random name: client filename is ignored
