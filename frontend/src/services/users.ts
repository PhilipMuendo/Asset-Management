import { apiRequest } from "./api";
import type { Department, User, UserCreateResponse, UserRole, UserStatus } from "../types/user";

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  department_id: number | null;
  branch_id: number | null;
  job_title: string | null;
  role: UserRole;
  status: UserStatus;
  password?: string;
}

export function listUsers() {
  return apiRequest<User[]>("/users");
}
//
export function createUser(payload: CreateUserPayload) {
  return apiRequest<UserCreateResponse>("/users", {
    method: "POST",
    json: payload
  });
}

export function updateUser(id: number, payload: Partial<CreateUserPayload>) {
  return apiRequest<User>(`/users/${id}`, {
    method: "PATCH",
    json: payload
  });
}

export function listCategoryAssignments(userId: number) {
  return apiRequest<number[]>(`/users/${userId}/category-assignments`);
}

export function setCategoryAssignments(userId: number, categoryIds: number[]) {
  return apiRequest<number[]>(`/users/${userId}/category-assignments`, {
    method: "PUT",
    json: { category_ids: categoryIds }
  });
}

export function listDepartments() {
  return apiRequest<Department[]>("/departments");
}

export function createDepartment(payload: { name: string; description?: string }) {
  return apiRequest<Department>("/departments", {
    method: "POST",
    json: payload
  });
}

export function updateDepartment(id: number, payload: { name?: string; description?: string }) {
  return apiRequest<Department>(`/departments/${id}`, {
    method: "PATCH",
    json: payload
  });
}

export function deleteDepartment(id: number) {
  return apiRequest<void>(`/departments/${id}`, {
    method: "DELETE"
  });
}

