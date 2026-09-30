import { useState, type FormEvent } from "react";
import type { CurrentStockRow, MovementType } from "../../types/inventory";

interface Props {
  rows: CurrentStockRow[];
  onSubmit: (medicineId: number, movementType: MovementType, quantity: number) => Promise<void>;
}

/**
 * The first write-heavy screen in the app (phase1.md) — submits
 * optimistically: the parent applies the stock delta to local state before
 * the request resolves, and rolls it back if the request fails (see
 * PhcDashboard.handleRecordMovement).
 */
export function StockMovementForm({ rows, onSubmit }: Props) {
  const [medicineId, setMedicineId] = useState<number | "">("");
  const [movementType, setMovementType] = useState<MovementType>("RECEIPT");
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (!medicineId || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Choose a medicine and enter a positive whole-number quantity.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(medicineId, movementType, parsedQuantity);
      setQuantity("");
    } catch {
      setError("Could not record this movement — it has been rolled back.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="stitch-card">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>
          edit_note
        </span>
        <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)", margin: 0 }}>
          Record Stock Ledger Movement
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end", flexWrap: "wrap" }}
      >
        <div style={{ flex: 2, minWidth: 200 }}>
          <label htmlFor="medicine" style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", marginBottom: 4, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
            Medicine / SKU
          </label>
          <select
            id="medicine"
            style={{
              width: "100%",
              height: 38,
              padding: "0 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-strong)",
              background: "#ffffff",
              fontSize: "var(--font-size-sm)",
            }}
            value={medicineId}
            onChange={(e) => setMedicineId(Number(e.target.value) || "")}
          >
            <option value="">Select medicine…</option>
            {rows.map((row) => (
              <option key={row.medicine} value={row.medicine}>
                {row.medicine_name} ({row.current_stock} {row.unit})
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 140 }}>
          <label htmlFor="movement-type" style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", marginBottom: 4, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
            Movement Type
          </label>
          <select
            id="movement-type"
            style={{
              width: "100%",
              height: 38,
              padding: "0 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-strong)",
              background: "#ffffff",
              fontSize: "var(--font-size-sm)",
            }}
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as MovementType)}
          >
            <option value="RECEIPT">Receipt (Stock In)</option>
            <option value="CONSUMPTION">Consumption (Stock Out)</option>
          </select>
        </div>

        <div style={{ width: 120 }}>
          <label htmlFor="quantity" style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", marginBottom: 4, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            min={1}
            style={{
              width: "100%",
              height: 38,
              padding: "0 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-strong)",
              background: "#ffffff",
              fontSize: "var(--font-size-sm)",
            }}
            placeholder="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            height: 38,
            padding: "0 18px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-contrast)",
            fontWeight: "var(--font-weight-semibold)",
            fontSize: "var(--font-size-sm)",
            border: "none",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
            save
          </span>
          <span>{isSubmitting ? "Recording…" : "Record Movement"}</span>
        </button>
      </form>

      {error && (
        <p style={{ color: "var(--risk-critical-text)", fontSize: "var(--font-size-xs)", marginTop: "var(--space-2)", marginBottom: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}
