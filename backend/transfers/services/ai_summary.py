"""
Natural-language summary of a TransferRecommendation (phase6.md) — Gemini
narrates the already-computed explainability payload (recipient shortfall,
chosen donors, why), it never invents or recalculates any of the numbers in
it. `lang` covers phase6.md's multilingual-explanations use case with the
same prompt, just asking for a different output language.
"""
from core.services import generate_text


def _describe_recommendation(recommendation) -> str:
    lines = [
        f"{recommendation.recipient_phc.name} is short {recommendation.recipient_shortage} "
        f"{recommendation.medicine.unit} of {recommendation.medicine.name}.",
        f"Predicted demand is {recommendation.recipient_predicted_demand} "
        f"{recommendation.medicine.unit} over the forecast horizon, "
        f"needing {recommendation.recipient_required_stock} total against "
        f"{recommendation.recipient_current_stock} currently in stock.",
    ]
    for allocation in recommendation.allocations.all():
        lines.append(
            f"Donor #{allocation.rank}: {allocation.donor_phc.name} would send "
            f"{allocation.quantity} {recommendation.medicine.unit}, "
            f"leaving it with {allocation.donor_days_of_cover_after or 'an unmeasured'} "
            f"days of cover"
            + (
                f", {allocation.distance_km} km away."
                if allocation.distance_km is not None
                else "."
            )
        )
    if recommendation.unresolved_shortage > 0:
        lines.append(
            f"{recommendation.unresolved_shortage} {recommendation.medicine.unit} "
            "cannot be safely covered by any donor right now."
        )
    return "\n".join(lines)


def summarize_recommendation(recommendation, lang: str = "en") -> str | None:
    facts = _describe_recommendation(recommendation)
    language_instruction = (
        "Respond in English." if lang == "en" else f"Respond in the language with code '{lang}'."
    )
    prompt = (
        "You are explaining a medicine redistribution recommendation to a district health "
        "officer in India. Using ONLY the facts below, write a short (2-3 sentence) plain-"
        "language explanation of the situation and why these donors were chosen. Do not add, "
        "guess, or change any numbers beyond what's given. "
        f"{language_instruction}\n\nFacts:\n{facts}"
    )
    return generate_text(prompt)
