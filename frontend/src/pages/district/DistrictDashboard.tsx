import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getPhcs, type Phc } from "../../api/phcs";
import { getBedCapacitySummary, getFootfallSummary, getStaffSummary } from "../../api/operationalSignals";
import { getAlerts } from "../../api/alerts";
import { getRecommendations } from "../../api/transfers";
import { getTransferRequests } from "../../api/transferRequests";
import { approveTransferRequest, rejectTransferRequest } from "../../api/transferRequests";
import { ExplainabilityPanel } from "../../components/common/ExplainabilityPanel";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useRealtime } from "../../hooks/useRealtime";
import { groupAlertsByPhc } from "../../utils/alerts";
import type { BedCapacityRow, FootfallRow, StaffRow } from "../../types/operational";
import type { AlertRow } from "../../types/alerts";
import type { TransferRecommendation } from "../../types/transfers";
import type { TransferRequest } from "../../types/transferRequests";

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = "overview" | "approvals" | "phcs";

function TabBar({
  active,
  onChange,
  pendingCount,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  pendingCount: number;
}) {
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "approvals", label: "Approvals", badge: pendingCount },
    { id: "phcs", label: "All PHCs" },
  ];

  return (
    <div
      style={{
        display: "flex",
        borderBottom: "2px solid var(--color-border)",
        gap: 0,
        background: "#fff",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          style={{
            height: 44,
            padding: "0 20px",
            border: "none",
            borderBottom: active === tab.id ? "2px solid var(--color-primary)" : "2px solid transparent",
            marginBottom: -2,
            background: "transparent",
            cursor: "pointer",
            fontWeight: active === tab.id ? 700 : 400,
            fontSize: "var(--font-size-sm)",
            color: active === tab.id ? "var(--color-primary)" : "var(--color-text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "color 0.15s",
          }}
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <span
              style={{
                minWidth: 18,
                height: 18,
                padding: "0 5px",
                borderRadius: 9,
                background: "var(--risk-high-text)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  phcs,
  alerts,
  transferRequests,
  recommendations,
}: {
  phcs: Phc[];
  alerts: AlertRow[];
  transferRequests: TransferRequest[];
  recommendations: TransferRecommendation[];
}) {
  const alertsByPhc = groupAlertsByPhc(alerts);
  const criticalPhcs = alertsByPhc.filter((i) => i.level === "critical" || i.level === "high");
  const pending = transferRequests.filter((t) => t.status === "PENDING_REVIEW").length;
  const inTransit = transferRequests.filter((t) => t.status === "APPROVED" || t.status === "DISPATCHED").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { label: "PHCs Monitored", value: phcs.length, icon: "local_hospital", color: "var(--color-primary)" },
          { label: "Active Alerts", value: alerts.filter(a => a.category !== "BELOW_SAFETY_THRESHOLD").length, icon: "warning", color: alerts.length > 0 ? "var(--risk-critical-text)" : "var(--color-primary)" },
          { label: "Pending Approvals", value: pending, icon: "fact_check", color: pending > 0 ? "var(--risk-high-text)" : "var(--color-primary)" },
          { label: "In Transit", value: inTransit, icon: "local_shipping", color: "var(--color-primary)" },
        ].map((card) => (
          <div
            key={card.label}
            className="stitch-card"
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
                {card.label}
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: card.color }}>
                {card.icon}
              </span>
            </div>
            <span
              style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, color: card.color }}
              className="tabular-nums"
            >
              {card.value}
            </span>
          </div>
        ))}
      </div>

      {/* PHCs needing attention */}
      <div className="stitch-card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--risk-critical-text)" }}>
            warning
          </span>
          <h2 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>
            Needs Attention
          </h2>
        </div>

        {criticalPhcs.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-secondary)", fontSize: "var(--font-size-sm)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            All PHCs are within safe stock levels.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {criticalPhcs.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderTop: i > 0 ? "1px solid var(--color-border-subtle)" : "none",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{item.title}</div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {item.description}
                  </div>
                </div>
                <StatusBadge level={item.level} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer pipeline summary */}
      <div className="stitch-card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--color-primary)" }}>
            swap_horiz
          </span>
          <h2 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>
            Transfer Pipeline
          </h2>
        </div>

        <div style={{ display: "flex", gap: 0, borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--color-border)" }}>
          {[
            { label: "Pending Review", value: transferRequests.filter(t => t.status === "PENDING_REVIEW").length, bg: "var(--risk-high-bg)", color: "var(--risk-high-text)" },
            { label: "Approved", value: transferRequests.filter(t => t.status === "APPROVED").length, bg: "#f0fdf4", color: "var(--color-secondary)" },
            { label: "In Transit", value: transferRequests.filter(t => t.status === "DISPATCHED").length, bg: "#eff6ff", color: "var(--color-primary)" },
            { label: "Completed", value: transferRequests.filter(t => t.status === "RECEIVED").length, bg: "var(--color-surface-container)", color: "var(--color-text-secondary)" },
            { label: "Rejected", value: transferRequests.filter(t => t.status === "REJECTED").length, bg: "var(--risk-critical-bg)", color: "var(--risk-critical-text)" },
          ].map((stage, i) => (
            <div
              key={stage.label}
              style={{
                flex: 1,
                padding: "12px 8px",
                background: stage.bg,
                borderLeft: i > 0 ? "1px solid var(--color-border)" : "none",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: stage.color }} className="tabular-nums">
                {stage.value}
              </div>
              <div style={{ fontSize: 11, color: stage.color, marginTop: 2 }}>{stage.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations summary */}
      {recommendations.length > 0 && (
        <div className="stitch-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--color-primary)" }}>
              auto_awesome
            </span>
            <h2 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>
              System Recommendations
            </h2>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "var(--font-size-xs)",
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                background: "var(--color-surface-container)",
                color: "var(--color-text-secondary)",
                fontWeight: 600,
              }}
            >
              {recommendations.length} computed
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {recommendations.map((r, i) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderTop: i > 0 ? "1px solid var(--color-border-subtle)" : "none",
                  fontSize: "var(--font-size-sm)",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <strong>{r.recipient_phc_name}</strong> needs{" "}
                  <strong>{r.recipient_shortage.toLocaleString()} {r.unit}</strong> of {r.medicine_name}
                  {r.allocations.length > 0 && (
                    <span style={{ color: "var(--color-secondary)", fontSize: "var(--font-size-xs)", marginLeft: 6 }}>
                      ✓ {r.allocations.length} donor{r.allocations.length !== 1 ? "s" : ""} matched
                    </span>
                  )}
                </div>
                <StatusBadge level={r.allocations.length === 0 ? "critical" : r.unresolved_shortage > 0 ? "high" : "medium"} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Approval card ─────────────────────────────────────────────────────────────

function ApprovalCard({
  tr,
  recommendation,
  onDecided,
}: {
  tr: TransferRequest;
  recommendation?: TransferRecommendation;
  onDecided: (updated: TransferRequest) => void;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef(crypto.randomUUID());

  async function decide(action: "approve" | "reject") {
    setBusy(action);
    setError(null);
    onDecided({ ...tr, status: action === "approve" ? "APPROVED" : "REJECTED" });
    try {
      const fn = action === "approve" ? approveTransferRequest : rejectTransferRequest;
      const updated = await fn(tr.id, { version: tr.version, idempotencyKey: idempotencyKey.current });
      onDecided(updated);
    } catch {
      onDecided(tr);
      setError("Action failed — it may have already been acted on. Refresh and retry.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "16px 20px",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Route: donor → recipient */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div
          style={{
            flex: 1,
            minWidth: 140,
            padding: "8px 12px",
            background: "var(--color-surface-low)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
            From (Donor)
          </div>
          <div style={{ fontWeight: 700, fontSize: "var(--font-size-sm)", marginTop: 2 }}>
            {tr.donor_phc_name}
          </div>
        </div>

        <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: 22, flexShrink: 0 }}>
          east
        </span>

        <div
          style={{
            flex: 1,
            minWidth: 140,
            padding: "8px 12px",
            background: "var(--risk-critical-bg)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--risk-critical-border)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--risk-critical-text)", textTransform: "uppercase", fontWeight: 600 }}>
            To (Needs Stock)
          </div>
          <div style={{ fontWeight: 700, fontSize: "var(--font-size-sm)", marginTop: 2 }}>
            {tr.recipient_phc_name}
          </div>
        </div>

        <div
          style={{
            padding: "8px 16px",
            background: "var(--color-surface-container)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border)",
            textAlign: "center",
            flexShrink: 0,
          }}
          className="tabular-nums"
        >
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Transfer</div>
          <div style={{ fontWeight: 700, fontSize: "var(--font-size-base)", color: "var(--color-primary)", marginTop: 2 }}>
            {tr.quantity.toLocaleString()} {tr.unit}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{tr.medicine_name}</div>
        </div>
      </div>

      {/* Explainability */}
      {recommendation && <ExplainabilityPanel recommendation={recommendation} />}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => decide("reject")}
          style={{
            height: 36,
            padding: "0 16px",
            borderRadius: "var(--radius-sm)",
            background: "#fff",
            color: "var(--risk-critical-text)",
            border: "1px solid var(--risk-critical-border)",
            fontWeight: 600,
            fontSize: "var(--font-size-sm)",
            cursor: "pointer",
          }}
        >
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => decide("approve")}
          style={{
            height: 36,
            padding: "0 20px",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-secondary)",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: "var(--font-size-sm)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
          {busy === "approve" ? "Approving…" : "Approve Transfer"}
        </button>
      </div>

      {error && (
        <p style={{ color: "var(--risk-critical-text)", fontSize: "var(--font-size-xs)", margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Approvals tab ────────────────────────────────────────────────────────────

function ApprovalsTab({
  transferRequests,
  recommendations,
  onDecided,
}: {
  transferRequests: TransferRequest[];
  recommendations: TransferRecommendation[];
  onDecided: (updated: TransferRequest) => void;
}) {
  const recommendationsById = new Map(recommendations.map((r) => [r.id, r]));
  const pending = transferRequests.filter((t) => t.status === "PENDING_REVIEW");
  const recentlyActed = transferRequests.filter(
    (t) => t.status === "APPROVED" || t.status === "REJECTED",
  ).slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Pending */}
      <div>
        <h2 style={{ margin: "0 0 12px", fontSize: "var(--font-size-base)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: pending.length > 0 ? "var(--risk-high-text)" : "var(--color-text-secondary)" }}>
            pending_actions
          </span>
          Waiting for Your Approval
          {pending.length > 0 && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "1px 8px",
                borderRadius: 9,
                background: "var(--risk-high-text)",
                color: "#fff",
              }}
            >
              {pending.length}
            </span>
          )}
        </h2>

        {pending.length === 0 ? (
          <div
            className="stitch-card"
            style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", display: "flex", alignItems: "center", gap: 8 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--color-secondary)" }}>
              check_circle
            </span>
            No transfer requests currently awaiting approval.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pending.map((tr) => (
              <ApprovalCard
                key={tr.id}
                tr={tr}
                recommendation={recommendationsById.get(tr.recommendation_id)}
                onDecided={onDecided}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recently acted */}
      {recentlyActed.length > 0 && (
        <div className="stitch-card">
          <h3 style={{ margin: "0 0 12px", fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-secondary)" }}>
            Recently Decided
          </h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentlyActed.map((tr, i) => (
              <div
                key={tr.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderTop: i > 0 ? "1px solid var(--color-border-subtle)" : "none",
                  fontSize: "var(--font-size-sm)",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <strong>{tr.donor_phc_name}</strong>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: "middle", margin: "0 4px", color: "var(--color-text-muted)" }}>
                    east
                  </span>
                  <strong>{tr.recipient_phc_name}</strong>
                  <span style={{ color: "var(--color-text-secondary)", marginLeft: 8 }}>
                    {tr.quantity.toLocaleString()} {tr.unit} {tr.medicine_name}
                  </span>
                </div>
                <StatusBadge
                  level={tr.status === "APPROVED" ? "safe" : "critical"}
                  label={tr.status === "APPROVED" ? "Approved" : "Rejected"}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── All PHCs tab ─────────────────────────────────────────────────────────────

function AllPhcsTab({
  phcs,
  beds,
  footfall,
  staff,
  alerts,
}: {
  phcs: Phc[];
  beds: BedCapacityRow[];
  footfall: FootfallRow[];
  staff: StaffRow[];
  alerts: AlertRow[];
}) {
  const alertCountByPhc = new Map<number, number>();
  for (const a of alerts) {
    alertCountByPhc.set(a.phc, (alertCountByPhc.get(a.phc) ?? 0) + 1);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {phcs.length === 0 && (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
          No PHCs in this district yet.
        </p>
      )}
      {phcs.map((phc) => {
        const b = beds.find((r) => r.phc === phc.id);
        const f = footfall.find((r) => r.phc === phc.id);
        const s = staff.find((r) => r.phc === phc.id);
        const alertCount = alertCountByPhc.get(phc.id) ?? 0;
        const bedPct = b && b.total_beds > 0 ? Math.round((b.occupied_beds / b.total_beds) * 100) : 0;

        return (
          <div
            key={phc.id}
            className="stitch-card"
            style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "14px 20px" }}
          >
            {/* PHC name + alert badge */}
            <div style={{ flex: "1 1 160px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--color-primary)", flexShrink: 0 }}>
                  local_hospital
                </span>
                <span style={{ fontWeight: 700, fontSize: "var(--font-size-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {phc.name}
                </span>
              </div>
              {alertCount > 0 && (
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--risk-critical-text)", marginTop: 3, paddingLeft: 24, fontWeight: 600 }}>
                  {alertCount} active alert{alertCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Beds */}
            <div style={{ flex: "1 1 120px", minWidth: 100 }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4, fontWeight: 600 }}>BEDS</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: "var(--color-surface-container)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, bedPct)}%`,
                      background: bedPct > 85 ? "var(--risk-critical-text)" : bedPct > 70 ? "var(--risk-high-text)" : "var(--color-secondary)",
                      borderRadius: 3,
                    }}
                  />
                </div>
                <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }} className="tabular-nums">
                  {b ? `${b.occupied_beds}/${b.total_beds}` : "—"}
                </span>
              </div>
            </div>

            {/* Footfall */}
            <div style={{ flex: "0 0 80px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2, fontWeight: 600 }}>FOOTFALL</div>
              <div style={{ fontWeight: 700, fontSize: "var(--font-size-sm)" }} className="tabular-nums">
                {f?.visit_count ?? "—"}
              </div>
            </div>

            {/* Staff */}
            <div style={{ flex: "0 0 80px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2, fontWeight: 600 }}>STAFF</div>
              <div style={{ fontWeight: 700, fontSize: "var(--font-size-sm)" }} className="tabular-nums">
                {s ? `${s.staff_present}/${s.staff_total}` : "—"}
              </div>
            </div>

            {/* Status badge */}
            <div style={{ flexShrink: 0 }}>
              {b ? (
                <StatusBadge level={b.pressure_level} />
              ) : alertCount > 0 ? (
                <StatusBadge level="critical" />
              ) : (
                <StatusBadge level="safe" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function DistrictDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [phcs, setPhcs] = useState<Phc[]>([]);
  const [beds, setBeds] = useState<BedCapacityRow[]>([]);
  const [footfall, setFootfall] = useState<FootfallRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [recommendations, setRecommendations] = useState<TransferRecommendation[]>([]);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const districtId = user?.district ?? undefined;

  const loadAll = useCallback(() => {
    if (!districtId) return;
    Promise.all([
      getPhcs(),
      getBedCapacitySummary(districtId),
      getFootfallSummary(districtId),
      getStaffSummary(districtId),
      getAlerts({ district: districtId }),
      getRecommendations({ district: districtId }),
      getTransferRequests({ district: districtId }),
    ])
      .then(([phcRows, bedRows, footfallRows, staffRows, alertRows, recRows, trRows]) => {
        setPhcs(phcRows);
        setBeds(bedRows);
        setFootfall(footfallRows);
        setStaff(staffRows);
        setAlerts(alertRows);
        setRecommendations(recRows);
        setTransferRequests(trRows);
      })
      .catch(() => setLoadError("Could not load district overview."))
      .finally(() => setIsLoading(false));
  }, [districtId]);

  useEffect(loadAll, [loadAll]);
  useRealtime(loadAll, loadAll);

  // Auto-switch to Approvals tab when a new pending request arrives
  const prevPendingCount = useRef(0);
  useEffect(() => {
    const pending = transferRequests.filter((t) => t.status === "PENDING_REVIEW").length;
    if (pending > prevPendingCount.current && prevPendingCount.current >= 0) {
      // Only auto-switch if we're on overview and it's not the initial load
      if (activeTab === "overview" && prevPendingCount.current > 0) {
        setActiveTab("approvals");
      }
    }
    prevPendingCount.current = pending;
  }, [transferRequests, activeTab]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (!user?.district) {
    return (
      <p style={{ padding: 24, color: "var(--color-text-secondary)" }}>
        Your account has no district assigned — contact an administrator.
      </p>
    );
  }

  const pendingCount = transferRequests.filter((t) => t.status === "PENDING_REVIEW").length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      {/* ── Header ── */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid var(--color-border)",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 40,
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: "var(--font-size-lg)", color: "var(--color-primary)" }}>
            ProjectH
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-surface-high)",
              color: "var(--color-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            District Officer
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
            Signed in as <strong>{user.username}</strong> · District #{user.district}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              height: 30,
              padding: "0 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-strong)",
              background: "#fff",
              fontSize: "var(--font-size-xs)",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
            }}
          >
            Log Out
          </button>
        </div>
      </header>

      {/* ── Page title + tab bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--color-border)", padding: "16px 24px 0" }}>
        <h1 style={{ margin: "0 0 16px", fontSize: "var(--font-size-xl)", fontWeight: 700, color: "var(--color-primary)" }}>
          District Dashboard
        </h1>
        <TabBar active={activeTab} onChange={setActiveTab} pendingCount={pendingCount} />
      </div>

      {/* ── Main ── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {isLoading && <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}
        {loadError && <p style={{ color: "var(--risk-critical-text)" }}>{loadError}</p>}

        {!isLoading && !loadError && (
          <>
            {activeTab === "overview" && (
              <OverviewTab
                phcs={phcs}
                alerts={alerts}
                transferRequests={transferRequests}
                recommendations={recommendations}
              />
            )}
            {activeTab === "approvals" && (
              <ApprovalsTab
                transferRequests={transferRequests}
                recommendations={recommendations}
                onDecided={(updated) =>
                  setTransferRequests((cur) =>
                    cur.map((t) => (t.id === updated.id ? updated : t)),
                  )
                }
              />
            )}
            {activeTab === "phcs" && (
              <AllPhcsTab
                phcs={phcs}
                beds={beds}
                footfall={footfall}
                staff={staff}
                alerts={alerts}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
