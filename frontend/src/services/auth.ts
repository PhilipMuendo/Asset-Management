import { apiRequest } from "./api";
import type { User } from "../types/user";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
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
  return apiRequest<User>("/auth/me");
}

