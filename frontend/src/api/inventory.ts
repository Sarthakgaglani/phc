import { apiFetch } from "./client";
import type { CurrentStockRow, StockMovementPayload } from "../types/inventory";

export function getCurrentStock(phcId: number): Promise<CurrentStockRow[]> {
  return apiFetch<CurrentStockRow[]>(`/inventory/stock/?phc=${phcId}`);
}

export function createStockMovement(payload: StockMovementPayload) {
  return apiFetch("/inventory/movements/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
