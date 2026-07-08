import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { createUser, listDepartments, listUsers } from "../services/users";

const schema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  phone_number: z.string().min(7),
  department_id: z.coerce.number().nullable(),
  job_title: z.string().optional(),
  role: z.enum(["admin", "staff"]),
  status: z.enum(["active", "suspended", "archived"]),
  password: z.string().min(8).max(128).optional().or(z.literal(""))
});

type UserForm = z.infer<typeof schema>;

export function UsersPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const departmentsQuery = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const form = useForm<UserForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      department_id: null,
      job_title: "",
      role: "staff",
      status: "active",
      password: ""
    }
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
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
                <option value="admin">Admin</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select {...form.register("status")}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
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

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersQuery.data?.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge value={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={user.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Intl.DateTimeFormat().format(new Date(user.created_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
