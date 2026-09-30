import type { RiskLevel } from "./index";

/** Mirrors forecasting.serializers.StockRiskSerializer. */
export interface StockRiskRow {
  medicine: number;
  medicine_name: string;
  unit: string;
  current_stock: number;
  predicted_daily_consumption: number;
  days_of_cover: number | null;
  shortage: number;
  risk_level: RiskLevel;
}
