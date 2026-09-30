import { apiFetch } from "./client";
import type { AlertRow } from "../types/alerts";

export function getAlerts(params: { phc?: number; district?: number }): Promise<AlertRow[]> {
  const query = new URLSearchParams();
  if (params.phc) query.set("phc", String(params.phc));
  if (params.district) query.set("district", String(params.district));
  return apiFetch<AlertRow[]>(`/alerts/?${query.toString()}`);
}
