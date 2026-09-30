import { apiFetch } from "./client";
import type { BedCapacityRow, FootfallRow, StaffRow } from "../types/operational";

export function getBedCapacitySummary(districtId: number): Promise<BedCapacityRow[]> {
  return apiFetch<BedCapacityRow[]>(`/capacity/summary/?district=${districtId}`);
}

export function getFootfallSummary(districtId: number): Promise<FootfallRow[]> {
  return apiFetch<FootfallRow[]>(`/patient-activity/summary/?district=${districtId}`);
}

export function getStaffSummary(districtId: number): Promise<StaffRow[]> {
  return apiFetch<StaffRow[]>(`/workforce/summary/?district=${districtId}`);
}
