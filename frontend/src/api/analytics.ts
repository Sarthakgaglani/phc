import { apiFetch } from "./client";
import type { AiSummaryResponse } from "./transfers";

/** Optional AI layer (phase6.md): a plain-language district situation
 * summary over the caller's own RBAC-scoped alerts/recommendations. */
export function getDistrictSituationSummary(lang = "en"): Promise<AiSummaryResponse> {
  return apiFetch<AiSummaryResponse>(`/analytics/district-summary/?lang=${lang}`);
}

export interface AskResponse {
  available: boolean;
  answer: string | null;
}

export function askQuestion(question: string, lang = "en"): Promise<AskResponse> {
  return apiFetch<AskResponse>("/analytics/ask/", {
    method: "POST",
    body: JSON.stringify({ question, lang }),
  });
}

export interface TransferOutcomeRow {
  id: number;
  transfer_request: number;
  recipient_phc_name: string;
  medicine_name: string;
  quantity: number;
  shortage_before: number;
  risk_level_before: string;
  shortage_after_receipt: number;
  risk_level_after_receipt: string;
  followup_due_at: string;
  followup_evaluated_at: string | null;
  shortage_averted: boolean | null;
}

export function getOutcomes(params: { phc?: number; district?: number }): Promise<TransferOutcomeRow[]> {
  const query = new URLSearchParams();
  if (params.phc) query.set("phc", String(params.phc));
  if (params.district) query.set("district", String(params.district));
  return apiFetch<TransferOutcomeRow[]>(`/analytics/outcomes/?${query.toString()}`);
}
