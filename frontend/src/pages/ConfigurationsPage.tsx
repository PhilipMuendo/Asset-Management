import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { listCategories, createCategory, listLocations, createLocation, listSuppliers, createSupplier } from "../services/assets";

const configSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  contact_info: z.string().optional(),
});

type ConfigForm = z.infer<typeof configSchema>;

export function ConfigurationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"categories" | "locations" | "suppliers">("categories");
  const [formOpen, setFormOpen] = useState(false);

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const locationsQuery = useQuery({ queryKey: ["locations"], queryFn: listLocations });
  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers });

  const form = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: { name: "", description: "", contact_info: "" }
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      resetForm();
    }
  });

  const createLocationMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      resetForm();
    }
  });

  const createSupplierMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      resetForm();
    }
  });

  function resetForm() {
    form.reset();
    setFormOpen(false);
  }

  async function onSubmit(values: ConfigForm) {
    if (activeTab === "categories") {
      await createCategoryMutation.mutateAsync({ name: values.name, description: values.description });
    } else if (activeTab === "locations") {
      await createLocationMutation.mutateAsync({ name: values.name, description: values.description });
    } else if (activeTab === "suppliers") {
      await createSupplierMutation.mutateAsync({ name: values.name, contact_info: values.contact_info });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">System Configurations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage asset categories, warehouse locations, and suppliers.
          </p>
        </div>
        <Button onClick={() => setFormOpen((open) => !open)}>
          <Plus size={18} />
          Add New Item
        </Button>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-6" aria-label="Tabs">
          {(["categories", "locations", "suppliers"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setFormOpen(false);
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

      {formOpen && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <form className="space-y-4 max-w-lg" onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Name</label>
              <Input className="mt-1.5" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="mt-1.5 text-xs text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            {activeTab !== "suppliers" ? (
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
              {activeTab !== "suppliers" ? (
                <th className="px-6 py-4">Description</th>
              ) : (
                <th className="px-6 py-4">Contact Info</th>
              )}
              <th className="px-6 py-4">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-900">
            {activeTab === "categories" &&
              categoriesQuery.data?.map((cat) => (
                <tr key={cat.id}>
                  <td className="px-6 py-4 font-medium">{cat.name}</td>
                  <td className="px-6 py-4 text-slate-500">{cat.description || "—"}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(cat.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            {activeTab === "locations" &&
              locationsQuery.data?.map((loc) => (
                <tr key={loc.id}>
                  <td className="px-6 py-4 font-medium">{loc.name}</td>
                  <td className="px-6 py-4 text-slate-500">{loc.description || "—"}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(loc.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            {activeTab === "suppliers" &&
              suppliersQuery.data?.map((sup) => (
                <tr key={sup.id}>
                  <td className="px-6 py-4 font-medium">{sup.name}</td>
                  <td className="px-6 py-4 text-slate-500">{sup.contact_info || "—"}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(sup.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
