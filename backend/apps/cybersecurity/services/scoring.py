DISCLAIMER = (
    "This is a preliminary, rule-based check. It can miss real scams and can flag genuine messages, so it is not proof either way. "
    "Never share PINs, passwords or one-time codes."
)
WEIGHT = {"low": 1, "medium": 2, "high": 3}


def indicator(id, label, severity, explanation, matched=None):
    d = {"id": id, "label": label, "severity": severity, "explanation": explanation}
    if matched is not None:
        d["matched"] = matched
    return d


def classify(indicators) -> str:
    """HIGH needs several signals together; one indicator alone never reaches HIGH."""
    score = sum(WEIGHT[i["severity"]] for i in indicators)
    if score >= 5 and len(indicators) >= 2:
        return "HIGH"
    if score >= 2:
        return "CAUTION"
    return "LOW"


def max_severity(indicators) -> str:
    sev = {i["severity"] for i in indicators}
    return "high" if "high" in sev else "medium" if "medium" in sev else "low"
