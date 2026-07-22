import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { useAuth } from "../hooks/useAuth";
import { listBranches } from "../services/branches";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  branch_id: z.coerce.number().optional()
});

type LoginForm = z.infer<typeof schema>;
type LoginMode = "staff" | "admin";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<LoginMode>("staff");
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: listBranches });
  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      branch_id: undefined
    }
  });

  if (user) {
    return <Navigate to="/" replace />;
  }

  function switchMode(next: LoginMode) {
    setMode(next);
    if (next === "admin") {
      form.setValue("branch_id", undefined);
      form.clearErrors("branch_id");
    }
  }

  async function onSubmit(values: LoginForm) {
    setError(null);
    if (mode === "staff" && !values.branch_id) {
      form.setError("branch_id", {
        type: "manual",
        message: "Select the branch you're signing in from"
      });
      return;
    }
    try {
      await login({ ...values, branch_id: mode === "staff" ? values.branch_id ?? null : null });
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6">
          <p className="text-sm font-semibold text-brand">Collective Energy Africa</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
            Asset management sign in
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Use your company email to access the internal asset workspace.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => switchMode("staff")}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              mode === "staff" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Staff
          </button>
          <button
            type="button"
            onClick={() => switchMode("admin")}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              mode === "admin" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Admin
          </button>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="block text-sm font-medium text-slate-700">
            Company email
            <Input className="mt-1" type="email" autoComplete="email" {...form.register("email")} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <Input
              className="mt-1"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
          </label>
          {mode === "staff" ? (
            <label className="block text-sm font-medium text-slate-700">
              Branch
              <Select className="mt-1" {...form.register("branch_id")}>
                <option value="">Select your branch</option>
                {branchesQuery.data
                  ?.filter((branch) => branch.is_active)
                  .map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
              </Select>
              <span className="mt-1 block text-xs text-slate-500">
                Select the branch you're signing in from.
              </span>
              {form.formState.errors.branch_id && (
                <p className="mt-1.5 text-xs text-red-600">{form.formState.errors.branch_id.message}</p>
              )}
            </label>
          ) : null}
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Signing in" : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}

