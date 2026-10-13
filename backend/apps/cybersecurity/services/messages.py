import re

from .scoring import DISCLAIMER, classify, indicator, max_severity
from .urlcheck import BRANDS, analyze_url

MAX_MESSAGE_LENGTH = 2000
F = re.IGNORECASE | re.ASCII

URL_RE = re.compile(
    r"\b(?:https?://|www\.)[^\s<>\"']+|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|net|org|info|xyz|top|click|link|me|co\.ke|go\.ke|or\.ke|ke|ly|cc|icu|site|online|app)(?:/[^\s<>\"']*)?", F)

SECRET = re.compile(r"\b(pin|password|passcode|one[\s-]?time\s+(?:code|password|pin)|otp|verification\s+code|security\s+code|cvv|secret\s+code)\b", F)
ASK = re.compile(r"\b(send|share|reply|confirm|enter|provide|give|tell|submit|type|forward|read\s+out)\b", F)
WARNING_NEGATION = re.compile(r"\b(never|do\s+not|don'?t|dont|not)\b[^.!?]{0,25}\b(share|give|tell|send|disclose|reveal|reply)\b", F)
URGENCY = re.compile(r"\b(urgent(?:ly)?|immediately|within\s+[0-9]+\s*(?:minutes?|mins?|hours?|hrs?)|right\s+now|act\s+now|last\s+warning|final\s+notice|expires?\s+(?:today|soon)|will\s+be\s+(?:blocked|suspended|closed|deactivated|locked))\b", F)
MONEY = re.compile(r"\b(?:ksh|kes|sh)\.?\s?[0-9][0-9,]*|\b[0-9][0-9,]{2,}\s?(?:ksh|kes|/=|shillings?)", F)
MISTAKEN = re.compile(r"\b(?:sent|transferred|deposited|paid)\b[^.!?]{0,60}\b(?:by\s+mistake|wrongly|in\s+error|mistakenly|accidentally)\b", F)
RETURN_REQ = re.compile(r"\b(?:please|kindly)\s+(?:return|send\s+back|refund|reverse)\b", F)
PHONE = re.compile(r"(?:\+?254|0)[17][0-9]{8}")
PROBLEM = [
    re.compile(r"\b(?:account|wallet|sim|card|payment|transaction|parcel|delivery)\b[^.!?]{0,60}\b(?:suspend\w*|block\w*|lock\w*|deactivat\w*|clos\w+|fail\w*|problem|issue|verify|verification|unusual|restricted|expire\w*|on\s+hold|pending)\b", F),
    re.compile(r"\b(?:problem|issue|trouble)\b[^.!?]{0,30}\b(?:account|wallet|card|payment)\b", F),
    re.compile(r"\b(?:verify|confirm|update|unlock|reactivate)\b[^.!?]{0,40}\b(?:account|details|identity|wallet)\b", F),
]
INSTALL = re.compile(r"\b(?:install|download|open)\b[^.!?]{0,40}\b(?:app|apk|software|program|tool)\b|\b(?:anydesk|teamviewer|quicksupport|rustdesk|remote\s+(?:access|control|support)|share\s+(?:your\s+)?screen)\b", F)
PRIZE = re.compile(r"\b(?:congratulations|you(?:'ve|\s+have)\s+won|you\s+are\s+(?:a\s+)?winner|lucky\s+winner|lottery|jackpot|claim\s+your\s+(?:prize|reward|gift))\b", F)
CONFIRM_TEXT = re.compile(r"\bconfirmed\b", F)
PAID_WORD = re.compile(r"\b(received|sent|paid|transferred)\b", F)
TILL = re.compile(r"\b(till|paybill|pay\s?bill)\b", F)
PAY_VERB = re.compile(r"\b(send|transfer|deposit|pay)\b", F)

_BRAND_PATTERNS = [(name, [re.compile(r"\b" + t.replace("-", "[- ]?") + r"\b", F) for t in tokens]) for name, tokens, _ in BRANDS]

REC = {
    "credentials": "Never share PINs, passwords or one-time codes with anyone, including people who say they work for a provider.",
    "urgency": "Pressure to act quickly is a common tactic. Pause and take your time.",
    "mistaken_transfer": "Do not send money back because of a message. Check your real balance and statement in the official app or menu, and ask the provider to handle genuine reversals.",
    "money_request": "Do not send money to a number, till or paybill you did not expect. Confirm with the person using a contact you already trust.",
    "account_problem": "Do not tap the link. Open the official app or website yourself, or contact the provider through the channel on your SIM pack, card or official site.",
    "link_warnings": "Do not open the link. If you must check it, type the official address yourself.",
    "remote_access": "Do not install apps or allow remote access because someone asked. Genuine providers do not request this.",
    "prize": "Prizes you did not enter for are usually scams. Never pay a fee to “claim” one.",
    "impersonation": "Verify the sender through the provider's official channels, not the contact details in the message.",
    "payment_confirmation": "Do not release goods based on a text or screenshot alone. Check the payment in your own M-PESA or bank app, or your statement.",
}


