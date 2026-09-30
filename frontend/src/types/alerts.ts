/** Mirrors alerts.models.AlertCategory. */
export type AlertCategory =
  | "CRITICAL_STOCK_OUT_RISK"
  | "HIGH_STOCK_OUT_RISK"
  | "BELOW_SAFETY_THRESHOLD";

/** Mirrors alerts.serializers.AlertSerializer. */
export interface AlertRow {
  id: number;
  phc: number;
  phc_name: string;
  medicine: number;
  medicine_name: string;
  category: AlertCategory;
  days_of_cover: number | null;
  shortage: number;
  is_active: boolean;
  created_at: string;
  resolved_at: string | null;
}
