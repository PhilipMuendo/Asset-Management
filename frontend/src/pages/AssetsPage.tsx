import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer, Search, Eye, History as HistoryIcon, QrCode, Download, FileText, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { useAuth } from "../hooks/useAuth";
import {
  listAssets,
  createAsset,
  listCategories,
  listLocations,
  listSuppliers,
  getAssetHistory,
  updateAsset,
  archiveAsset,
  reprintQrCode
} from "../services/assets";
import { Asset } from "../types/assets";

const assetSchema = z.object({
  permanent_id: z.string().min(3, "Permanent ID must be at least 3 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  serial_number: z.string().optional(),
  model_number: z.string().optional(),
  description: z.string().optional(),
  category_id: z.coerce.number().min(1, "Please select a category"),
  location_id: z.coerce.number().min(1, "Please select a location"),
  supplier_id: z.coerce.number().optional(),

  // Purchase & EAM Info
  purchase_date: z.string().optional(),
  purchase_cost: z.coerce.number().optional(),
  invoice_number: z.string().optional(),
  warranty_expiry: z.string().optional(),
  purchase_notes: z.string().optional(),
  photos_raw: z.string().optional(), // Comma-separated URLs
  notes: z.string().optional(),
  condition: z.enum(["Excellent", "Good", "Fair", "Damaged", "Needs Repair"]).default("Good")
});

type AssetForm = z.infer<typeof assetSchema>;

export function AssetsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const assetsQuery = useQuery({ queryKey: ["assets"], queryFn: listAssets });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const locationsQuery = useQuery({ queryKey: ["locations"], queryFn: listLocations });
  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers });

  const historyQuery = useQuery({
    queryKey: ["asset-history", historyAsset?.id],
    queryFn: () => getAssetHistory(historyAsset!.id),
    enabled: !!historyAsset,
  });

  const form = useForm<AssetForm>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      permanent_id: "",
      name: "",
      serial_number: "",
      model_number: "",
      description: "",
      category_id: 0,
      location_id: 0,
      condition: "Good"
    }
  });

  const createMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      resetAssetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      resetAssetForm();
    }
  });

  const archiveMutation = useMutation({
    mutationFn: archiveAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setSelectedAsset(null);
    }
  });

  const reprintMutation = useMutation({
    mutationFn: reprintQrCode
  });

  function resetAssetForm() {
    form.reset({
      permanent_id: "",
      name: "",
      serial_number: "",
      model_number: "",
      description: "",
      category_id: 0,
      location_id: 0,
      purchase_date: "",
      purchase_cost: 0,
      invoice_number: "",
      warranty_expiry: "",
      purchase_notes: "",
      photos_raw: "",
      notes: "",
      condition: "Good"
    });
    setFormOpen(false);
    setEditingAsset(null);
  }

  function handleEditClick(asset: Asset) {
    setEditingAsset(asset);
    form.reset({
      permanent_id: asset.permanent_id,
      name: asset.name,
      serial_number: asset.serial_number || "",
      model_number: asset.model_number || "",
      description: asset.description || "",
      category_id: asset.category_id,
      location_id: asset.location_id,
      supplier_id: asset.supplier_id || undefined,
      purchase_date: asset.purchase_date ? new Date(asset.purchase_date).toISOString().split("T")[0] : "",
      purchase_cost: asset.purchase_cost || 0,
      invoice_number: asset.invoice_number || "",
      warranty_expiry: asset.warranty_expiry ? new Date(asset.warranty_expiry).toISOString().split("T")[0] : "",
      purchase_notes: asset.purchase_notes || "",
      photos_raw: asset.photos?.join(", ") || "",
      notes: asset.notes || "",
      condition: (asset.condition as any) || "Good"
    });
    setFormOpen(true);
  }

  async function onSubmit(values: AssetForm) {
    const photosList = values.photos_raw
      ? values.photos_raw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const payloadData = {
      name: values.name,
      serial_number: values.serial_number || undefined,
      model_number: values.model_number || undefined,
      description: values.description || undefined,
      category_id: values.category_id,
      location_id: values.location_id,
      supplier_id: values.supplier_id || undefined,
      purchase_date: values.purchase_date ? new Date(values.purchase_date).toISOString() : undefined,
      purchase_cost: values.purchase_cost || undefined,
      invoice_number: values.invoice_number || undefined,
      warranty_expiry: values.warranty_expiry ? new Date(values.warranty_expiry).toISOString() : undefined,
      purchase_notes: values.purchase_notes || undefined,
      photos: photosList,
      notes: values.notes || undefined,
      condition: values.condition,
    };

    if (editingAsset) {
      await updateMutation.mutateAsync({ id: editingAsset.id, data: payloadData });
    } else {
      await createMutation.mutateAsync({
        ...payloadData,
        permanent_id: values.permanent_id.toUpperCase(),
      });
    }
  }

  async function triggerReprintAudit(assetId: number) {
    try {
      await reprintMutation.mutateAsync(assetId);
    } catch (err) {}
  }

  async function downloadQrPng(permanentId: string, assetId: number) {
    await triggerReprintAudit(assetId);
    const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${permanentId}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR_${permanentId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async function downloadQrPdfLabel(permanentId: string, name: string, assetId: number) {
    await triggerReprintAudit(assetId);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - ${permanentId}</title>
          <style>
            @page { size: 3in 2in; margin: 0.1in; }
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; font-family: system-ui, sans-serif; margin: 0; }
            img { width: 1.2in; height: 1.2in; }
            h2 { margin: 2px 0; font-size: 14px; text-transform: uppercase; font-weight: bold; }
            p { margin: 0; font-size: 10px; color: #555; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${permanentId}" />
          <h2>${permanentId}</h2>
          <p>${name}</p>
          <p>Collective Energy Africa</p>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Filtered assets
  const filteredAssets = assetsQuery.data?.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.permanent_id.toLowerCase().includes(search.toLowerCase()) ||
      (asset.serial_number && asset.serial_number.toLowerCase().includes(search.toLowerCase())) ||
      (asset.category?.name && asset.category.name.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = !selectedCategory || asset.category_id === Number(selectedCategory);
    const matchesStatus = !selectedStatus || asset.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Assets Directory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse, search, and register renewable and solar energy assets.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditingAsset(null); setFormOpen((open) => !open); }}>
            <Plus size={18} />
            Register Asset
          </Button>
        )}
      </div>

      {formOpen && isAdmin && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-sm font-bold text-slate-950 mb-4">
            {editingAsset ? `Edit Asset ${editingAsset.permanent_id}` : "Register New Physical Asset"}
          </h3>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Permanent Asset ID</label>
              <Input
                placeholder="e.g. CEA-000001"
                className="mt-1.5"
                disabled={!!editingAsset}
                {...form.register("permanent_id")}
              />
              {form.formState.errors.permanent_id && (
                <p className="mt-1.5 text-xs text-red-600">{form.formState.errors.permanent_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Asset Name</label>
              <Input placeholder="e.g. Fluke Multimeter" className="mt-1.5" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="mt-1.5 text-xs text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Serial Number</label>
              <Input placeholder="Optional" className="mt-1.5" {...form.register("serial_number")} />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Model Number</label>
              <Input placeholder="Optional" className="mt-1.5" {...form.register("model_number")} />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Category</label>
              <Select className="mt-1.5" {...form.register("category_id")}>
                <option value="">Select Category</option>
                {categoriesQuery.data?.filter(c => c.is_active).map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Location</label>
              <Select className="mt-1.5" {...form.register("location_id")}>
                <option value="">Select Location</option>
                {locationsQuery.data?.filter(l => l.is_active).map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Supplier</label>
              <Select className="mt-1.5" {...form.register("supplier_id")}>
                <option value="">Select Supplier (Optional)</option>
                {suppliersQuery.data?.filter(s => s.is_active).map((sup) => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Asset Condition</label>
              <Select className="mt-1.5" {...form.register("condition")}>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Damaged">Damaged</option>
                <option value="Needs Repair">Needs Repair</option>
              </Select>
            </div>

            {/* Purchase Information */}
            <div className="md:col-span-2 border-t border-slate-100 pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Purchase Information</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Purchase Date</label>
                  <Input type="date" className="mt-1.5" {...form.register("purchase_date")} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Purchase Cost ($)</label>
                  <Input type="number" step="0.01" className="mt-1.5" {...form.register("purchase_cost")} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice Number</label>
                  <Input className="mt-1.5" {...form.register("invoice_number")} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Warranty Expiry</label>
                  <Input type="date" className="mt-1.5" {...form.register("warranty_expiry")} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Purchase Notes</label>
                  <Input className="mt-1.5" {...form.register("purchase_notes")} />
                </div>
              </div>
            </div>

            {/* Asset Photos & Notes */}
            <div className="md:col-span-2 border-t border-slate-100 pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Photos & Notes</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Photo URLs (comma separated)</label>
                  <Input placeholder="e.g. https://image1.jpg, https://image2.jpg" className="mt-1.5" {...form.register("photos_raw")} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Description</label>
                  <Input className="mt-1.5" {...form.register("description")} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">General Notes</label>
                  <Input className="mt-1.5" {...form.register("notes")} />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingAsset ? "Save Changes" : "Register"}
              </Button>
              <Button type="button" variant="ghost" onClick={resetAssetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Search and Filters */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by ID, Name, Serial, Category, Supplier, Location..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categoriesQuery.data?.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </Select>
        <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="borrowed">Borrowed</option>
          <option value="maintenance">Maintenance</option>
          <option value="lost">Lost</option>
          <option value="damaged">Damaged</option>
        </Select>
      </section>

      {/* Assets Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAssets?.map((asset) => (
          <div key={asset.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{asset.permanent_id}</span>
                <Badge value={asset.status} />
              </div>
              <h3 className="mt-2 text-base font-semibold text-slate-900">{asset.name}</h3>
              <p className="mt-1 text-xs text-slate-500">{asset.category?.name} • {asset.location?.name}</p>
              {asset.serial_number && (
                <p className="mt-1 text-[11px] text-slate-400">S/N: {asset.serial_number}</p>
              )}
            </div>

            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
              <Button variant="ghost" onClick={() => setSelectedAsset(asset)}>
                <Eye size={14} />
                Details
              </Button>
              <Button variant="ghost" onClick={() => setQrAsset(asset)}>
                <QrCode size={14} />
                QR Code
              </Button>
              <Button variant="ghost" onClick={() => setHistoryAsset(asset)}>
                <HistoryIcon size={14} />
                History
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* QR Code Dialog */}
      {qrAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-950">Asset QR Code Label</h3>
            <div className="my-6 flex flex-col items-center justify-center border border-slate-100 p-4 rounded bg-slate-50">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrAsset.permanent_id}`}
                alt={qrAsset.permanent_id}
                className="w-36 h-36 border"
              />
              <span className="mt-3 text-sm font-semibold tracking-wide text-slate-900">{qrAsset.permanent_id}</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => downloadQrPdfLabel(qrAsset.permanent_id, qrAsset.name, qrAsset.id)}>
                  <Printer size={16} />
                  Print Label
                </Button>
                <Button className="flex-1" variant="secondary" onClick={() => downloadQrPng(qrAsset.permanent_id, qrAsset.id)}>
                  <Download size={16} />
                  Download PNG
                </Button>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" variant="secondary" onClick={() => downloadQrPdfLabel(qrAsset.permanent_id, qrAsset.name, qrAsset.id)}>
                  <FileText size={16} />
                  Download PDF
                </Button>
                <Button variant="ghost" className="flex-1" onClick={() => setQrAsset(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset History / Timeline Dialog */}
      {historyAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl border border-slate-200 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-950">Lifecycle Timeline - {historyAsset.permanent_id}</h3>
            
            <div className="mt-4 space-y-4">
              {historyQuery.isLoading && <p>Loading history...</p>}
              {historyQuery.data?.map((item) => (
                <div key={item.id} className="border-l-2 border-brand pl-4 py-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                    <span className="capitalize font-semibold text-brand-dark">{item.action}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-900">{item.notes}</p>
                  {(item.previous_status || item.new_status) && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Status: {item.previous_status || "—"} → {item.new_status || "—"}
                    </p>
                  )}
                </div>
              ))}
              {historyQuery.data?.length === 0 && <p className="text-sm text-slate-450">No history found.</p>}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button variant="ghost" onClick={() => setHistoryAsset(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Details Dialog */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{selectedAsset.name}</h3>
                <span className="text-xs font-semibold text-slate-400">{selectedAsset.permanent_id}</span>
              </div>
              <Badge value={selectedAsset.status} />
            </div>

            {/* Photos gallery */}
            {selectedAsset.photos && selectedAsset.photos.length > 0 && (
              <div className="mt-4 flex gap-2 overflow-x-auto py-2">
                {selectedAsset.photos.map((url, i) => (
                  <img key={i} src={url} alt={`Asset photo ${i+1}`} className="w-24 h-24 object-cover rounded border" />
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm border-t border-slate-100 pt-3">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Condition</span>
                <Badge value={selectedAsset.condition.toLowerCase()} className="mt-1" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Location</span>
                <p className="font-semibold text-slate-900 mt-1">{selectedAsset.location?.name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Category</span>
                <p className="text-slate-700 mt-0.5">{selectedAsset.category?.name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Supplier</span>
                <p className="text-slate-700 mt-0.5">{selectedAsset.supplier?.name || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Serial Number</span>
                <p className="text-slate-700 mt-0.5">{selectedAsset.serial_number || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Model Number</span>
                <p className="text-slate-700 mt-0.5">{selectedAsset.model_number || "—"}</p>
              </div>
            </div>

            {/* Purchase Details */}
            <div className="mt-4 border-t border-slate-100 pt-3 space-y-2 text-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Purchase Information</h4>
              <div className="grid gap-2 grid-cols-2">
                <p>Purchase Date: <span className="font-medium">{selectedAsset.purchase_date ? new Date(selectedAsset.purchase_date).toLocaleDateString() : "—"}</span></p>
                <p>Cost: <span className="font-medium">${selectedAsset.purchase_cost || "—"}</span></p>
                <p>Invoice: <span className="font-medium">{selectedAsset.invoice_number || "—"}</span></p>
                <p>Warranty Expiry: <span className="font-medium">{selectedAsset.warranty_expiry ? new Date(selectedAsset.warranty_expiry).toLocaleDateString() : "—"}</span></p>
              </div>
              {selectedAsset.purchase_notes && (
                <p className="text-xs text-slate-500">Purchase Notes: {selectedAsset.purchase_notes}</p>
              )}
            </div>

            <div className="mt-6 flex gap-2 justify-end border-t pt-3">
              {isAdmin && (
                <>
                  <Button variant="secondary" onClick={() => handleEditClick(selectedAsset)}>
                    Edit Asset
                  </Button>
                  <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => archiveMutation.mutate(selectedAsset.id)}>
                    Archive Asset
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={() => setSelectedAsset(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
