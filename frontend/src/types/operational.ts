import type { RiskLevel } from "./index";

export interface BedCapacityRow {
  phc: number;
  phc_name: string;
  total_beds: number;
  occupied_beds: number;
  pressure_level: RiskLevel;
}

export interface FootfallRow {
  phc: number;
  phc_name: string;
  visit_count: number;
}

export interface StaffRow {
  phc: number;
  phc_name: string;
  staff_total: number;
  staff_present: number;
}
