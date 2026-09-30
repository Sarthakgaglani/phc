import { apiFetch } from "./client";

export interface DistrictRow {
  id: number;
  name: string;
  code: string;
  state: number;
  state_name: string;
}

export interface StateRow {
  id: number;
  name: string;
  code: string;
}

/** RBAC already scopes this to "every district in my state" for a state
 * user — no query params needed, same pattern as getPhcs(). */
export function getDistricts(): Promise<DistrictRow[]> {
  return apiFetch<DistrictRow[]>("/districts/");
}

export function createDistrict(data: { name: string; code: string; state?: number }): Promise<DistrictRow> {
  return apiFetch<DistrictRow>("/districts/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getStates(): Promise<StateRow[]> {
  return apiFetch<StateRow[]>("/states/");
}

export function createState(data: { name: string; code: string }): Promise<StateRow> {
  return apiFetch<StateRow>("/states/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
