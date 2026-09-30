import { apiFetch } from "./client";
import type { StockRiskRow } from "../types/forecasting";

export function getStockRisk(phcId: number): Promise<StockRiskRow[]> {
  return apiFetch<StockRiskRow[]>(`/forecasting/stock-risk/?phc=${phcId}`);
}
