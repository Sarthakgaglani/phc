import { useEffect, useState } from "react";

interface Props<T extends { available: boolean }> {
  /** Fetches `{available, summary}` (or `{available, answer}`) from one of
   * the Phase 6 AI endpoints — the component doesn't care which, it just
   * needs `available` + the text field named by `textKey`. */
  fetchSummary: () => Promise<T>;
  textKey: keyof T;
}

/**
 * The one place an AI-generated summary can render (phase6.md) — always
 * visually distinct from the deterministic data around it (a tinted panel,
 * an "AI summary" label, never StatusBadge/risk colors or a plain data row)
 * so it can never be mistaken for new authoritative numbers. Renders
 * nothing at all if Gemini isn't configured or the call fails — CLAUDE.md:
 * AI is additive, its absence must never look like an error.
 */
export function AiSummary<T extends { available: boolean }>({ fetchSummary, textKey }: Props<T>) {
  const [text, setText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSummary()
      .then((result) => {
        if (!cancelled && result.available) setText(result[textKey] as string);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchSummary, textKey]);

  if (isLoading || !text) return null;

  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid rgba(20, 32, 28, 0.2)",
        background: "linear-gradient(90deg, #ffffff 0%, #faf9f5 50%, #f0f5f2 100%)",
        padding: "var(--space-4)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-2)",
          paddingBottom: "var(--space-2)",
          borderBottom: "1px solid var(--color-border-subtle)",
          marginBottom: "var(--space-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 10px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-primary)",
              color: "var(--color-primary-contrast)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "var(--color-secondary-container)" }}>
              auto_awesome
            </span>
            <span>AI Assistive Brief</span>
          </span>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
            Deterministic Logistics Verified
          </span>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", lineHeight: 1.5 }}>
        {text}
      </p>
    </div>
  );
}
