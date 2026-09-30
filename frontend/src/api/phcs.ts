import { apiFetch } from "./client";

export interface Phc {
  id: number;
  name: string;
  code: string;
  address: string;
  is_active: boolean;
  district: number;
  district_name: string;
  state_name: string;
}

export function getPhcs(): Promise<Phc[]> {
  return apiFetch<Phc[]>("/phcs/");
}

export function createPhc(data: {
  name: string;
  code: string;
  district: number;
  address?: string;
  is_active?: boolean;
}): Promise<Phc> {
  return apiFetch<Phc>("/phcs/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updatePhc(id: number, data: Partial<Phc>): Promise<Phc> {
  return apiFetch<Phc>(`/phcs/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
