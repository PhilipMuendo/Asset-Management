import { apiRequest } from "./api";
import type { Department, User, UserRole, UserStatus } from "../types/user";

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  department_id: number | null;
  job_title: string | null;
  role: UserRole;
  status: UserStatus;
}

export function listUsers() {
  return apiRequest<User[]>("/users");
}

export function createUser(payload: CreateUserPayload) {
  return apiRequest<User>("/users", {
    method: "POST",
    json: payload
  });
}

export function listDepartments() {
  return apiRequest<Department[]>("/departments");
}

