export type TransferRequestStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "DISPATCHED" | "RECEIVED";

export interface TransferApprovalInfo {
  decision: "APPROVED" | "REJECTED";
  decided_by_username: string;
  reason: string;
  created_at: string;
}

export interface TransferDispatchInfo {
  dispatched_by_username: string;
  notes: string;
  created_at: string;
}

export interface TransferReceiptInfo {
  received_by_username: string;
  quantity_received: number;
  notes: string;
  created_at: string;
}

/** Mirrors transfers.serializers.TransferRequestSerializer. */
export interface TransferRequest {
  id: number;
  recommendation_id: number;
  donor_phc: number;
  donor_phc_name: string;
  recipient_phc: number;
  recipient_phc_name: string;
  medicine: number;
  medicine_name: string;
  unit: string;
  quantity: number;
  status: TransferRequestStatus;
  version: number;
  created_at: string;
  approval?: TransferApprovalInfo | null;
  dispatch?: TransferDispatchInfo;
  receipt?: TransferReceiptInfo;
}
