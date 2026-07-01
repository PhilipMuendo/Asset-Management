import { useQuery } from "@tanstack/react-query";
import { Badge } from "../components/ui/Badge";
import { useAuth } from "../hooks/useAuth";
import { getDashboardSummary, listMyBorrowRequests } from "../services/borrowing";

export function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const adminSummaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
    enabled: isAdmin
  });

  const myRequestsQuery = useQuery({
    queryKey: ["my-requests"],
    queryFn: listMyBorrowRequests,
    enabled: !isAdmin
  });

  if (isAdmin) {
    const data = adminSummaryQuery.data;
    const metrics = data?.metrics;
    const distribution = data?.status_distribution;
    const logs = data?.recent_audit_logs;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">System Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of Renewable & Solar asset assets, staff borrowing, and system logs.
          </p>
        </div>

        {/* Metrics Grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total Registered Assets" value={metrics?.total_assets ?? 0} />
          <MetricCard title="Active Borrows" value={metrics?.active_borrows ?? 0} />
          <MetricCard title="Overdue Borrows" value={metrics?.overdue_borrows ?? 0} className={metrics?.overdue_borrows > 0 ? "border-red-200 bg-red-50/50" : ""} />
          <MetricCard title="Staff Members" value={metrics?.total_users ?? 0} />
        </section>

        {/* Status Distribution */}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Asset Status Distribution</h3>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {distribution &&
              Object.entries(distribution).map(([status, count]) => (
                <div key={status} className="border border-slate-100 rounded p-3 text-center">
                  <Badge value={status} className="mb-2" />
                  <p className="text-lg font-bold text-slate-900">{count as number}</p>
                </div>
              ))}
          </div>
        </section>

        {/* Recent Audit Logs */}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Recent Audit Timeline</h3>
          <div className="flow-root">
            <ul className="-mb-8">
              {logs?.slice(0, 5).map((log: any, idx: number) => (
                <li key={log.id}>
                  <div className="relative pb-8">
                    {idx !== logs.slice(0, 5).length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-8 ring-white text-xs font-bold text-slate-500">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-slate-900">
                            <span className="font-semibold text-slate-950">{log.actor_name}</span> completed action{" "}
                            <span className="font-mono text-xs font-bold text-brand-dark">{log.action}</span>
                          </p>
                        </div>
                        <div className="text-right text-xs whitespace-nowrap text-slate-500">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {logs?.length === 0 && <p className="text-sm text-slate-400">No logs recorded yet.</p>}
            </ul>
          </div>
        </section>
      </div>
    );
  }

  // Staff View Dashboard
  const myRequests = myRequestsQuery.data;
  const activeStaffRequests = myRequests?.filter(r => r.status === "issued" || r.status === "overdue" || r.status === "approved");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Welcome, {user?.first_name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          View your currently checked out tools and pending approvals below.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Checked Out & Reserved</h3>
          <div className="space-y-3">
            {activeStaffRequests?.map((request) => (
              <div key={request.id} className="border border-slate-100 rounded p-3 flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-900">Request #{request.id}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {request.items.map(i => i.asset.name).join(", ")}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Expected return: {new Date(request.expected_return_date).toLocaleDateString()}</p>
                </div>
                <Badge value={request.status} />
              </div>
            ))}
            {activeStaffRequests?.length === 0 && (
              <p className="text-sm text-slate-400">You do not have any active borrows or reserved assets.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Profile Info</h3>
          <div className="space-y-2 text-sm text-slate-800">
            <p>Name: <span className="font-semibold">{user?.first_name} {user?.last_name}</span></p>
            <p>Email: <span className="font-semibold">{user?.email}</span></p>
            <p>Job Title: <span className="font-semibold">{user?.job_title || "—"}</span></p>
            <p>Role: <span className="font-semibold capitalize">{user?.role}</span></p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, className }: { title: string; value: number | string; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-5 shadow-soft ${className}`}>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}
