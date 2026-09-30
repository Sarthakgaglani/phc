import { RISK_SEVERITY_ORDER, type RiskLevel } from "../types";
import { alertRiskLevel } from "./alerts";
import type { AlertRow } from "../types/alerts";
import type { Phc } from "../api/phcs";
import type { DistrictRow } from "../api/locations";

export interface DistrictHealth {
  district: DistrictRow;
  level: RiskLevel;
  activeAlertCount: number;
  phcCount: number;
}

/** State Dashboard's per-district rollup (phase5.md) — computed client-side
 * from the same alerts/phcs data the District dashboard already fetches,
 * rather than adding a new backend aggregation endpoint for a one-screen
 * need. */
export function computeDistrictHealth(
  districts: DistrictRow[],
  phcs: Phc[],
  alerts: AlertRow[],
): DistrictHealth[] {
  const districtIdByPhcId = new Map(phcs.map((phc) => [phc.id, phc.district]));

  return districts.map((district) => {
    const districtAlerts = alerts.filter((alert) => districtIdByPhcId.get(alert.phc) === district.id);
    const levels = districtAlerts.map((alert) => alertRiskLevel(alert.category));
    const level = RISK_SEVERITY_ORDER.find((candidate) => levels.includes(candidate)) ?? "safe";
    return {
      district,
      level,
      activeAlertCount: districtAlerts.length,
      phcCount: phcs.filter((phc) => phc.district === district.id).length,
    };
  });
}
