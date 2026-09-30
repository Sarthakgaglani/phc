"""
The one seam the whole app calls through for Gemini (CLAUDE.md: Gemini is
optional/additive, never load-bearing, and the system must stay fully
functional if it's unreachable). Every caller passes it already-computed
structured data and gets back a plain-language string or `None` — never the
other way around. `None` means "no AI summary available right now" for any
reason (no API key configured, network error, quota, malformed response);
callers render a fallback rather than surfacing an error to the user.
"""
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def is_enabled() -> bool:
    return bool(settings.GEMINI_API_KEY)


def generate_text(prompt: str) -> str | None:
    if not is_enabled():
        return None

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(model=settings.GEMINI_MODEL, contents=prompt)
        return response.text
    except Exception:
        # Network error, quota, malformed SDK response, anything — Gemini is
        # additive, so any failure here degrades to "no summary", never a
        # 500 for the recommendation/alert/dashboard data itself.
        logger.warning("Gemini request failed; falling back to no AI summary.", exc_info=True)
        return None
