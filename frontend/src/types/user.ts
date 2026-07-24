export type UserRole = "superadmin" | "admin" | "staff";
export type UserStatus = "active" | "suspended" | "archived";

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  department_id: number | null;
  branch_id: number | null;
  job_title: string | null;
  role: UserRole;
  status: UserStatus;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurrentUser extends User {
  category_ids: number[];
  session_branch_id: number | null;
}

export interface UserCreateResponse extends User {
  temporary_password?: string;
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

export interface Branch {
  id: number;
  name: string;
  code: string;
  country: string;
  address: string | null;
  is_archived: boolean;
  is_active: boolean;
  usage_count?: number;
  admin_count?: number;
  staff_count?: number;
  asset_count?: number;
  created_at: string;
  updated_at: string;
}