def _snippet(s: str) -> str:
    t = re.sub(r"\s+", " ", s).strip()
    return t if len(t) <= 90 else t[:87] + "…"


def extract_urls(text: str):
    out = []
    for m in URL_RE.finditer(text):
        if m.start() > 0 and text[m.start() - 1] == "@":
            continue  # domain of an email address
        u = re.sub(r"[.,;:!?)\]]+$", "", m.group(0))
        if u and u not in out:
            out.append(u)
        if len(out) >= 5:
            break
    return out


def analyze_message(text) -> dict:
    msg = text[:MAX_MESSAGE_LENGTH] if isinstance(text, str) else ""
    sentences = re.split(r"[.!?\n]+", msg)
    compact = re.sub(r"[\s-]", "", msg)
    urls = extract_urls(msg)
    found = []

    cred = next((s for s in sentences if SECRET.search(s) and ASK.search(s) and not WARNING_NEGATION.search(s)), None)
    if cred is not None:
        found.append(indicator("credentials", "Asks for a PIN, password or code", "high",
                               "Real providers and banks do not ask you to send or confirm secret codes by message or phone.", _snippet(cred)))
    urgency = URGENCY.search(msg)
    if urgency:
        found.append(indicator("urgency", "Pressure to act immediately", "medium", "Urgent threats are used to stop you from thinking or checking.", urgency.group(0)))
    mistaken = MISTAKEN.search(msg)
    if mistaken or (RETURN_REQ.search(msg) and MONEY.search(msg)):
        found.append(indicator("mistaken_transfer", "Asks you to send money back", "high",
                               "A common scam sends a fake “sent by mistake” message and asks you to return the money.", _snippet(mistaken.group(0)) if mistaken else None))
    if MONEY.search(msg) and PAY_VERB.search(msg) and (PHONE.search(compact) or TILL.search(msg)):
        found.append(indicator("money_request", "Asks you to send money to a number or till", "medium", "Be careful with requests to pay a number, till or paybill you did not expect."))
    if any(r.search(msg) for r in PROBLEM) and urls:
        found.append(indicator("account_problem", "Account or payment problem with a link", "medium", "Messages that claim a problem and send you to a link are a classic phishing pattern."))
    if urls:
        flagged = [r for r in (analyze_url(u) for u in urls) if r["indicators"]]
        if flagged:
            allind = [i for r in flagged for i in r["indicators"]]
            found.append(indicator("link_warnings", "Link with warning signs", max_severity(allind), "; ".join(i["label"] for i in allind[:3]) + ".", urls[0]))
    if INSTALL.search(msg):
        found.append(indicator("remote_access", "Asks you to install an app or share your screen", "high", "Remote-access and unknown apps let scammers see or control your phone and money apps."))
    if PRIZE.search(msg):
        found.append(indicator("prize", "Unexpected prize or reward", "medium", "Surprise winnings that ask for a fee or details are a common scam."))

    brand = next((name for name, pats in _BRAND_PATTERNS if any(p.search(msg) for p in pats)), None)
    if brand and found:
        found.append(indicator("impersonation", f"Mentions {brand}", "medium", "Scammers copy the names of well-known providers. A name in a message does not prove who sent it."))
    if CONFIRM_TEXT.search(msg) and MONEY.search(msg) and PAID_WORD.search(msg):
        found.append(indicator("payment_confirmation", "Looks like a payment confirmation", "low", "Texts and screenshots can be forged. Only your own account balance or statement proves a payment."))

    risk = classify(found)
    summary = (
        "Several warning signs appear together. Treat this message as risky until you verify it through an official channel." if risk == "HIGH"
        else "Some warning signs were found. This does not prove the message is a scam, but slow down and verify before acting." if risk == "CAUTION"
        else "Few warning signs were found, but one point is worth checking. A low result does not make a message safe." if found
        else "No common warning signs were found. That does not make a message safe, so verify anything unexpected."
    )
    recs = list(dict.fromkeys(REC[i["id"]] for i in found if i["id"] in REC))
    if risk != "LOW":
        recs += ["Do not reply to the message or call numbers it gives you.",
                 "If you already shared details or paid, open the matching incident guide and contact your provider through an official channel.",
                 "Block the sender and report the message to your provider."]
    else:
        recs.append("If a request is unexpected, confirm it using a contact you already trust before acting.")
    return {"risk": risk, "indicators": found, "summary": summary, "recommendations": recs, "disclaimer": DISCLAIMER, "urlsFound": urls}
