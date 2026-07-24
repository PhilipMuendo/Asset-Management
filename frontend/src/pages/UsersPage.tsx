import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Pencil, Plus, Search, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Pagination } from "../components/ui/Pagination";
import { Select } from "../components/ui/Select";
import { SkeletonRow } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../hooks/useAuth";
import { listBranches } from "../services/branches";
import { listCategories } from "../services/assets";
import { createUser, listCategoryAssignments, listDepartments, listUsers, setCategoryAssignments, updateUser } from "../services/users";
import type { User } from "../types/user";

const schema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  phone_number: z.string().min(7),
  department_id: z.coerce.number().nullable(),
  branch_id: z.coerce.number().nullable(),
  job_title: z.string().optional(),
  role: z.enum(["superadmin", "admin", "staff"]),
  status: z.enum(["active", "suspended", "archived"]),
  password: z.string().min(8).max(128).optional().or(z.literal(""))
});

type UserForm = z.infer<typeof schema>;

const editSchema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  phone_number: z.string().min(7),
  department_id: z.coerce.number().nullable(),
  branch_id: z.coerce.number().nullable(),
  job_title: z.string().optional(),
  role: z.enum(["superadmin", "admin", "staff"]),
  status: z.enum(["active", "suspended", "archived"])
});

type EditUserForm = z.infer<typeof editSchema>;

