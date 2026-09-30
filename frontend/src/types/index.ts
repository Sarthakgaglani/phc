export type Role = "PHC" | "DISTRICT" | "STATE" | "NATIONAL";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: Role;
  state: number | null;
  district: number | null;
  phc: number | null;
}

/** The fixed 4-level risk scale reused by every dashboard/alert/recommendation. */
export type RiskLevel = "critical" | "high" | "medium" | "safe";

/** Severity order, worst first — used to sort/prioritize anything risk-leveled. */
export const RISK_SEVERITY_ORDER: RiskLevel[] = ["critical", "high", "medium", "safe"];

/**
 * Generic shape for AlertBanner (components/common/AlertBanner.tsx). Alerts
 * map to this today; Phase 4 recommendation cards will map to it too, so the
 * banner itself never needs to know about Alert or Recommendation directly.
 */
export interface AlertBannerItem {
  id: number | string;
  level: RiskLevel;
  title: string;
  description?: string;
}
