import { apiFetch } from "./client";
import type { TransferRequest, TransferRequestStatus } from "../types/transferRequests";

export function getTransferRequests(params: {
  phc?: number;
  district?: number;
  status?: TransferRequestStatus;
}): Promise<TransferRequest[]> {
  const query = new URLSearchParams();
  if (params.phc) query.set("phc", String(params.phc));
  if (params.district) query.set("district", String(params.district));
  if (params.status) query.set("status", params.status);
  return apiFetch<TransferRequest[]>(`/transfers/requests/?${query.toString()}`);
}

interface ActionPayload {
  version: number;
  idempotencyKey: string;
  reason?: string;
  notes?: string;
}

function runAction(id: number, action: string, payload: ActionPayload): Promise<TransferRequest> {
  return apiFetch<TransferRequest>(`/transfers/requests/${id}/${action}/`, {
    method: "POST",
    body: JSON.stringify({
      version: payload.version,
      idempotency_key: payload.idempotencyKey,
      ...(payload.reason !== undefined && { reason: payload.reason }),
      ...(payload.notes !== undefined && { notes: payload.notes }),
    }),
  });
}

export const approveTransferRequest = (id: number, payload: ActionPayload) =>
  runAction(id, "approve", payload);
export const rejectTransferRequest = (id: number, payload: ActionPayload) =>
  runAction(id, "reject", payload);
export const dispatchTransferRequest = (id: number, payload: ActionPayload) =>
  runAction(id, "dispatch", payload);
export const receiveTransferRequest = (id: number, payload: ActionPayload) =>
  runAction(id, "receive", payload);