const PAGE_SIZE = 10;

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const isSuperadmin = currentUser?.role === "superadmin";
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [managingCategoriesFor, setManagingCategoriesFor] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const departmentsQuery = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: listBranches });
  const form = useForm<UserForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      department_id: null,
      branch_id: null,
      job_title: "",
      role: "staff",
      status: "active",
      password: ""
    }
  });

  const selectedRole = form.watch("role");

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast("Staff account created");
      if (data.temporary_password) {
        setCreatedPassword(data.temporary_password);
      } else {
        form.reset();
        setFormOpen(false);
      }
    }
  });

  async function onSubmit(values: UserForm) {
    await createMutation.mutateAsync({
      ...values,
      department_id: values.department_id || null,
      branch_id:
        values.role === "admin" || values.role === "staff"
          ? isSuperadmin
            ? values.branch_id || null
            : currentUser?.branch_id ?? null
          : null,
      job_title: values.job_title || null,
      password: values.password || undefined
    });
  }

  function closePasswordModal() {
    setCreatedPassword(null);
    setCopied(false);
    form.reset();
    setFormOpen(false);
  }

  function copyPassword() {
    if (createdPassword) {
      navigator.clipboard.writeText(createdPassword);
      setCopied(true);
    }
  }

  const filteredUsers = usersQuery.data?.filter(
    (user) =>
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );
  const pagedUsers = filteredUsers?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasNextPage = (filteredUsers?.length ?? 0) > (page + 1) * PAGE_SIZE;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Staff accounts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage internal users. Accounts are never permanently deleted.
          </p>
        </div>
        <Button onClick={() => setFormOpen((open) => !open)}>
          <Plus size={18} />
          New staff account
        </Button>
      </div>

      {formOpen ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <Field label="First name">
              <Input {...form.register("first_name")} />
            </Field>
            <Field label="Last name">
              <Input {...form.register("last_name")} />
            </Field>
            <Field label="Company email">
              <Input type="email" {...form.register("email")} />
            </Field>
            <Field label="Phone number">
              <Input {...form.register("phone_number")} />
            </Field>
            <Field label="Department">
              <Select {...form.register("department_id")}>
                <option value="">Unassigned</option>
                {departmentsQuery.data?.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Job title">
              <Input {...form.register("job_title")} />
            </Field>
            <Field label="Role">
              <Select {...form.register("role")}>
                <option value="staff">Staff</option>
                {isSuperadmin ? <option value="admin">Branch admin</option> : null}
                {isSuperadmin ? <option value="superadmin">Superadmin</option> : null}
              </Select>
            </Field>
            <Field label="Status">
              <Select {...form.register("status")}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            {selectedRole === "admin" || selectedRole === "staff" ? (
              isSuperadmin ? (
                <Field label="Branch">
                  <Select {...form.register("branch_id")}>
                    <option value="">Select a branch</option>
                    {branchesQuery.data?.filter((b) => b.is_active).map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedRole === "admin"
                      ? "A branch admin can only approve borrow requests submitted from this branch."
                      : "The branch this staff member works at. They can still select a different branch to borrow from at login."}
                  </p>
                </Field>
              ) : (
                <Field label="Branch">
                  <p className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {branchesQuery.data?.find((b) => b.id === currentUser?.branch_id)?.name ?? "Your branch"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Staff you create are automatically assigned to your branch.
                  </p>
                </Field>
              )
            ) : null}
            <Field label="Password (optional)">
              <Input type="text" {...form.register("password")} placeholder="Auto-generated if left blank" />
              <p className="mt-1 text-xs text-slate-500">
                Leave blank to auto-generate a temporary password. Min 8 characters if set manually.
              </p>
            </Field>
            {createMutation.error ? (
              <div className="md:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createMutation.error instanceof Error ? createMutation.error.message : "Could not create user"}
              </div>
            ) : null}
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating" : "Create account"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name or email..."
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Branch</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                {isSuperadmin || currentUser?.role === "admin" ? (
                  <th className="px-4 py-3 font-semibold">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersQuery.isLoading &&
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={7} />)}
              {pagedUsers?.map((user) => {
                const canEdit =
                  isSuperadmin ||
                  (currentUser?.role === "admin" &&
                    user.role === "staff" &&
                    user.branch_id === currentUser.branch_id);
                return (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge value={user.role} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {user.branch_id
                        ? branchesQuery.data?.find((b) => b.id === user.branch_id)?.name ?? `#${user.branch_id}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={user.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Intl.DateTimeFormat().format(new Date(user.created_at))}
                    </td>
                    {isSuperadmin || currentUser?.role === "admin" ? (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {canEdit ? (
                            <Button variant="ghost" className="p-1 text-xs" onClick={() => setEditingUser(user)}>
                              <Pencil size={14} />
                              Edit
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                          {isSuperadmin && user.role === "admin" ? (
                            <Button variant="ghost" className="p-1 text-xs" onClick={() => setManagingCategoriesFor(user)}>
                              <Shield size={14} />
                              Manage categories
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!usersQuery.isLoading && filteredUsers?.length === 0 && (
          <EmptyState title="No staff accounts match your search" />
        )}
      </section>

      {!usersQuery.isLoading && (filteredUsers?.length ?? 0) > PAGE_SIZE && (
        <Pagination page={page} hasNextPage={hasNextPage} onPrev={() => setPage((p) => Math.max(0, p - 1))} onNext={() => setPage((p) => p + 1)} />
      )}

      {createdPassword ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-950">Account created</h2>
            <p className="mt-1 text-sm text-slate-600">
              Share this temporary password with the staff member. It will not be shown again.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <code className="flex-1 break-all text-sm font-mono text-slate-900">{createdPassword}</code>
              <Button type="button" variant="secondary" onClick={copyPassword}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-amber-600">
              ⚠️ This password is only displayed once. Store it securely.
            </p>
            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={closePasswordModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {managingCategoriesFor ? (
        <CategoryAssignmentModal user={managingCategoriesFor} onClose={() => setManagingCategoriesFor(null)} />
      ) : null}

      {editingUser ? (
        <EditUserModal user={editingUser} isSuperadmin={isSuperadmin} onClose={() => setEditingUser(null)} />
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function EditUserModal({
  user,
  isSuperadmin,
  onClose
}: {
  user: User;
  isSuperadmin: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();
  const departmentsQuery = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: listBranches });
  const form = useForm<EditUserForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      department_id: user.department_id,
      branch_id: user.branch_id,
      job_title: user.job_title ?? "",
      role: user.role,
      status: user.status
    }
  });

  const selectedRole = form.watch("role");

  const updateMutation = useMutation({
    mutationFn: (values: EditUserForm) =>
      updateUser(user.id, {
        ...values,
        role: isSuperadmin ? values.role : user.role,
        department_id: values.department_id || null,
        branch_id: isSuperadmin
          ? values.role === "admin" || values.role === "staff"
            ? values.branch_id || null
            : null
          : user.branch_id,
        job_title: values.job_title || null
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast("Account updated");
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-950">
          Edit {user.first_name} {user.last_name}
        </h3>
        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
        >
          <Field label="First name">
            <Input {...form.register("first_name")} />
          </Field>
          <Field label="Last name">
            <Input {...form.register("last_name")} />
          </Field>
          <Field label="Phone number">
            <Input {...form.register("phone_number")} />
          </Field>
          <Field label="Job title">
            <Input {...form.register("job_title")} />
          </Field>
          <Field label="Department">
            <Select {...form.register("department_id")}>
              <option value="">Unassigned</option>
              {departmentsQuery.data?.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Role">
            <Select {...form.register("role")} disabled={!isSuperadmin}>
              <option value="staff">Staff</option>
              {isSuperadmin ? <option value="admin">Branch admin</option> : null}
              {isSuperadmin ? <option value="superadmin">Superadmin</option> : null}
            </Select>
          </Field>
          <Field label="Status">
            <Select {...form.register("status")}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          {selectedRole === "admin" || selectedRole === "staff" ? (
            <Field label="Branch">
              <Select {...form.register("branch_id")} disabled={!isSuperadmin}>
                <option value="">Select a branch</option>
                {branchesQuery.data?.filter((b) => b.is_active).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-slate-500">
                {selectedRole === "admin"
                  ? "A branch admin can only approve borrow requests submitted from this branch."
                  : "The branch this staff member works at. They can still select a different branch to borrow from at login."}
              </p>
            </Field>
          ) : null}
          {updateMutation.error ? (
            <div className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {updateMutation.error instanceof Error ? updateMutation.error.message : "Could not update account"}
            </div>
          ) : null}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryAssignmentModal({ user, onClose }: { user: User; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const assignmentsQuery = useQuery({
    queryKey: ["category-assignments", user.id],
    queryFn: () => listCategoryAssignments(user.id)
  });
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (assignmentsQuery.data) {
      setSelected(assignmentsQuery.data);
    }
  }, [assignmentsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => setCategoryAssignments(user.id, selected),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-assignments", user.id] });
      showToast("Category assignments updated");
      onClose();
    }
  });

  function toggle(categoryId: number) {
    setSelected((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-950">
          Categories for {user.first_name} {user.last_name}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          This branch admin can only approve borrow requests where every item's category is checked below.
          No categories checked means they cannot approve anything.
        </p>
        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {categoriesQuery.data?.map((category) => (
            <label key={category.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selected.includes(category.id)}
                onChange={() => toggle(category.id)}
              />
              {category.name}
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
