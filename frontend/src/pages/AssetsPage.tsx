import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer, Search, Eye, History as HistoryIcon, QrCode } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { useAuth } from "../hooks/useAuth";
import { listAssets, createAsset, listCategories, listLocations, listSuppliers, getAssetHistory, updateAsset, archiveAsset } from "../services/assets";
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
});

type AssetForm = z.infer<typeof assetSchema>;

export function AssetsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [formOpen, setFormOpen] = useState(false);
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
    }
  });

  const createMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      form.reset();
      setFormOpen(false);
    }
  });

  const archiveMutation = useMutation({
    mutationFn: archiveAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setSelectedAsset(null);
    }
  });

  async function onSubmit(values: AssetForm) {
    await createMutation.mutateAsync({
      ...values,
      serial_number: values.serial_number || undefined,
      model_number: values.model_number || undefined,
      description: values.description || undefined,
      supplier_id: values.supplier_id || undefined,
    });
  }

  function handlePrintQr(permanentId: string) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Label - ${permanentId}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
            img { width: 200px; height: 200px; }
            h2 { margin-top: 10px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${permanentId}" />
          <h2>${permanentId}</h2>
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
      (asset.serial_number && asset.serial_number.toLowerCase().includes(search.toLowerCase()));

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
          <Button onClick={() => setFormOpen((open) => !open)}>
            <Plus size={18} />
            Register Asset
          </Button>
        )}
      </div>

      {formOpen && isAdmin && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Permanent Asset ID</label>
              <Input placeholder="e.g. CEA-000001" className="mt-1.5" {...form.register("permanent_id")} />
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
                {categoriesQuery.data?.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Location</label>
              <Select className="mt-1.5" {...form.register("location_id")}>
                <option value="">Select Location</option>
                {locationsQuery.data?.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Supplier</label>
              <Select className="mt-1.5" {...form.register("supplier_id")}>
                <option value="">Select Supplier (Optional)</option>
                {suppliersQuery.data?.map((sup) => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Description</label>
              <Input placeholder="Provide a detailed description of the asset..." className="mt-1.5" {...form.register("description")} />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                Register
              </Button>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
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
            placeholder="Search by ID, Name, Serial..."
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
              <span className="text-xs text-slate-500">{qrAsset.name}</span>
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => handlePrintQr(qrAsset.permanent_id)}>
                <Printer size={16} />
                Print Label
              </Button>
              <Button variant="ghost" onClick={() => setQrAsset(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Asset History Dialog */}
      {historyAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl border border-slate-200 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-950">History logs - {historyAsset.permanent_id}</h3>
            
            <div className="mt-4 space-y-4">
              {historyQuery.isLoading && <p>Loading history...</p>}
              {historyQuery.data?.map((item) => (
                <div key={item.id} className="border-l-2 border-slate-200 pl-4 py-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                    <span className="capitalize font-semibold text-slate-800">{item.action}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-900">{item.notes}</p>
                  {(item.previous_status || item.new_status) && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Status: {item.previous_status || "—"} → {item.new_status || "—"}
                    </p>
                  )}
                </div>
              ))}
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
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-950">{selectedAsset.permanent_id}</h3>
              <Badge value={selectedAsset.status} />
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Name</span>
                <p className="font-semibold text-slate-900">{selectedAsset.name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Category</span>
                <p className="text-slate-700">{selectedAsset.category?.name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Warehouse Location</span>
                <p className="text-slate-700">{selectedAsset.location?.name}</p>
              </div>
              {selectedAsset.supplier && (
                <div>
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Supplier</span>
                  <p className="text-slate-700">{selectedAsset.supplier.name}</p>
                </div>
              )}
              {selectedAsset.description && (
                <div>
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Description</span>
                  <p className="text-slate-700">{selectedAsset.description}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              {isAdmin && (
                <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => archiveMutation.mutate(selectedAsset.id)}>
                  Archive Asset
                </Button>
              )}
              <Button variant="ghost" onClick={() => setSelectedAsset(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
