import { cn } from "../../utils/cn";

const statusStyles: Record<string, string> = {
  // User statuses
  active: "bg-green-50 text-green-700 ring-green-600/20",
  suspended: "bg-orange-50 text-orange-700 ring-orange-600/20",
  archived: "bg-slate-100 text-slate-600 ring-slate-500/20",
  admin: "bg-blue-50 text-blue-700 ring-blue-600/20",
  staff: "bg-slate-100 text-slate-700 ring-slate-500/20",
  
  // Asset statuses
  available: "bg-green-50 text-green-700 ring-green-600/20",
  reserved: "bg-blue-50 text-blue-700 ring-blue-600/20",
  borrowed: "bg-orange-50 text-orange-700 ring-orange-600/20",
  maintenance: "bg-purple-50 text-purple-700 ring-purple-600/20",
  lost: "bg-red-50 text-red-700 ring-red-600/20",
  damaged: "bg-red-50 text-red-700 ring-red-600/20",

  // Borrow Request Statuses
  pending_approval: "bg-blue-50 text-blue-700 ring-blue-600/20",
  approved: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  issued: "bg-orange-50 text-orange-700 ring-orange-600/20",
  returned: "bg-green-50 text-green-700 ring-green-600/20",
  overdue: "bg-red-50 text-red-700 ring-red-600/20",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-500/20"
};

export function Badge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset",
        statusStyles[value] ?? "bg-slate-100 text-slate-700 ring-slate-500/20",
        className
      )}
    >
      {value}
    </span>
  );
}

