import { apiFetch } from "./client";

export interface UserAccount {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role: "PHC" | "DISTRICT" | "STATE" | "NATIONAL";
  state?: number | null;
  state_name?: string;
  district?: number | null;
  district_name?: string;
  phc?: number | null;
  phc_name?: string;
  is_active: boolean;
}

export function getUsers(): Promise<UserAccount[]> {
  return apiFetch<UserAccount[]>("/users/");
}

export function createUser(data: {
  username: string;
  password?: string;
  role: "PHC" | "DISTRICT" | "STATE" | "NATIONAL";
  state?: number | null;
  district?: number | null;
  phc?: number | null;
  email?: string;
}): Promise<UserAccount> {
  return apiFetch<UserAccount>("/users/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateUser(id: number, data: Partial<UserAccount>): Promise<UserAccount> {
  return apiFetch<UserAccount>(`/users/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
