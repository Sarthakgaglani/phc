from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.services import is_enabled as ai_enabled
from transfers.models import TransferRecommendation
from transfers.serializers import TransferRecommendationSerializer
from transfers.services.ai_summary import summarize_recommendation


class TransferRecommendationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read access to recommendations, scoped by RBAC (a recommendation is
    visible to the recipient's and every donor's PHC/district/state, per
    RecommendationQuerySet.for_user). Defaults to open recommendations only
    (?is_superseded=all to include history), optionally narrowed to one
    recipient PHC or district — this is what the District dashboard's
    recommendation list and Phase 5's approval screen both read from.
    """

    serializer_class = TransferRecommendationSerializer

    def get_queryset(self):
        qs = (
            TransferRecommendation.objects.for_user(self.request.user)
            .select_related("recipient_phc", "medicine")
            .prefetch_related("allocations__donor_phc__district")
        )

        is_superseded_param = self.request.query_params.get("is_superseded", "false")
        if is_superseded_param.lower() != "all":
            qs = qs.filter(is_superseded=is_superseded_param.lower() == "true")

        phc_id = self.request.query_params.get("phc")
        if phc_id:
            qs = qs.filter(recipient_phc_id=phc_id)
        district_id = self.request.query_params.get("district")
        if district_id:
            qs = qs.filter(recipient_phc__district_id=district_id)

        return qs.order_by("-created_at")

    @action(detail=True, methods=["get"])
    def summary(self, request, pk=None):
        """
        Optional AI layer (phase6.md): a plain-language narration of this
        recommendation's already-computed explainability payload. Returns
        `{"available": false}` rather than an error when Gemini isn't
        configured or fails — the recommendation itself is fully usable
        without this endpoint ever being called.
        """
        recommendation = self.get_object()
        if not ai_enabled():
            return Response({"available": False, "summary": None})

        lang = request.query_params.get("lang", "en")
        summary_text = summarize_recommendation(recommendation, lang=lang)
        return Response({"available": summary_text is not None, "summary": summary_text})
