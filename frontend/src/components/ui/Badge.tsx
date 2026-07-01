import { cn } from "../../utils/cn";

const statusStyles: Record<string, string> = {
  active: "bg-green-50 text-green-700 ring-green-600/20",
  suspended: "bg-orange-50 text-orange-700 ring-orange-600/20",
  archived: "bg-slate-100 text-slate-600 ring-slate-500/20",
  admin: "bg-blue-50 text-blue-700 ring-blue-600/20",
  staff: "bg-slate-100 text-slate-700 ring-slate-500/20"
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

