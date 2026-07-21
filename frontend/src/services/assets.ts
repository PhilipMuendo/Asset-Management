import { apiRequest } from "./api";
import { Asset, AssetCategory, Supplier } from "../types/assets";

export async function listCategories(): Promise<AssetCategory[]> {
  return apiRequest<AssetCategory[]>("/assets/categories");
}

export async function createCategory(data: { name: string; description?: string }): Promise<AssetCategory> {
  return apiRequest<AssetCategory>("/assets/categories", {
    method: "POST",
    json: data
  });
}

export async function updateCategory(id: number, data: { name?: string; description?: string; is_active?: boolean }): Promise<AssetCategory> {
  return apiRequest<AssetCategory>(`/assets/categories/${id}`, {
    method: "PATCH",
    json: data
  });
}

export async function deleteCategory(id: number): Promise<void> {
  return apiRequest<void>(`/assets/categories/${id}`, {
    method: "DELETE"
  });
}

export async function listSuppliers(): Promise<Supplier[]> {
  return apiRequest<Supplier[]>("/assets/suppliers");
}

export async function createSupplier(data: { name: string; contact_info?: string }): Promise<Supplier> {
  return apiRequest<Supplier>("/assets/suppliers", {
    method: "POST",
    json: data
  });
}

export async function updateSupplier(id: number, data: { name?: string; contact_info?: string; is_active?: boolean }): Promise<Supplier> {
  return apiRequest<Supplier>(`/assets/suppliers/${id}`, {
    method: "PATCH",
    json: data
  });
}

export async function deleteSupplier(id: number): Promise<void> {
  return apiRequest<void>(`/assets/suppliers/${id}`, {
    method: "DELETE"
  });
}

export async function listAssets(): Promise<Asset[]> {
  return apiRequest<Asset[]>("/assets");
}

export async function getAsset(id: number): Promise<Asset> {
  return apiRequest<Asset>(`/assets/${id}`);
}

export async function getAssetByPermanentId(permanentId: string): Promise<Asset> {
  return apiRequest<Asset>(`/assets/by-permanent-id/${permanentId}`);
}

export async function createAsset(data: {
  permanent_id: string;
  name: string;
  serial_number?: string;
  model_number?: string;
  description?: string;
  category_id: number;
  branch_id: number;
  supplier_id?: number;
}): Promise<Asset> {
  return apiRequest<Asset>("/assets", {
    method: "POST",
    json: data
  });
}

export async function updateAsset(
  id: number,
  data: Partial<{
    name: string;
    serial_number: string;
    model_number: string;
    description: string;
    status: string;
    category_id: number;
    branch_id: number;
    supplier_id: number;
  }>
): Promise<Asset> {
  return apiRequest<Asset>(`/assets/${id}`, {
    method: "PATCH",
    json: data
  });
}

export async function archiveAsset(id: number): Promise<Asset> {
  return apiRequest<Asset>(`/assets/${id}`, {
    method: "DELETE"
  });
}

export async function getAssetHistory(id: number): Promise<any[]> {
  return apiRequest<any[]>(`/assets/${id}/history`);
}

export async function reprintQrCode(id: number): Promise<any> {
  return apiRequest<any>(`/assets/${id}/reprint-qr`, {
    method: "POST"
  });
}
