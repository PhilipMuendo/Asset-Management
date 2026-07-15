import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllAuditLogs } from "../services/borrowing";

const PAGE_SIZE = 50;

export function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const auditLogsQuery = useQuery({
    queryKey: ["audit-logs", page],
    queryFn: () => getAllAuditLogs({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    placeholderData: (previous) => previous
  });
  const hasNextPage = (auditLogsQuery.data?.length ?? 0) === PAGE_SIZE;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">System Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Read-only, immutable security timeline of all events across Collective Energy Africa.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-soft overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Actor</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Entity Type</th>
              <th className="px-6 py-4">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-900">
            {auditLogsQuery.isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-slate-500">Loading audit logs...</td>
              </tr>
            )}
            {auditLogsQuery.data?.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-950">{log.actor_name}</p>
                  {log.actor_email && <p className="text-xs text-slate-500">{log.actor_email}</p>}
                </td>
                <td className="px-6 py-4 font-mono text-xs font-semibold text-brand-dark">
                  {log.action}
                </td>
                <td className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-slate-600">
                  {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ""}
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={JSON.stringify(log.metadata)}>
                  {JSON.stringify(log.metadata)}
                </td>
              </tr>
            ))}
            {auditLogsQuery.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-slate-500">No audit logs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Page {page + 1}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded border border-slate-200 px-3 py-1.5 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNextPage}
            className="rounded border border-slate-200 px-3 py-1.5 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
