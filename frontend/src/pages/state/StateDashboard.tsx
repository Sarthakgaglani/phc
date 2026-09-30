import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getDistricts, type DistrictRow } from "../../api/locations";
import { getPhcs, type Phc } from "../../api/phcs";
import { getAlerts } from "../../api/alerts";
import { getRecommendations } from "../../api/transfers";
import { getTransferRequests } from "../../api/transferRequests";
import { getDistrictSituationSummary, getOutcomes, type TransferOutcomeRow } from "../../api/analytics";
import { getUsers, type UserAccount } from "../../api/accounts";
import { AlertBanner } from "../../components/common/AlertBanner";
import { AiSummary } from "../../components/common/AiSummary";
import { ApprovalQueue } from "../../components/district/ApprovalQueue";
import { RecommendationList } from "../../components/district/RecommendationList";
import { DistrictHealthGrid } from "../../components/state/DistrictHealthGrid";
import { TransferTrends } from "../../components/state/TransferTrends";
import { OutcomesSummary } from "../../components/state/OutcomesSummary";
import { AdminControlPanel } from "../../components/state/AdminControlPanel";
import { groupAlertsByPhc } from "../../utils/alerts";
import { computeDistrictHealth } from "../../utils/districtHealth";
import { useRealtime } from "../../hooks/useRealtime";
import type { AlertRow } from "../../types/alerts";
import type { TransferRecommendation } from "../../types/transfers";
import type { TransferRequest } from "../../types/transferRequests";

export function StateDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"surveillance" | "admin">("surveillance");
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [phcs, setPhcs] = useState<Phc[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [recommendations, setRecommendations] = useState<TransferRecommendation[]>([]);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [outcomes, setOutcomes] = useState<TransferOutcomeRow[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    if (!user?.state) return;
    Promise.all([
      getDistricts(),
      getPhcs(),
      getAlerts({}),
      getRecommendations({}),
      getTransferRequests({}),
      getOutcomes({}),
      getUsers().catch(() => []),
    ])
      .then(([districtRows, phcRows, alertRows, recommendationRows, transferRows, outcomeRows, userRows]) => {
        setDistricts(districtRows);
        setPhcs(phcRows);
        setAlerts(alertRows);
        setRecommendations(recommendationRows);
        setTransferRequests(transferRows);
        setOutcomes(outcomeRows);
        setUsers(userRows);
      })
      .catch(() => setLoadError("Could not load state overview."))
      .finally(() => setIsLoading(false));
  }, [user?.state]);

  useEffect(loadAll, [loadAll]);
  useRealtime(loadAll, loadAll);

  if (!user?.state) {
    return <p>Your account has no state assigned — contact an administrator.</p>;
  }

  const recommendationsById = new Map(recommendations.map((r) => [r.id, r]));

  return (
    <div>
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
              <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: "20px" }}>
                public
              </span>
              <span style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "11px", fontWeight: 700, color: "var(--color-primary)" }}>
                State Health Operations
              </span>
            </div>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, margin: "0 0 var(--space-1) 0" }}>
              {user.state} Health Command & Administration
            </h1>
            <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: "var(--font-size-sm)" }}>
              Signed in as <strong style={{ color: "var(--color-text-main)" }}>{user.username}</strong>. Statewide cross-district monitoring, stock redistribution & administrative management.
            </p>
          </div>

          {/* Main State Dashboard Navigation Tabs */}
          <div style={{ display: "flex", gap: "var(--space-2)", backgroundColor: "var(--color-surface-low)", padding: 4, borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-subtle)" }}>
            <button
              type="button"
              onClick={() => setActiveTab("surveillance")}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-xs)",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                backgroundColor: activeTab === "surveillance" ? "#ffffff" : "transparent",
                color: activeTab === "surveillance" ? "var(--color-primary)" : "var(--color-text-secondary)",
                boxShadow: activeTab === "surveillance" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>monitoring</span>
              Surveillance & Command
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-xs)",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                backgroundColor: activeTab === "admin" ? "#ffffff" : "transparent",
                color: activeTab === "admin" ? "var(--color-primary)" : "var(--color-text-secondary)",
                boxShadow: activeTab === "admin" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>admin_panel_settings</span>
              Admin Control Panel
            </button>
          </div>
        </div>
      </div>

      {isLoading && <p>Loading state overview…</p>}
      {loadError && <p style={{ color: "var(--risk-critical-text)" }}>{loadError}</p>}

      {!isLoading && !loadError && (
        <>
          {activeTab === "surveillance" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <AiSummary fetchSummary={getDistrictSituationSummary} textKey="summary" />
              <AlertBanner
                title="Needs attention"
                items={groupAlertsByPhc(alerts)}
                emptyMessage="No PHCs in this state have active alerts."
              />
              <DistrictHealthGrid districts={computeDistrictHealth(districts, phcs, alerts)} />
              <TransferTrends transferRequests={transferRequests} />
              <OutcomesSummary outcomes={outcomes} />
              <ApprovalQueue
                transferRequests={transferRequests}
                recommendationsById={recommendationsById}
                onDecided={(updated) =>
                  setTransferRequests((current) =>
                    current.map((tr) => (tr.id === updated.id ? updated : tr)),
                  )
                }
              />
              <RecommendationList recommendations={recommendations} />
            </div>
          ) : (
            <AdminControlPanel
              phcs={phcs}
              districts={districts}
              users={users}
              onPhcsUpdated={loadAll}
              onDistrictsUpdated={loadAll}
              onUsersUpdated={loadAll}
            />
          )}
        </>
      )}
    </div>
  );
}
