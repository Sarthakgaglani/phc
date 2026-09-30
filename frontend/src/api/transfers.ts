import { apiFetch } from "./client";
import type { TransferRecommendation } from "../types/transfers";

export function getRecommendations(params: {
  phc?: number;
  district?: number;
  isSuperseded?: "true" | "false" | "all";
}): Promise<TransferRecommendation[]> {
  const query = new URLSearchParams();
  if (params.phc) query.set("phc", String(params.phc));
  if (params.district) query.set("district", String(params.district));
  if (params.isSuperseded) query.set("is_superseded", params.isSuperseded);
  return apiFetch<TransferRecommendation[]>(`/transfers/recommendations/?${query.toString()}`);
}

export interface AiSummaryResponse {
  available: boolean;
  summary: string | null;
}

/** Optional AI layer (phase6.md) — Gemini narrating this recommendation's
 * already-computed explainability payload. `available: false` whenever
 * Gemini isn't configured or fails; never an error. */
export function getRecommendationSummary(id: number, lang = "en"): Promise<AiSummaryResponse> {
  return apiFetch<AiSummaryResponse>(`/transfers/recommendations/${id}/summary/?lang=${lang}`);
}
