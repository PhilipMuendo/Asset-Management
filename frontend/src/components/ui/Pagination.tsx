interface PaginationProps {
  page: number;
  hasNextPage: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({ page, hasNextPage, onPrev, onNext }: PaginationProps) {
  return (
    <div className="flex items-center justify-between text-sm text-slate-500">
      <span>Page {page + 1}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page === 0}
          className="rounded border border-slate-200 px-3 py-1.5 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNextPage}
          className="rounded border border-slate-200 px-3 py-1.5 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
