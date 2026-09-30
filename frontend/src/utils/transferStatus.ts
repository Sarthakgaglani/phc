import type { RiskLevel } from "../types";
import type { TransferRequestStatus } from "../types/transferRequests";

export const TRANSFER_STATUS_DISPLAY: Record<TransferRequestStatus, { level: RiskLevel; label: string }> = {
  PENDING_REVIEW: { level: "medium", label: "Pending review" },
  APPROVED: { level: "medium", label: "Approved" },
  REJECTED: { level: "critical", label: "Rejected" },
  DISPATCHED: { level: "high", label: "In transit" },
  RECEIVED: { level: "safe", label: "Received" },
};
