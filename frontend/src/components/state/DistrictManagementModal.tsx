import { useState } from "react";
import { createDistrict, type DistrictRow } from "../../api/locations";

interface DistrictManagementModalProps {
  onClose: () => void;
  onSaved: (district: DistrictRow) => void;
}

export function DistrictManagementModal({ onClose, onSaved }: DistrictManagementModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError("District Name and Code are required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const savedDistrict = await createDistrict({
        name: name.trim(),
        code: code.trim(),
      });
      onSaved(savedDistrict);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create district.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "var(--space-4)",
      }}
    >
      <div
        className="stitch-card"
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "#ffffff",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>
              domain
            </span>
            <h3 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>
              Create New Health District
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div style={{ padding: "var(--space-3)", backgroundColor: "var(--risk-critical-bg)", color: "var(--risk-critical-text)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-3)", fontSize: "var(--font-size-xs)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div>
            <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4 }}>
              District Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Budaun"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-sm)",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4 }}>
              District Code *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. D4"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-sm)",
                fontFamily: "monospace",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
            <button
              type="button"
              onClick={onClose}
              className="stitch-button-secondary"
              style={{ padding: "8px 16px", fontSize: "var(--font-size-xs)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="stitch-button-primary"
              style={{ padding: "8px 16px", fontSize: "var(--font-size-xs)" }}
            >
              {isSubmitting ? "Creating…" : "Create District"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
