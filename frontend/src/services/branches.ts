import { apiRequest } from "./api";
import type { Branch } from "../types/user";

export function listBranches() {
  return apiRequest<Branch[]>("/branches");
}

export function createBranch(payload: { name: string; code: string; country: string; address?: string }) {
  return apiRequest<Branch>("/branches", {
    method: "POST",
    json: payload
  });
}

export function updateBranch(id: number, payload: Partial<{ name: string; code: string; country: string; address: string; is_active: boolean }>) {
  return apiRequest<Branch>(`/branches/${id}`, {
    method: "PATCH",
    json: payload
  });
}

export function deleteBranch(id: number) {
  return apiRequest<void>(`/branches/${id}`, {
    method: "DELETE"
  });
}
