import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, Check, X, ShieldAlert, PackageCheck, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../hooks/useAuth";
import { listAssets } from "../services/assets";
import {
  submitBorrowRequest,
  listBorrowRequests,
  listMyBorrowRequests,
  approveBorrowRequest,
  rejectBorrowRequest,
  cancelBorrowRequest,
  issueAssets,
  returnAssets
} from "../services/borrowing";
import { BorrowRequest } from "../types/assets";

const requestSchema = z.object({
  asset_ids: z.array(z.coerce.number()).min(1, "Select at least one asset"),
  purpose: z.string().min(5, "Purpose must explain why you need the asset"),
  expected_return_date: z.string().min(1, "Please select an expected return date").refine((val) => {
    const selectedDate = new Date(val);
    selectedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, "Expected return date cannot be in the past"),
});

type RequestForm = z.infer<typeof requestSchema>;

export function BorrowingPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { show: showToast } = useToast();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  function canManage(request: BorrowRequest): boolean {
    if (!user) return false;
    if (user.role === "superadmin") return true;
    if (user.role !== "admin" || user.branch_id == null) return false;
    if (request.branch_id !== user.branch_id) return false;
    const assigned = new Set(user.category_ids);
    if (assigned.size === 0) return false;
    return request.items.every((item) => assigned.has(item.asset.category_id));
  }

  const [formOpen, setFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [returnRequest, setReturnRequest] = useState<BorrowRequest | null>(null);
  const [returnCondition, setReturnCondition] = useState("Good");
  const [returnNotes, setReturnNotes] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState<BorrowRequest | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BorrowRequest | null>(null);

  const assetsQuery = useQuery({ queryKey: ["assets"], queryFn: listAssets });
  
  // Fetch borrow requests only after we know the current user (authentication)
  const requestsQuery = useQuery({
    queryKey: ["requests", isAdmin],
    queryFn: isAdmin ? listBorrowRequests : listMyBorrowRequests,
    // Prevent the query from running before the auth cookie is set.
    // This avoids an initial 401 which would otherwise block subsequent refetches.
    enabled: !!user
  });

  const form = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { asset_ids: [], purpose: "", expected_return_date: "" },
    mode: "onChange"
  });

  const submitMutation = useMutation({
    mutationFn: submitBorrowRequest,
    onSuccess: () => {
      // Invalidate the exact query key used by the request list (includes admin flag)
      queryClient.invalidateQueries({ queryKey: ["requests", isAdmin] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      form.reset();
      setFormOpen(false);
      showToast("Borrow request submitted");
    },
    onError: (err: any) => showToast(err?.message || "Could not submit request", "error")
  });

  const approveMutation = useMutation({
    mutationFn: approveBorrowRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests", isAdmin] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      showToast("Request approved");
    },
    onError: (err: any) => showToast(err?.message || "Could not approve request", "error")
  });

  const rejectMutation = useMutation({
    mutationFn: rejectBorrowRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests", isAdmin] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setRejectTarget(null);
      showToast("Request rejected");
    },
    onError: (err: any) => {
      setRejectTarget(null);
      showToast(err?.message || "Could not reject request", "error");
    }
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBorrowRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests", isAdmin] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setCancelTarget(null);
      showToast("Request cancelled");
    },
    onError: (err: any) => {
      setCancelTarget(null);
      showToast(err?.message || "Could not cancel request", "error");
    }
  });

  const issueMutation = useMutation({
    mutationFn: issueAssets,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests", isAdmin] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      showToast("Assets issued");
    },
    onError: (err: any) => showToast(err?.message || "Could not issue assets", "error")
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { return_condition: string; notes?: string } }) =>
      returnAssets(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests", isAdmin] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setReturnRequest(null);
      setReturnCondition("Good");
      setReturnNotes("");
      showToast("Assets received and recorded");
    },
    onError: (err: any) => showToast(err?.message || "Could not complete return", "error")
  });

  async function onSubmit(values: RequestForm) {
    await submitMutation.mutateAsync({
      asset_ids: values.asset_ids.map(Number),
      purpose: values.purpose,
      expected_return_date: new Date(values.expected_return_date).toISOString(),
    });
  }

  // Split active requests from history
  const activeRequests = requestsQuery.data?.filter(
    (r) => r.status === "pending_approval" || r.status === "approved" || r.status === "issued" || r.status === "overdue"
  );
  
  const historyRequests = requestsQuery.data?.filter(
    (r) => r.status === "rejected" || r.status === "returned" || r.status === "cancelled"
  );

  const displayRequests = activeTab === "active" ? activeRequests : historyRequests;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Borrow requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? "Track, approve, issue, and inspect solar asset borrows."
              : "Borrow assets, check request status, and track your history."}
          </p>
        </div>
        {!isAdmin && (
          <Button onClick={() => setFormOpen((open) => !open)}>
            <ClipboardList size={18} />
            Request Assets
          </Button>
        )}
      </div>

      {!isAdmin && formOpen && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <form className="space-y-4 max-w-lg" onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Select Asset(s)</label>
                <span className="text-xs font-medium text-slate-500">
                  {(form.watch("asset_ids")?.length ?? 0)} selected
                </span>
              </div>
              <Input
                placeholder="Search available assets..."
                className="my-1.5 text-xs"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
              />
              {(() => {
                const visibleAssets = assetsQuery.data?.filter(
                  (a) =>
                    a.status === "available" &&
                    (a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
                      a.permanent_id.toLowerCase().includes(assetSearch.toLowerCase()))
                ) ?? [];
                const selectedIds = form.watch("asset_ids") ?? [];
                const allVisibleSelected = visibleAssets.length > 0 && visibleAssets.every((a) => selectedIds.includes(a.id));
                return visibleAssets.length > 0 ? (
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1.5">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => {
                        const visibleIds = visibleAssets.map((a) => a.id);
                        if (e.target.checked) {
                          const merged = Array.from(new Set([...selectedIds, ...visibleIds]));
                          form.setValue("asset_ids", merged, { shouldValidate: true });
                        } else {
                          form.setValue(
                            "asset_ids",
                            selectedIds.filter((id) => !visibleIds.includes(id)),
                            { shouldValidate: true }
                          );
                        }
                      }}
                      className="rounded border-slate-300 text-brand focus:ring-brand"
                    />
                    Select all visible
                  </label>
                ) : null;
              })()}
              <div className="mt-1.5 grid gap-2 max-h-48 overflow-y-auto border border-slate-200 p-2.5 rounded">
                {assetsQuery.data
                  ?.filter(
                    (a) =>
                      a.status === "available" &&
                      (a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
                        a.permanent_id.toLowerCase().includes(assetSearch.toLowerCase()))
                  )
                  .map((asset) => (
                    <label key={asset.id} className="flex items-center gap-2 text-sm text-slate-950 font-medium">
                      <input
                        type="checkbox"
                        value={asset.id}
                        {...form.register("asset_ids")}
                        className="rounded border-slate-300 text-brand focus:ring-brand"
                      />
                      {asset.name} ({asset.permanent_id})
                    </label>
                  ))}
                {assetsQuery.data?.filter(
                  (a) =>
                    a.status === "available" &&
                    (a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
                      a.permanent_id.toLowerCase().includes(assetSearch.toLowerCase()))
                ).length === 0 && (
                  <p className="text-sm text-slate-400">No matching available assets found.</p>
                )}
              </div>
              {form.formState.errors.asset_ids && (
                <p className="mt-1.5 text-xs text-red-600">{form.formState.errors.asset_ids.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Purpose / Explanation</label>
              <Input placeholder="Explain what installation or maintenance task you need these tools for..." className="mt-1.5" {...form.register("purpose")} />
              {form.formState.errors.purpose && (
                <p className="mt-1.5 text-xs text-red-600">{form.formState.errors.purpose.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Expected Return Date</label>
              <Input type="date" min={new Date().toISOString().split("T")[0]} className="mt-1.5" {...form.register("expected_return_date")} />
              {form.formState.errors.expected_return_date && (
                <p className="mt-1.5 text-xs text-red-600">{form.formState.errors.expected_return_date.message}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitMutation.isPending}>
                Submit Request
              </Button>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("active")}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "active"
                ? "border-brand text-brand-dark"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Active Requests
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "history"
                ? "border-brand text-brand-dark"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            History / Archived
          </button>
        </nav>
      </div>

      {/* Requests table/list */}
      <div className="space-y-4">
        {displayRequests?.map((request) => (
          <div key={request.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-900">Request #{request.id}</span>
                <Badge value={request.status} />
              </div>
              <p className="text-sm font-medium text-slate-900">
                <span className="text-xs text-slate-400 block font-normal uppercase tracking-wide">Purpose</span>
                {request.purpose}
              </p>
              <div className="text-xs text-slate-500 space-y-1">
                <p>Applicant: <span className="font-semibold text-slate-700">{request.user.first_name} {request.user.last_name}</span> ({request.user.email})</p>
                <p>Expected return: <span className="font-semibold text-slate-700">{new Date(request.expected_return_date).toLocaleDateString()}</span></p>
              </div>

              {/* Items List */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Assets Requested</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {request.items.map((item) => (
                    <span key={item.id} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800 border">
                      {item.asset.name} ({item.asset.permanent_id})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-2 flex-wrap items-center">
                {isAdmin && request.status === "pending_approval" && (
                  <>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!canManage(request)}
                      onClick={() => approveMutation.mutate(request.id)}
                    >
                      <Check size={14} />
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={!canManage(request)}
                      onClick={() => setRejectTarget(request)}
                    >
                      <X size={14} />
                      Reject
                    </Button>
                  </>
                )}

                {isAdmin && request.status === "approved" && (
                  <Button className="bg-brand" disabled={!canManage(request)} onClick={() => issueMutation.mutate(request.id)}>
                    <PackageCheck size={14} />
                    Issue Assets
                  </Button>
                )}

                {isAdmin && (request.status === "issued" || request.status === "overdue") && (
                  <Button variant="secondary" disabled={!canManage(request)} onClick={() => setReturnRequest(request)}>
                    Inspect & Receive
                  </Button>
                )}

                {/* Staff cancellation */}
                {!isAdmin && (request.status === "pending_approval" || request.status === "approved") && (
                  <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setCancelTarget(request)}>
                    Cancel Request
                  </Button>
                )}
              </div>
              {isAdmin && user?.role === "admin" && !canManage(request) && request.status !== "returned" && request.status !== "rejected" && request.status !== "cancelled" && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle size={12} />
                  Not in your assigned categories
                </span>
              )}
            </div>
          </div>
        ))}

        {requestsQuery.isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full max-w-sm" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}

        {!requestsQuery.isLoading && displayRequests?.length === 0 && (
          <EmptyState title="No borrow requests found in this tab" />
        )}
      </div>

      {/* Return Inspection Dialog */}
      {returnRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-950">Receive & Inspect Assets</h3>
            <p className="mt-1 text-xs text-slate-500">Record condition of tools returning from Request #{returnRequest.id}.</p>
            
            <div className="my-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Recorded Condition</label>
                <Select className="mt-1.5" value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)}>
                  <option value="Good">Good / Undamaged</option>
                  <option value="Minor Wear">Minor Wear</option>
                  <option value="Damaged">Damaged / Repair Needed</option>
                  <option value="Lost">Lost</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Inspection Notes</label>
                <Input placeholder="Describe returning condition details..." className="mt-1.5" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button onClick={() => returnMutation.mutate({ id: returnRequest.id, data: { return_condition: returnCondition, notes: returnNotes } })}>
                Save & Complete
              </Button>
              <Button variant="ghost" onClick={() => setReturnRequest(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject this request?"
        description={rejectTarget ? `Request #${rejectTarget.id} will be rejected and the applicant notified.` : undefined}
        confirmLabel="Reject"
        variant="danger"
        onConfirm={() => rejectTarget && rejectMutation.mutate(rejectTarget.id)}
        onCancel={() => setRejectTarget(null)}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel this request?"
        description={cancelTarget ? `Request #${cancelTarget.id} will be cancelled. This cannot be undone.` : undefined}
        confirmLabel="Cancel Request"
        variant="danger"
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
