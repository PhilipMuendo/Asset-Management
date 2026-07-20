import { apiRequest } from "./api";
import type { CurrentUser } from "../types/user";

export interface LoginPayload {
  email: string;
  password: string;
  branch_id?: number | null;
}

export interface AuthResponse {
  user: CurrentUser;
  must_change_password: boolean;
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    json: payload
  });
}

export function logout() {
  return apiRequest<void>("/auth/logout", { method: "POST" });
}

export function getCurrentUser() {
  return apiRequest<CurrentUser>("/auth/me");
}

export function changePassword(payload: any) {
  return apiRequest<CurrentUser>("/auth/change-password", {
    method: "POST",
    json: payload
  });
}


