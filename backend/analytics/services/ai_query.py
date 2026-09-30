"""
District situation summaries and natural-language querying (phase6.md) —
both strictly "Gemini narrates already-computed rows," never "Gemini queries
the database or computes a number." The context handed to the model is
built from the requesting user's own RBAC-scoped querysets (the same
`.for_user()` every other endpoint uses), so a PHC user can never leak
another PHC's data through a question, and Gemini never sees more than what
that endpoint would already return via the ordinary API.
"""
from alerts.models import Alert
from core.services import generate_text
from transfers.models import TransferRecommendation

MAX_ALERTS_IN_CONTEXT = 30
MAX_RECOMMENDATIONS_IN_CONTEXT = 20


def _gather_context(user) -> str:
    alerts = (
        Alert.objects.for_user(user)
        .filter(is_active=True)
        .select_related("phc", "medicine")[:MAX_ALERTS_IN_CONTEXT]
    )
    recommendations = (
        TransferRecommendation.objects.for_user(user)
        .filter(is_superseded=False)
        .select_related("recipient_phc", "medicine")[:MAX_RECOMMENDATIONS_IN_CONTEXT]
    )

    lines = ["Active alerts:"]
    for alert in alerts:
        lines.append(
            f"- {alert.phc.name}: {alert.medicine.name} ({alert.category}), "
            f"days of cover {alert.days_of_cover}, shortage {alert.shortage}"
        )
    if not alerts:
        lines.append("- none")

    lines.append("\nOpen redistribution recommendations:")
    for rec in recommendations:
        lines.append(
            f"- {rec.recipient_phc.name} needs {rec.recipient_shortage} {rec.medicine.name} "
            f"({rec.allocations.count()} donor(s) matched, "
            f"{rec.unresolved_shortage} unresolved)"
        )
    if not recommendations:
        lines.append("- none")

    return "\n".join(lines)


def summarize_district_situation(user, lang: str = "en") -> str | None:
    context = _gather_context(user)
    language_instruction = (
        "Respond in English." if lang == "en" else f"Respond in the language with code '{lang}'."
    )
    prompt = (
        "You are briefing a district health officer in India on their current situation. "
        "Using ONLY the facts below, write a short (3-4 sentence) plain-language summary "
        "of what needs attention. Do not add, guess, or change any numbers. "
        f"{language_instruction}\n\nFacts:\n{context}"
    )
    return generate_text(prompt)


def answer_question(user, question: str, lang: str = "en") -> str | None:
    context = _gather_context(user)
    language_instruction = (
        "Respond in English." if lang == "en" else f"Respond in the language with code '{lang}'."
    )
    prompt = (
        "You are a helpful assistant for Indian primary health centre officers. Answer the "
        "question using ONLY the facts below. If the facts don't contain the answer, say so "
        "plainly rather than guessing or inventing a number. "
        f"{language_instruction}\n\nFacts:\n{context}\n\nQuestion: {question}"
    )
    return generate_text(prompt)
