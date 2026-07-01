import { apiRequest } from "./api";
import { Asset, AssetCategory, Location, Supplier } from "../types/assets";

export async function listCategories(): Promise<AssetCategory[]> {
  return apiRequest<AssetCategory[]>("/assets/categories");
}

export async function createCategory(data: { name: string; description?: string }): Promise<AssetCategory> {
  return apiRequest<AssetCategory>("/assets/categories", {
    method: "POST",
    json: data
  });
}

export async function listLocations(): Promise<Location[]> {
  return apiRequest<Location[]>("/assets/locations");
}

export async function createLocation(data: { name: string; description?: string }): Promise<Location> {
  return apiRequest<Location>("/assets/locations", {
    method: "POST",
    json: data
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
  location_id: number;
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
    location_id: number;
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
