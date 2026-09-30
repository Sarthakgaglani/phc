export interface CurrentStockRow {
  medicine: number;
  medicine_name: string;
  unit: string;
  current_stock: number;
}

export type MovementType = "RECEIPT" | "CONSUMPTION";

export interface StockMovementPayload {
  phc: number;
  medicine: number;
  movement_type: MovementType;
  quantity: number;
  notes?: string;
}
