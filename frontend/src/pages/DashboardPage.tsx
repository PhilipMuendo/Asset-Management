import { Badge } from "../components/ui/Badge";
import { useAuth } from "../hooks/useAuth";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Account and asset operations will appear here as modules are enabled.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-medium text-slate-500">Signed in as</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-medium text-slate-500">Role</p>
          <div className="mt-3">
            <Badge value={user?.role ?? "staff"} />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-medium text-slate-500">Status</p>
          <div className="mt-3">
            <Badge value={user?.status ?? "active"} />
          </div>
        </div>
      </section>
    </div>
  );
}

