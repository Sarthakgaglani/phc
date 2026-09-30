from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.services import answer_question, summarize_district_situation
from core.services import is_enabled as ai_enabled


class DistrictSituationSummaryView(APIView):
    """
    GET /api/analytics/district-summary/?lang= — optional AI layer
    (phase6.md). Returns `{"available": false}` rather than an error when
    Gemini isn't configured; the underlying alerts/recommendations the
    summary would describe remain fully available from their own endpoints
    regardless (CLAUDE.md: AI is additive, never load-bearing).
    """

    def get(self, request):
        if not ai_enabled():
            return Response({"available": False, "summary": None})
        lang = request.query_params.get("lang", "en")
        summary_text = summarize_district_situation(request.user, lang=lang)
        return Response({"available": summary_text is not None, "summary": summary_text})


class AskView(APIView):
    """POST /api/analytics/ask/ {"question": "...", "lang": "en"} — natural-
    language querying (phase6.md), answered only from the requester's own
    RBAC-scoped current alerts/recommendations, never from a fresh DB query
    or calculation Gemini runs itself."""

    def post(self, request):
        question = request.data.get("question", "").strip()
        if not question:
            raise ValidationError({"question": "This field is required."})
        if not ai_enabled():
            return Response({"available": False, "answer": None})

        lang = request.data.get("lang", "en")
        answer_text = answer_question(request.user, question, lang=lang)
        return Response({"available": answer_text is not None, "answer": answer_text})
