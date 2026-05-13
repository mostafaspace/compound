import Link from "next/link";

interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

interface AdminPaginationProps {
  basePath: string;
  meta: PaginationMeta;
  params?: Record<string, number | string | undefined>;
  labels: {
    first: string;
    previous: string;
    next: string;
    last: string;
    summary: string;
  };
}

function pageHref(basePath: string, params: AdminPaginationProps["params"], page: number): string {
  const query = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });

  if (page > 1) query.set("page", String(page));
  else query.delete("page");

  const queryString = query.toString();
  return `${basePath}${queryString ? `?${queryString}` : ""}`;
}

function PaginationLink({
  children,
  disabled,
  href,
}: {
  children: React.ReactNode;
  disabled: boolean;
  href: string;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold text-muted opacity-60">
        {children}
      </span>
    );
  }

  return (
    <Link
      className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-panel px-3 text-sm font-semibold hover:border-brand"
      href={href}
    >
      {children}
    </Link>
  );
}

export function AdminPagination({ basePath, labels, meta, params }: AdminPaginationProps) {
  const currentPage = Math.max(1, meta.current_page || 1);
  const lastPage = Math.max(1, meta.last_page || 1);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-muted">{labels.summary}</p>
      <div className="flex flex-wrap items-center gap-2">
        <PaginationLink disabled={currentPage <= 1} href={pageHref(basePath, params, 1)}>
          {labels.first}
        </PaginationLink>
        <PaginationLink disabled={currentPage <= 1} href={pageHref(basePath, params, currentPage - 1)}>
          {labels.previous}
        </PaginationLink>
        <span className="inline-flex h-9 min-w-12 items-center justify-center rounded-lg bg-background px-3 text-sm font-semibold text-foreground">
          {currentPage} / {lastPage}
        </span>
        <PaginationLink disabled={currentPage >= lastPage} href={pageHref(basePath, params, currentPage + 1)}>
          {labels.next}
        </PaginationLink>
        <PaginationLink disabled={currentPage >= lastPage} href={pageHref(basePath, params, lastPage)}>
          {labels.last}
        </PaginationLink>
      </div>
    </div>
  );
}
