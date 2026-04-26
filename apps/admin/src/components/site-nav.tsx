import Link from "next/link";
import { LogoutButton } from "./logout-button";

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
  return (
    <nav className="sticky top-0 z-20 border-b border-line bg-panel/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-5 py-3 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="text-sm font-bold text-brand hover:text-brand-strong transition-colors shrink-0"
        >
          Compound
        </Link>

        {/* Breadcrumb */}
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

        <div className="ml-auto">
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
