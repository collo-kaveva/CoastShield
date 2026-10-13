"""Conservative URL inspection. Parses text only. NEVER resolves, connects to or fetches a submitted URL,
so there is no SSRF surface and no redirect following."""
import re
from urllib.parse import urlsplit, urlunsplit

from .scoring import DISCLAIMER, classify, indicator

MAX_URL_LENGTH = 2048
F = re.IGNORECASE | re.ASCII

CC_SLD = {"co", "com", "or", "go", "ac", "ne", "org", "net", "gov", "sc"}
SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc", "rebrand.ly"}
ODD_TLDS = {"xyz", "top", "click", "icu", "tk", "gq", "cf", "ml", "ga", "zip", "mov", "buzz", "rest", "cam"}

# (name, tokens, official domains). The list is deliberately small and is disclosed to users as limited.
BRANDS = [
    ("Safaricom / M-PESA", ["safaricom", "mpesa", "m-pesa"], ["safaricom.co.ke", "safaricom.com", "m-pesa.com"]),
    ("Airtel", ["airtel"], ["airtel.co.ke", "airtel.africa", "airtel.com"]),
    ("Equity Bank", ["equitybank", "equity"], ["equitybank.co.ke", "equitygroupholdings.com"]),
    ("KCB", ["kcb"], ["kcbgroup.com"]),
    ("Co-operative Bank", ["co-opbank", "coopbank"], ["co-opbank.co.ke"]),
    ("NCBA", ["ncba"], ["ncbagroup.com"]),
    ("KRA", ["kra"], ["kra.go.ke"]),
    ("eCitizen / Huduma", ["ecitizen", "huduma"], ["ecitizen.go.ke", "hudumakenya.go.ke"]),
    ("Jumia", ["jumia"], ["jumia.co.ke", "jumia.com"]),
    ("PayPal", ["paypal"], ["paypal.com"]),
    ("WhatsApp", ["whatsapp"], ["whatsapp.com", "whatsapp.net"]),
    ("Facebook", ["facebook"], ["facebook.com"]),
    ("Google", ["google"], ["google.com"]),
]

PRIVATE_IP = re.compile(r"^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[01])\.)")
UNSAFE_SCHEME = re.compile(r"^(javascript|data|vbscript|file|blob|intent):", F)
HAS_SCHEME = re.compile(r"^[a-z][a-z0-9+.-]*://", F)
HTTP_SCHEME = re.compile(r"^https?://", F)
BAD_CHARS = re.compile(r'[\s<>"]')
LOGIN_WORDS = re.compile(r"(login|signin|verify|secure|update|confirm|wallet|reward|bonus|account)")
NUMERIC_LABEL = re.compile(r"^(0x[0-9a-f]*|[0-9]+)$", re.I)

URL_RECS = [
    "Do not enter passwords, PINs or codes on a page you reached from a message.",
    "If you need the site, type the official address yourself or use the official app.",
]


def registrable_domain(host: str) -> str:
    labels = host.split(".")
    if len(labels) <= 2:
        return host
    tld, sld = labels[-1], labels[-2]
    return ".".join(labels[-3:]) if len(tld) == 2 and sld in CC_SLD else ".".join(labels[-2:])


def _is_legit(host: str, domains) -> bool:
    return any(host == d or host.endswith("." + d) for d in domains)


def _has_token(host: str, token: str) -> bool:
    return token in re.split(r"[.-]", host) if len(token) <= 3 else token in host


def _parse_ipv4_part(p: str):
    try:
        if p.lower().startswith("0x"):
            return int(p[2:] or "0", 16)
        if len(p) > 1 and p.startswith("0"):
            return int(p, 8)
        return int(p, 10)
    except ValueError:
        return None


def _normalize_ipv4(host: str):
    """Mirror browser URL parsing: 2130706433 and 0x7f.1 both mean 127.0.0.1. Returns (ip|None, failed)."""
    parts = host.split(".")
    if not parts or not NUMERIC_LABEL.match(parts[-1]):
        return None, False  # not an IPv4 literal: treat as a normal name
    if len(parts) > 4 or any(not NUMERIC_LABEL.match(p) for p in parts):
        return None, True
    nums = [_parse_ipv4_part(p) for p in parts]
    if any(n is None for n in nums):
        return None, True
    *head, last = nums
    if any(n > 255 for n in head) or last >= 256 ** (5 - len(nums)):
        return None, True
    value = last
    for i, n in enumerate(head):
        value += n * 256 ** (3 - i)
    return ".".join(str((value >> s) & 255) for s in (24, 16, 8, 0)), False


def _result(indicators, valid, normalized, hostname):
    risk = classify(indicators)
    summary = (
        "Several warning signs were found in this address. Treat it as risky until you verify it another way." if risk == "HIGH"
        else "This address has some warning signs. That does not prove it is harmful, but do not trust it without checking." if risk == "CAUTION"
        else "No obvious warning signs were found in the address itself. This does not guarantee the destination is safe."
    )
    recs = list(URL_RECS)
    ids = {i["id"] for i in indicators}
    if "shortener" in ids:
        recs.append("Shortened links hide where they lead. Ask the sender for the full address through another channel.")
    if "unsafe_scheme" in ids:
        recs.append("Do not open this. Addresses that start this way can run code instead of showing a website.")
    return {"risk": risk, "indicators": indicators, "summary": summary, "recommendations": recs, "disclaimer": DISCLAIMER,
            "valid": valid, "normalizedUrl": normalized, "hostname": hostname}


