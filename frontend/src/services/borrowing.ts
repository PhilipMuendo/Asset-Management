import { apiRequest } from "./api";
import { BorrowRequest, AuditLog } from "../types/assets";

export async function submitBorrowRequest(data: {
  asset_ids: number[];
  purpose: string;
  expected_return_date: string;
}): Promise<BorrowRequest> {
  return apiRequest<BorrowRequest>("/borrowing/requests", {
    method: "POST",
    json: data
  });
}

export async function listBorrowRequests(): Promise<BorrowRequest[]> {
  return apiRequest<BorrowRequest[]>("/borrowing/requests");
}

export async function listMyBorrowRequests(): Promise<BorrowRequest[]> {
  return apiRequest<BorrowRequest[]>("/borrowing/my-requests");
}

export async function approveBorrowRequest(id: number): Promise<BorrowRequest> {
  return apiRequest<BorrowRequest>(`/borrowing/requests/${id}/approve`, {
    method: "POST"
  });
}

export async function rejectBorrowRequest(id: number): Promise<BorrowRequest> {
  return apiRequest<BorrowRequest>(`/borrowing/requests/${id}/reject`, {
    method: "POST"
  });
}

export async function cancelBorrowRequest(id: number): Promise<BorrowRequest> {
  return apiRequest<BorrowRequest>(`/borrowing/requests/${id}/cancel`, {
    method: "POST"
  });
}

export async function issueAssets(id: number): Promise<BorrowRequest> {
  return apiRequest<BorrowRequest>(`/borrowing/requests/${id}/issue`, {
    method: "POST"
  });
}

export async function returnAssets(
  id: number,
  data: { return_condition: string; notes?: string }
): Promise<BorrowRequest> {
  return apiRequest<BorrowRequest>(`/borrowing/requests/${id}/return`, {
    method: "POST",
    json: data
  });
}

export async function getDashboardSummary(): Promise<any> {
  return apiRequest<any>("/reports/dashboard");
}

export async function getAllAuditLogs(): Promise<AuditLog[]> {
  return apiRequest<AuditLog[]>("/reports/audit-logs");
}
