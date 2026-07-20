import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit3, Trash2, ShieldAlert, Check, X, ShieldX } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Input } from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../hooks/useAuth";
import { listCategories, createCategory, updateCategory, deleteCategory, listLocations, createLocation, updateLocation, deleteLocation, listSuppliers, createSupplier, updateSupplier, deleteSupplier } from "../services/assets";
import { listBranches, createBranch, updateBranch, deleteBranch } from "../services/branches";
import { listDepartments, createDepartment, updateDepartment, deleteDepartment } from "../services/users";

const configSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  contact_info: z.string().optional(),
  code: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
});

type ConfigForm = z.infer<typeof configSchema>;

export function ConfigurationsPage() {
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();
  const { user } = useAuth();
  const isSuperadmin = user?.role === "superadmin";
  const [activeTab, setActiveTab] = useState<"categories" | "locations" | "suppliers" | "departments" | "branches">("categories");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const locationsQuery = useQuery({ queryKey: ["locations"], queryFn: listLocations });
  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers });
  const departmentsQuery = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: listBranches });

  const form = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: { name: "", description: "", contact_info: "" }
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); resetForm(); showToast("Category created"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateCategory(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); resetForm(); showToast("Category updated"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); resetForm(); showToast("Category deleted"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const createLocationMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["locations"] }); resetForm(); showToast("Location created"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateLocation(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["locations"] }); resetForm(); showToast("Location updated"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const deleteLocationMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["locations"] }); resetForm(); showToast("Location deleted"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const createSupplierMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); resetForm(); showToast("Supplier created"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateSupplier(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); resetForm(); showToast("Supplier updated"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); resetForm(); showToast("Supplier deleted"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const createDepartmentMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["departments"] }); resetForm(); showToast("Department created"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateDepartment(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["departments"] }); resetForm(); showToast("Department updated"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["departments"] }); resetForm(); showToast("Department deleted"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const createBranchMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branches"] }); resetForm(); showToast("Branch created"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateBranch(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branches"] }); resetForm(); showToast("Branch updated"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  const deleteBranchMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branches"] }); resetForm(); showToast("Branch deleted"); },
    onError: (err: any) => setErrorMsg(err.message)
  });

  function resetForm() {
    form.reset({ name: "", description: "", contact_info: "", code: "", country: "", address: "" });
    setFormOpen(false);
    setEditingItem(null);
    setErrorMsg(null);
  }

  function handleEditClick(item: any) {
    setEditingItem(item);
    form.reset({
      name: item.name,
      description: item.description || "",
      contact_info: item.contact_info || "",
      code: item.code || "",
      country: item.country || "",
      address: item.address || ""
    });
    setFormOpen(true);
    setErrorMsg(null);
  }

  async function onSubmit(values: ConfigForm) {
    setErrorMsg(null);
    try {
      if (editingItem) {
        if (activeTab === "branches") {
          const data = { name: values.name, code: values.code, country: values.country, address: values.address };
          await updateBranchMutation.mutateAsync({ id: editingItem.id, data });
          return;
        }
        const data: any = { name: values.name };
        if (activeTab !== "suppliers") data.description = values.description;
        else data.contact_info = values.contact_info;

        if (activeTab === "categories") await updateCategoryMutation.mutateAsync({ id: editingItem.id, data });
        else if (activeTab === "locations") await updateLocationMutation.mutateAsync({ id: editingItem.id, data });
        else if (activeTab === "suppliers") await updateSupplierMutation.mutateAsync({ id: editingItem.id, data });
        else if (activeTab === "departments") await updateDepartmentMutation.mutateAsync({ id: editingItem.id, data });
      } else {
        if (activeTab === "categories") await createCategoryMutation.mutateAsync({ name: values.name, description: values.description });
        else if (activeTab === "locations") await createLocationMutation.mutateAsync({ name: values.name, description: values.description });
        else if (activeTab === "suppliers") await createSupplierMutation.mutateAsync({ name: values.name, contact_info: values.contact_info });
        else if (activeTab === "departments") await createDepartmentMutation.mutateAsync({ name: values.name, description: values.description });
        else if (activeTab === "branches")
          await createBranchMutation.mutateAsync({
            name: values.name,
            code: values.code || "",
            country: values.country || "",
            address: values.address
          });
      }
    } catch (err) {}
  }

  async function toggleActiveStatus(item: any) {
    setErrorMsg(null);
    const data = { is_active: !item.is_active };
    if (activeTab === "categories") await updateCategoryMutation.mutateAsync({ id: item.id, data });
    else if (activeTab === "locations") await updateLocationMutation.mutateAsync({ id: item.id, data });
    else if (activeTab === "suppliers") await updateSupplierMutation.mutateAsync({ id: item.id, data });
    else if (activeTab === "branches") await updateBranchMutation.mutateAsync({ id: item.id, data });
  }

  function handleDeleteClick(item: any) {
    setErrorMsg(null);
    setDeleteTarget({ id: item.id, name: item.name });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setErrorMsg(null);
    try {
      if (activeTab === "categories") await deleteCategoryMutation.mutateAsync(id);
      else if (activeTab === "locations") await deleteLocationMutation.mutateAsync(id);
      else if (activeTab === "suppliers") await deleteSupplierMutation.mutateAsync(id);
      else if (activeTab === "departments") await deleteDepartmentMutation.mutateAsync(id);
      else if (activeTab === "branches") await deleteBranchMutation.mutateAsync(id);
    } catch (err) {}
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Master Data Configuration</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage asset categories, warehouse storage locations, suppliers, and departments.
          </p>
        </div>
        {(activeTab !== "branches" || isSuperadmin) && (
          <Button onClick={() => { setEditingItem(null); setFormOpen((open) => !open); setErrorMsg(null); }}>
            <Plus size={18} />
            {formOpen ? "Close Panel" : "Add New Item"}
          </Button>
        )}
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-6" aria-label="Tabs">
          {(["categories", "locations", "suppliers", "departments", "branches"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                resetForm();
              }}
              className={`pb-4 text-sm font-medium border-b-2 capitalize transition-colors ${
                activeTab === tab
                  ? "border-brand text-brand-dark"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {errorMsg && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200 flex items-center gap-2 text-sm text-red-700">
          <ShieldX size={16} />
          {errorMsg}
        </div>
      )}

      {formOpen && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-sm font-bold text-slate-950 mb-3">
            {editingItem ? `Rename / Edit ${editingItem.name}` : `Create New ${activeTab.slice(0, -1)}`}
          </h3>
          <form className="space-y-4 max-w-lg" onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Name</label>
              <Input className="mt-1.5" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="mt-1.5 text-xs text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            {activeTab === "branches" ? (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Code</label>
                  <Input className="mt-1.5" placeholder="e.g. NBO" {...form.register("code")} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Country</label>
                  <Input className="mt-1.5" {...form.register("country")} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Address</label>
                  <Input className="mt-1.5" {...form.register("address")} />
                </div>
              </>
            ) : activeTab !== "suppliers" ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Description</label>
                <Input className="mt-1.5" {...form.register("description")} />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Contact Info</label>
                <Input className="mt-1.5" {...form.register("contact_info")} />
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      <div className="rounded-lg border border-slate-200 bg-white shadow-soft overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Name</th>
              {activeTab === "branches" ? (
                <th className="px-6 py-4">Code / Country</th>
              ) : activeTab !== "suppliers" ? (
                <th className="px-6 py-4">Description</th>
              ) : (
                <th className="px-6 py-4">Contact Info</th>
              )}
              {activeTab !== "departments" && (
                <th className="px-6 py-4">Status</th>
              )}
              <th className="px-6 py-4">{activeTab === "branches" ? "Branch Admins" : "Assets Linked"}</th>
              {(activeTab !== "branches" || isSuperadmin) && <th className="px-6 py-4">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-900">
            {activeTab === "categories" &&
              categoriesQuery.data?.map((cat) => (
                <tr key={cat.id}>
                  <td className="px-6 py-4 font-medium">{cat.name}</td>
                  <td className="px-6 py-4 text-slate-500">{cat.description || "—"}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActiveStatus(cat)}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border ${
                        cat.is_active
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {cat.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-semibold">{cat.usage_count}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <Button variant="ghost" className="p-1" onClick={() => handleEditClick(cat)}>
                      <Edit3 size={14} />
                    </Button>
                    <Button variant="ghost" className="p-1 text-red-600 hover:text-red-700" onClick={() => handleDeleteClick(cat)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            {activeTab === "locations" &&
              locationsQuery.data?.map((loc) => (
                <tr key={loc.id}>
                  <td className="px-6 py-4 font-medium">{loc.name}</td>
                  <td className="px-6 py-4 text-slate-500">{loc.description || "—"}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActiveStatus(loc)}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border ${
                        loc.is_active
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {loc.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-semibold">{loc.usage_count}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <Button variant="ghost" className="p-1" onClick={() => handleEditClick(loc)}>
                      <Edit3 size={14} />
                    </Button>
                    <Button variant="ghost" className="p-1 text-red-600 hover:text-red-700" onClick={() => handleDeleteClick(loc)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            {activeTab === "suppliers" &&
              suppliersQuery.data?.map((sup) => (
                <tr key={sup.id}>
                  <td className="px-6 py-4 font-medium">{sup.name}</td>
                  <td className="px-6 py-4 text-slate-500">{sup.contact_info || "—"}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActiveStatus(sup)}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border ${
                        sup.is_active
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {sup.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-semibold">{sup.usage_count}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <Button variant="ghost" className="p-1" onClick={() => handleEditClick(sup)}>
                      <Edit3 size={14} />
                    </Button>
                    <Button variant="ghost" className="p-1 text-red-600 hover:text-red-700" onClick={() => handleDeleteClick(sup)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            {activeTab === "departments" &&
              departmentsQuery.data?.map((dept) => (
                <tr key={dept.id}>
                  <td className="px-6 py-4 font-medium">{dept.name}</td>
                  <td className="px-6 py-4 text-slate-500">{dept.description || "—"}</td>
                  <td className="px-6 py-4 text-slate-900 font-semibold">{dept.usage_count}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <Button variant="ghost" className="p-1" onClick={() => handleEditClick(dept)}>
                      <Edit3 size={14} />
                    </Button>
                    <Button variant="ghost" className="p-1 text-red-600 hover:text-red-700" onClick={() => handleDeleteClick(dept)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            {activeTab === "branches" &&
              branchesQuery.data?.map((branch) => (
                <tr key={branch.id}>
                  <td className="px-6 py-4 font-medium">{branch.name}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {branch.code} · {branch.country}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => isSuperadmin && toggleActiveStatus(branch)}
                      disabled={!isSuperadmin}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border ${
                        branch.is_active
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {branch.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-semibold">{branch.usage_count}</td>
                  {isSuperadmin && (
                    <td className="px-6 py-4 flex gap-2">
                      <Button variant="ghost" className="p-1" onClick={() => handleEditClick(branch)}>
                        <Edit3 size={14} />
                      </Button>
                      <Button variant="ghost" className="p-1 text-red-600 hover:text-red-700" onClick={() => handleDeleteClick(branch)}>
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this master record?"
        description={deleteTarget ? `"${deleteTarget.name}" will be permanently removed from this list.` : undefined}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
