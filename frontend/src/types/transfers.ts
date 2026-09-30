/** Mirrors transfers.serializers.RecommendationAllocationSerializer. */
export interface RecommendationAllocation {
  id: number;
  donor_phc: number;
  donor_phc_name: string;
  donor_district_name: string;
  quantity: number;
  donor_current_stock: number;
  donor_predicted_daily_consumption: number;
  donor_required_stock: number;
  donor_safe_surplus_before: number;
  donor_days_of_cover_before: number | null;
  donor_days_of_cover_after: number | null;
  distance_km: number | null;
  rank: number;
}

/** Mirrors transfers.serializers.TransferRecommendationSerializer. */
export interface TransferRecommendation {
  id: number;
  recipient_phc: number;
  recipient_phc_name: string;
  recipient_district_name: string;
  medicine: number;
  medicine_name: string;
  unit: string;
  recipient_current_stock: number;
  recipient_predicted_daily_consumption: number;
  recipient_predicted_demand: number;
  recipient_safety_stock: number;
  recipient_required_stock: number;
  recipient_shortage: number;
  unresolved_shortage: number;
  is_superseded: boolean;
  created_at: string;
  allocations: RecommendationAllocation[];
}
