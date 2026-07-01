import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(values: LoginForm) {
    setError(null);
    try {
      await login(values);
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

