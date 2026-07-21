import { Branch, User } from "./user";

export type AssetStatus = "available" | "reserved" | "borrowed" | "maintenance" | "lost" | "damaged" | "archived";

export interface AssetCategory {
  id: number;
  name: string;
  description: string | null;
  is_archived: boolean;
  is_active: boolean;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_info: string | null;
  is_archived: boolean;
  is_active: boolean;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: number;
  permanent_id: string;
  name: string;
  serial_number: string | null;
  model_number: string | null;
  description: string | null;
  status: AssetStatus;
  category_id: number;
  branch_id: number;
  supplier_id: number | null;
  created_at: string;
  updated_at: string;

  // New EAM columns
  purchase_date: string | null;
  purchase_cost: number | null;
  invoice_number: string | null;
  warranty_expiry: string | null;
  purchase_notes: string | null;
  photos: string[];
  notes: string | null;
  condition: string;

  category: AssetCategory;
  branch: Branch;
  supplier: Supplier | null;
}

export type BorrowRequestStatus = "pending_approval" | "approved" | "rejected" | "issued" | "returned" | "overdue" | "cancelled";

export interface BorrowRequestItem {
  id: number;
  borrow_request_id: number;
  asset_id: number;
  asset: Asset;
}

export interface BorrowTransaction {
  id: number;
  borrow_request_id: number;
  issued_by_id: number | null;
  issued_at: string | null;
  condition_out: string | null;
  received_by_id: number | null;
  returned_at: string | null;
  condition_in: string | null;
  condition_alert: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;

  issued_by: User | null;
  received_by: User | null;
}

export interface BorrowRequest {
  id: number;
  user_id: number;
  status: BorrowRequestStatus;
  purpose: string | null;
  expected_return_date: string;
  approved_rejected_at: string | null;
  approved_rejected_by_id: number | null;
  branch_id: number | null;
  created_at: string;
  updated_at: string;

  user: User;
  approved_rejected_by: User | null;
  branch: Branch | null;
  items: BorrowRequestItem[];
  transactions: BorrowTransaction[];
}

export interface AuditLog {
  id: number;
  actor_name: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}