def _invalid(message):
    return _result([indicator("invalid_url", "Not a valid web address", "medium", message)], False, None, None)


def analyze_url(value) -> dict:
    raw = value.strip() if isinstance(value, str) else ""
    if not raw:
        return _invalid("Enter a web address to check.")
    if len(raw) > MAX_URL_LENGTH:
        return _invalid(f"The address is too long (maximum {MAX_URL_LENGTH} characters).")

    if UNSAFE_SCHEME.match(raw):
        return _result([indicator("unsafe_scheme", "Unsafe or unusual address type", "high",
                                  "This is not a normal website address. Some of these types can run code or open local files.", raw[:20])], False, None, None)
    has_scheme = bool(HAS_SCHEME.match(raw))
    if has_scheme and not HTTP_SCHEME.match(raw):
        return _result([indicator("unsafe_scheme", "Unusual address type", "high",
                                  "Only http and https are normal for websites. Other types can open apps or files.")], False, None, None)
    if BAD_CHARS.search(raw):
        return _invalid("Web addresses do not contain spaces or special characters like < > or quotes.")

    try:
        parts = urlsplit(raw if has_scheme else f"https://{raw}")
        port = parts.port  # raises ValueError when invalid
        host = (parts.hostname or "").lower().rstrip(".")
    except ValueError:
        return _invalid("This could not be read as a web address.")
    if not host:
        return _invalid("This could not be read as a web address.")
    is_v6 = "[" in parts.netloc.rsplit("@", 1)[-1]

    ip = None
    if not is_v6:
        ip, failed = _normalize_ipv4(host)  # before the dot check: "2130706433" is an IP, like in a browser
        if failed:
            return _invalid("This could not be read as a web address.")
        if ip:
            host = ip
        elif "." not in host:
            return _invalid("This address has no valid website name.")

    if not is_v6 and not ip and not host.isascii():
        try:
            host = host.encode("idna").decode("ascii")
        except UnicodeError:
            return _invalid("This could not be read as a web address.")

    found = []
    if parts.username or parts.password:
        found.append(indicator("userinfo", "Text before an @ sign", "high",
                               "Anything before “@” in an address is ignored when visiting. Scammers use it to make a link look like a trusted site."))

    if ip or is_v6:
        private = bool(ip and PRIVATE_IP.match(ip))
        found.append(indicator("ip_host", "Numbers instead of a website name", "medium",
                               "This points to a local or private network address, which is unusual for a public message." if private
                               else "Legitimate businesses rarely send customers to a raw IP address."))
    else:
        reg = registrable_domain(host)
        for name, tokens, domains in BRANDS:
            if any(_has_token(host, t) for t in tokens) and not _is_legit(host, domains):
                found.append(indicator("brand_lookalike", f"Uses the name “{name}”", "high",
                                       f"The address mentions {name} but is not one of its known websites (our list is limited). Imitation addresses are a common trick.", host))
        if reg in SHORTENERS:
            found.append(indicator("shortener", "Shortened link", "medium", "The real destination is hidden behind a short link. CoastShield does not open links to check them.", reg))
        if any(l.startswith("xn--") for l in host.split(".")):
            found.append(indicator("punycode", "Look-alike characters", "medium", "The name uses special encoding that can disguise look-alike letters (for example a different “a”)."))
        tld = host.rsplit(".", 1)[-1]
        if tld in ODD_TLDS:
            found.append(indicator("odd_tld", f"Uncommon ending “.{tld}”", "low", "Some endings are often used for throwaway sites. This is only a weak hint, not proof."))
        if len(host.split(".")) >= 5:
            found.append(indicator("many_parts", "Very long website name", "low", "Many dot-separated parts can be used to bury a trusted-looking word at the start."))
        if host.count("-") >= 3:
            found.append(indicator("hyphens", "Many hyphens", "low", "Several hyphens in a website name are common in imitation sites."))
        if LOGIN_WORDS.search(host) and not any(i["id"] == "brand_lookalike" for i in found):
            found.append(indicator("login_words", "Login-style words in the name", "low", "Words like “verify” or “secure” in the website name are often used to look official.", reg))

    if parts.scheme == "http":
        found.append(indicator("no_https", "Not encrypted (http)", "low", "Information sent to this site is not protected in transit."))
    if port and port not in (80, 443):
        found.append(indicator("odd_port", "Unusual port number", "low", "Normal websites rarely need a custom port number."))
    if len(raw) > 200:
        found.append(indicator("long_url", "Very long address", "low", "Extremely long addresses can hide where they lead."))

    shown_host = f"[{host}]" if is_v6 else host
    normalized = urlunsplit((parts.scheme, shown_host + (f":{port}" if port else ""), parts.path, parts.query, parts.fragment))
    return _result(found, True, normalized, host)
