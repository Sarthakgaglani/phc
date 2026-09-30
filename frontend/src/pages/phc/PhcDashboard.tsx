import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { createStockMovement, getCurrentStock } from "../../api/inventory";
import { getStockRisk } from "../../api/forecasting";
import { getAlerts } from "../../api/alerts";
import { getTransferRequests, dispatchTransferRequest, receiveTransferRequest } from "../../api/transferRequests";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useRealtime } from "../../hooks/useRealtime";
import type { CurrentStockRow, MovementType } from "../../types/inventory";
import type { StockRiskRow } from "../../types/forecasting";
import type { AlertRow } from "../../types/alerts";
import type { TransferRequest } from "../../types/transferRequests";

// ─── Stock table ──────────────────────────────────────────────────────────────

function riskColor(level: string) {
  if (level === "critical") return "var(--risk-critical-text)";
  if (level === "high") return "var(--risk-high-text)";
  if (level === "medium") return "var(--risk-medium-text)";
  return "var(--color-secondary)";
}

function StockSection({
  rows,
  riskByMedicine,
}: {
  rows: CurrentStockRow[];
  riskByMedicine: Map<number, StockRiskRow>;
}) {
  return (
    <div className="stitch-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 8 }}>
        <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: 18 }}>medication</span>
        <h2 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>Medicine Stock</h2>
        <span style={{ marginLeft: "auto", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
          {rows.length} medicines tracked
        </span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ background: "var(--color-surface-container)", fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <th style={{ padding: "10px 20px" }}>Medicine</th>
            <th style={{ padding: "10px 20px", textAlign: "right" }}>Stock</th>
            <th style={{ padding: "10px 20px", textAlign: "right" }}>Days Left</th>
            <th style={{ padding: "10px 20px", textAlign: "center" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const risk = riskByMedicine.get(row.medicine);
            return (
              <tr key={row.medicine} style={{ background: i % 2 === 0 ? "#fff" : "#faf9f7", borderBottom: "1px solid var(--color-border-subtle)" }}>
                <td style={{ padding: "12px 20px", fontWeight: 500, fontSize: "var(--font-size-sm)" }}>{row.medicine_name}</td>
                <td style={{ padding: "12px 20px", textAlign: "right" }} className="tabular-nums">
                  <strong>{row.current_stock.toLocaleString()}</strong>{" "}
                  <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)" }}>{row.unit}</span>
                </td>
                <td style={{ padding: "12px 20px", textAlign: "right" }} className="tabular-nums">
                  {risk?.days_of_cover != null ? (
                    <span style={{ fontWeight: 600, color: riskColor(risk.risk_level) }}>
                      {Number(risk.days_of_cover).toFixed(1)}d
                    </span>
                  ) : (
                    <span style={{ color: "var(--color-text-muted)" }}>—</span>
                  )}
                </td>
                <td style={{ padding: "12px 20px", textAlign: "center" }}>
                  {risk ? <StatusBadge level={risk.risk_level} /> : <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>—</span>}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>No medicines yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Record movement form ─────────────────────────────────────────────────────

function RecordMovementForm({
  rows,
  onSubmit,
}: {
  rows: CurrentStockRow[];
  onSubmit: (medicineId: number, type: MovementType, qty: number) => Promise<void>;
}) {
  const [medicineId, setMedicineId] = useState<number | "">("");
  const [movementType, setMovementType] = useState<MovementType>("RECEIPT");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!medicineId || !Number.isInteger(qty) || qty <= 0) {
      setError("Pick a medicine and enter a positive whole number.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit(medicineId as number, movementType, qty);
      setQuantity("");
      setMedicineId("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Could not save — rolled back. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stitch-card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: 18 }}>edit_note</span>
        <h2 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>Record Stock Movement</h2>
        {success && (
          <span style={{ marginLeft: "auto", fontSize: "var(--font-size-xs)", color: "var(--color-secondary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>Saved
          </span>
        )}
      </div>
      <form onSubmit={handle} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "2 1 180px" }}>
          <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Medicine</label>
          <select value={medicineId} onChange={(e) => setMedicineId(Number(e.target.value) || "")} style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-strong)", background: "#fff", fontSize: "var(--font-size-sm)" }}>
            <option value="">Select medicine…</option>
            {rows.map((r) => <option key={r.medicine} value={r.medicine}>{r.medicine_name} ({r.current_stock} {r.unit})</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Type</label>
          <select value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType)} style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-strong)", background: "#fff", fontSize: "var(--font-size-sm)" }}>
            <option value="RECEIPT">📥 Stock Received</option>
            <option value="CONSUMPTION">📤 Stock Used</option>
          </select>
        </div>
        <div style={{ flex: "0 0 110px" }}>
          <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Quantity</label>
          <input type="number" min={1} placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-strong)", background: "#fff", fontSize: "var(--font-size-sm)" }} />
        </div>
        <button type="submit" disabled={busy} style={{ height: 38, padding: "0 20px", borderRadius: "var(--radius-sm)", background: "var(--color-primary)", color: "var(--color-primary-contrast)", fontWeight: 600, fontSize: "var(--font-size-sm)", border: "none", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
      {error && <p style={{ color: "var(--risk-critical-text)", fontSize: "var(--font-size-xs)", margin: "8px 0 0" }}>{error}</p>}
    </div>
  );
}

// ─── Transfer row ─────────────────────────────────────────────────────────────

function TransferRow({ tr, phcId, onActed }: { tr: TransferRequest; phcId: number; onActed: (u: TransferRequest) => void }) {
  const direction = tr.recipient_phc === phcId ? "incoming" : "outgoing";
  const otherName = direction === "incoming" ? tr.donor_phc_name : tr.recipient_phc_name;
  const canDispatch = direction === "outgoing" && tr.status === "APPROVED";
  const canReceive = direction === "incoming" && tr.status === "DISPATCHED";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef(crypto.randomUUID());

  const statusLabel: Record<string, string> = {
    PENDING_REVIEW: direction === "incoming" ? "Awaiting district approval" : "Awaiting approval",
    APPROVED: direction === "incoming" ? "Waiting for donor to dispatch" : "Approved — pack and dispatch",
    DISPATCHED: "In transit — confirm receipt when arrived",
    RECEIVED: "Completed",
    REJECTED: "Rejected",
  };
  const statusColor: Record<string, string> = { PENDING_REVIEW: "var(--risk-medium-text)", APPROVED: "var(--color-secondary)", DISPATCHED: "var(--color-primary)", RECEIVED: "var(--color-text-secondary)", REJECTED: "var(--risk-critical-text)" };

  if (tr.status === "RECEIVED" || tr.status === "REJECTED") return null;

  async function act(action: "dispatch" | "receive") {
    setBusy(true);
    setError(null);
    onActed({ ...tr, status: action === "dispatch" ? "DISPATCHED" : "RECEIVED" });
    try {
      const fn = action === "dispatch" ? dispatchTransferRequest : receiveTransferRequest;
      const updated = await fn(tr.id, { version: tr.version, idempotencyKey: idempotencyKey.current });
      onActed(updated);
    } catch {
      onActed(tr);
      setError("Failed — refresh and retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1px solid var(--color-border-subtle)", flexWrap: "wrap" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 20, color: direction === "incoming" ? "var(--color-secondary)" : "var(--risk-medium-text)", flexShrink: 0 }}>
        {direction === "incoming" ? "south" : "north"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>
          {direction === "incoming" ? "Receiving from" : "Sending to"} <strong>{otherName}</strong>
        </div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: 2 }} className="tabular-nums">
          {tr.quantity.toLocaleString()} {tr.unit} of {tr.medicine_name}
        </div>
        {error && <div style={{ color: "var(--risk-critical-text)", fontSize: "var(--font-size-xs)", marginTop: 2 }}>{error}</div>}
      </div>
      <span style={{ fontSize: "var(--font-size-xs)", color: statusColor[tr.status], fontWeight: 600, whiteSpace: "nowrap" }}>
        {statusLabel[tr.status]}
      </span>
      {canDispatch && (
        <button type="button" disabled={busy} onClick={() => act("dispatch")} style={{ height: 32, padding: "0 14px", borderRadius: "var(--radius-sm)", background: "var(--color-primary)", color: "#fff", fontSize: "var(--font-size-xs)", fontWeight: 600, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
          {busy ? "…" : "Mark Dispatched"}
        </button>
      )}
      {canReceive && (
        <button type="button" disabled={busy} onClick={() => act("receive")} style={{ height: 32, padding: "0 14px", borderRadius: "var(--radius-sm)", background: "var(--color-secondary)", color: "#fff", fontSize: "var(--font-size-xs)", fontWeight: 600, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
          {busy ? "…" : "Mark Received"}
        </button>
      )}
    </div>
  );
}

// ─── Transfers section ────────────────────────────────────────────────────────

function TransfersSection({ phcId, transferRequests, onActed }: { phcId: number; transferRequests: TransferRequest[]; onActed: (u: TransferRequest) => void }) {
  const active = transferRequests.filter((t) => t.status !== "RECEIVED" && t.status !== "REJECTED");
  return (
    <div className="stitch-card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: active.length > 0 ? 0 : 8 }}>
        <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: 18 }}>local_shipping</span>
        <h2 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>Active Transfers</h2>
        {active.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: "var(--font-size-xs)", fontWeight: 600, padding: "2px 8px", borderRadius: "var(--radius-full)", background: "var(--color-surface-container)", color: "var(--color-text-secondary)" }}>
            {active.length} active
          </span>
        )}
      </div>
      {active.length === 0
        ? <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", margin: 0 }}>No active transfers right now.</p>
        : active.map((t) => <TransferRow key={t.id} tr={t} phcId={phcId} onActed={onActed} />)
      }
    </div>
  );
}

// ─── Alerts banner (only shown when critical/high) ────────────────────────────

function AlertsSection({ alerts }: { alerts: AlertRow[] }) {
  const visible = alerts.filter((a) => a.category === "CRITICAL_STOCK_OUT_RISK" || a.category === "HIGH_STOCK_OUT_RISK");
  if (visible.length === 0) return null;
  return (
    <div style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--risk-critical-border)", background: "var(--risk-critical-bg)", padding: "14px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="material-symbols-outlined" style={{ color: "var(--risk-critical-text)", fontSize: 20 }}>warning</span>
        <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--risk-critical-text)" }}>
          {visible.length} medicine{visible.length !== 1 ? "s" : ""} at critical risk — stock running out soon
        </strong>
      </div>
      {visible.map((a) => (
        <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--font-size-sm)", paddingLeft: 28 }}>
          <span>
            <strong>{a.medicine_name}</strong>
            {a.days_of_cover != null && <span style={{ color: "var(--risk-critical-text)", fontWeight: 600 }}> — {Number(a.days_of_cover).toFixed(1)} days left</span>}
          </span>
          <StatusBadge level={a.category === "CRITICAL_STOCK_OUT_RISK" ? "critical" : "high"} />
        </div>
      ))}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function PhcDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<CurrentStockRow[]>([]);
  const [risk, setRisk] = useState<StockRiskRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const phcId = user?.phc ?? undefined;

  const loadAll = useCallback(() => {
    if (!phcId) return;
    Promise.all([getCurrentStock(phcId), getStockRisk(phcId), getAlerts({ phc: phcId }), getTransferRequests({ phc: phcId })])
      .then(([stockRows, riskRows, alertRows, transferRows]) => {
        setRows(stockRows);
        setRisk(riskRows);
        setAlerts(alertRows);
        setTransferRequests(transferRows);
      })
      .catch(() => setLoadError("Could not load inventory."))
      .finally(() => setIsLoading(false));
  }, [phcId]);

  useEffect(loadAll, [loadAll]);
  useRealtime(loadAll, loadAll);

  const riskByMedicine = new Map(risk.map((r) => [r.medicine, r]));

  async function handleRecordMovement(medicineId: number, movementType: MovementType, quantity: number) {
    if (!user?.phc) return;
    const delta = movementType === "RECEIPT" ? quantity : -quantity;
    const prev = rows;
    // Optimistic update on stock count
    setRows((cur) => cur.map((r) => r.medicine === medicineId ? { ...r, current_stock: r.current_stock + delta } : r));
    try {
      await createStockMovement({ phc: user.phc, medicine: medicineId, movement_type: movementType, quantity });
      // Reload risk and alerts from server so Days Left and alert banner reflect the new stock
      const [riskRows, alertRows] = await Promise.all([
        getStockRisk(user.phc),
        getAlerts({ phc: user.phc }),
      ]);
      setRisk(riskRows);
      setAlerts(alertRows);
    } catch (err) {
      setRows(prev);
      throw err;
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (!user?.phc) {
    return <p style={{ padding: 24, color: "var(--color-text-secondary)" }}>Your account has no PHC assigned — contact an administrator.</p>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      {/* Header — role label and logout only, no switcher */}
      <header style={{ background: "#fff", borderBottom: "1px solid var(--color-border)", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 30, boxShadow: "var(--shadow-card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: "var(--font-size-lg)", color: "var(--color-primary)" }}>ProjectH</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-sm)", background: "var(--color-surface-high)", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>PHC Staff</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
            <strong>{user.username}</strong> · PHC #{user.phc}
          </span>
          <button type="button" onClick={handleLogout} style={{ height: 30, padding: "0 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-strong)", background: "#fff", fontSize: "var(--font-size-xs)", cursor: "pointer", color: "var(--color-text-secondary)" }}>
            Log Out
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "var(--font-size-xl)", fontWeight: 700, color: "var(--color-primary)" }}>PHC Inventory</h1>
          <p style={{ margin: "4px 0 0", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
            Track stock levels, record movements, and manage incoming/outgoing transfers.
          </p>
        </div>

        {isLoading && <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>Loading…</p>}
        {loadError && <p style={{ color: "var(--risk-critical-text)", margin: 0 }}>{loadError}</p>}

        {!isLoading && !loadError && (
          <>
            <AlertsSection alerts={alerts} />
            <StockSection rows={rows} riskByMedicine={riskByMedicine} />
            <RecordMovementForm rows={rows} onSubmit={handleRecordMovement} />
            <TransfersSection
              phcId={user.phc}
              transferRequests={transferRequests}
              onActed={(updated) => setTransferRequests((cur) => cur.map((t) => t.id === updated.id ? updated : t))}
            />
          </>
        )}
      </main>
    </div>
  );
}
