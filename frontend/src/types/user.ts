export type UserRole = "admin" | "staff";
export type UserStatus = "active" | "suspended" | "archived";

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  department_id: number | null;
  job_title: string | null;
  role: UserRole;
  status: UserStatus;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  is_archived: boolean;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}
