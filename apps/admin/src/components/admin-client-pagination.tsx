"use client";

interface AdminClientPaginationProps {
  currentPage: number;
  labels: {
    first: string;
    previous: string;
    next: string;
    last: string;
    summary: string;
  };
  lastPage: number;
  onPageChange: (page: number) => void;
}

function PaginationButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-panel px-3 text-sm font-semibold hover:border-brand disabled:cursor-not-allowed disabled:text-muted disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function AdminClientPagination({
  currentPage,
  labels,
  lastPage,
  onPageChange,
}: AdminClientPaginationProps) {
  const safeCurrentPage = Math.max(1, currentPage);
  const safeLastPage = Math.max(1, lastPage);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-muted">{labels.summary}</p>
      <div className="flex flex-wrap items-center gap-2">
        <PaginationButton disabled={safeCurrentPage <= 1} onClick={() => onPageChange(1)}>
          {labels.first}
        </PaginationButton>
        <PaginationButton disabled={safeCurrentPage <= 1} onClick={() => onPageChange(safeCurrentPage - 1)}>
          {labels.previous}
        </PaginationButton>
        <span className="inline-flex h-9 min-w-12 items-center justify-center rounded-lg bg-background px-3 text-sm font-semibold text-foreground">
          {safeCurrentPage} / {safeLastPage}
        </span>
        <PaginationButton disabled={safeCurrentPage >= safeLastPage} onClick={() => onPageChange(safeCurrentPage + 1)}>
          {labels.next}
        </PaginationButton>
        <PaginationButton disabled={safeCurrentPage >= safeLastPage} onClick={() => onPageChange(safeLastPage)}>
          {labels.last}
        </PaginationButton>
      </div>
    </div>
  );
}
