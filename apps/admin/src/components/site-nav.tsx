import Link from "next/link";
import { useTranslations } from "next-intl";

interface Crumb {
  label: string;
  href?: string;
}

interface SiteNavProps {
  breadcrumb?: Crumb[];
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5 shrink-0 text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4l4 4-4 4" />
    </svg>
  );
}

export function SiteNav({ breadcrumb = [] }: SiteNavProps) {
  const t = useTranslations("Navigation");
  return (
    <nav className="border-b border-line bg-panel/50">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-5 py-3 lg:px-8">
        {/* Breadcrumb start */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-sm font-medium text-muted hover:text-brand transition-colors"
          >
            {t("dashboard")}
          </Link>
        </div>

        {/* Breadcrumb path */}
        {breadcrumb.map((crumb, i) => (
          <div key={i} className="flex items-center gap-2">
            <ChevronIcon />
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-sm text-muted hover:text-foreground transition-colors truncate max-w-[180px]"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{crumb.label}</span>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
