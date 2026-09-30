import { useState } from "react";
import { createPhc, updatePhc, type Phc } from "../../api/phcs";
import type { DistrictRow } from "../../api/locations";

interface PhcManagementModalProps {
  phc?: Phc | null;
  districts: DistrictRow[];
  onClose: () => void;
  onSaved: (phc: Phc) => void;
}

export function PhcManagementModal({ phc, districts, onClose, onSaved }: PhcManagementModalProps) {
  const [name, setName] = useState(phc?.name ?? "");
  const [code, setCode] = useState(phc?.code ?? "");
  const [districtId, setDistrictId] = useState<number>(phc?.district ?? (districts[0]?.id || 0));
  const [address, setAddress] = useState(phc?.address ?? "");
  const [isActive, setIsActive] = useState(phc?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !districtId) {
      setError("Name, Code, and District are required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      let savedPhc: Phc;
      if (phc) {
        savedPhc = await updatePhc(phc.id, {
          name: name.trim(),
          code: code.trim(),
          district: districtId,
          address: address.trim(),
          is_active: isActive,
        });
      } else {
        savedPhc = await createPhc({
          name: name.trim(),
          code: code.trim(),
          district: districtId,
          address: address.trim(),
          is_active: isActive,
        });
      }
      onSaved(savedPhc);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save PHC.");
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
          maxWidth: "520px",
          backgroundColor: "#ffffff",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>
              local_hospital
            </span>
            <h3 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>
              {phc ? "Edit Primary Health Center" : "Register New Primary Health Center (PHC)"}
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
              PHC Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PHC Baheri"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-sm)",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div>
              <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4 }}>
                Unique Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. D1-PHC7"
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

            <div>
              <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4 }}>
                District *
              </label>
              <select
                value={districtId}
                onChange={(e) => setDistrictId(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4 }}>
              Facility Address / Location Description
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Main Highway Road, Baheri Tehsil"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-sm)",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: 4 }}>
            <input
              type="checkbox"
              id="is_active_cb"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label htmlFor="is_active_cb" style={{ fontSize: "var(--font-size-xs)", fontWeight: 500, cursor: "pointer" }}>
              Active Facility (Receives inventory & automated transfers)
            </label>
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
              {isSubmitting ? "Saving…" : phc ? "Update PHC" : "Register PHC"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
