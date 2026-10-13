"""Rule-based security analysis. Pure Python: no Django imports, no network access, nothing stored here.

Phase 1 prototyped these rules in TypeScript; this is the authoritative implementation.
`shared/security_cases.json` is run against both engines so they cannot drift apart.
This is a preliminary aid, NOT fraud detection.
"""
from .messages import MAX_MESSAGE_LENGTH, analyze_message  # noqa: F401
from .urlcheck import MAX_URL_LENGTH, analyze_url, registrable_domain  # noqa: F401
from .scoring import DISCLAIMER, classify  # noqa: F401
