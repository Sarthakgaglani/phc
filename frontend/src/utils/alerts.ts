import type { AlertBannerItem, RiskLevel } from "../types";
import { RISK_SEVERITY_ORDER } from "../types";
import type { AlertCategory, AlertRow } from "../types/alerts";

const CATEGORY_RISK_LEVEL: Record<AlertCategory, RiskLevel> = {
  CRITICAL_STOCK_OUT_RISK: "critical",
  HIGH_STOCK_OUT_RISK: "high",
  BELOW_SAFETY_THRESHOLD: "medium",
};

const CATEGORY_LABEL: Record<AlertCategory, string> = {
  CRITICAL_STOCK_OUT_RISK: "Critical stock-out risk",
  HIGH_STOCK_OUT_RISK: "High stock-out risk",
  BELOW_SAFETY_THRESHOLD: "Below safety stock threshold",
};

export function alertRiskLevel(category: AlertCategory): RiskLevel {
  return CATEGORY_RISK_LEVEL[category];
}

export function alertToBannerItem(alert: AlertRow, options?: { includePhc?: boolean }): AlertBannerItem {
  const daysOfCover =
    alert.days_of_cover === null ? "no recent consumption" : `${alert.days_of_cover}d cover`;
  const title = options?.includePhc
    ? `${alert.phc_name} · ${alert.medicine_name}`
    : alert.medicine_name;
  return {
    id: alert.id,
    level: alertRiskLevel(alert.category),
    title,
    description: `${CATEGORY_LABEL[alert.category]} — ${daysOfCover}, shortage ${alert.shortage}`,
  };
}

/**
 * One AlertBannerItem per PHC, worst-alert-first — the District dashboard's
 * "needs attention" section (phase3.md). PHCs with no active alerts are left
 * out entirely rather than shown as "safe" noise.
 */
export function groupAlertsByPhc(alerts: AlertRow[]): AlertBannerItem[] {
  const byPhc = new Map<number, AlertRow[]>();
  for (const alert of alerts) {
    const existing = byPhc.get(alert.phc);
    if (existing) existing.push(alert);
    else byPhc.set(alert.phc, [alert]);
  }

  return Array.from(byPhc.values())
    .map((phcAlerts) => {
      const levels = phcAlerts.map((alert) => alertRiskLevel(alert.category));
      const worstLevel = RISK_SEVERITY_ORDER.find((level) => levels.includes(level)) ?? "safe";
      return {
        id: phcAlerts[0].phc,
        level: worstLevel,
        title: phcAlerts[0].phc_name,
        description: `${phcAlerts.length} active alert${phcAlerts.length === 1 ? "" : "s"}`,
      };
    })
    .sort((a, b) => RISK_SEVERITY_ORDER.indexOf(a.level) - RISK_SEVERITY_ORDER.indexOf(b.level));
}
