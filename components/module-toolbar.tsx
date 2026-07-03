import Link from "next/link";
import { Search as SearchIcon, X } from "lucide-react";
import type { ReactNode } from "react";
import { hrefWith } from "@/lib/url";

export type ToolbarSegment = { key: string; label: string; active: boolean; href: string };

export type ToolbarSearch = {
  basePath: string;
  query: string;
  placeholder: string;
  hiddenFields?: Record<string, string | undefined>;
};

export function ModuleToolbar({
  segments,
  label,
  search,
  action
}: {
  segments?: ToolbarSegment[];
  label?: string;
  search?: ToolbarSearch;
  action?: ReactNode;
}) {
  return (
    <div className="module-toolbar">
      <div className="toolbar-left">
        <div className="segment">
          {segments
            ? segments.map((segment) => (
                <Link className={segment.active ? "active" : ""} href={segment.href} key={segment.key}>
                  {segment.label}
                </Link>
              ))
            : label
              ? <span>{label}</span>
              : null}
        </div>
        {search ? (
          <form action={search.basePath} className="toolbar-search">
            {Object.entries(search.hiddenFields ?? {}).map(([name, value]) =>
              value ? <input key={name} name={name} type="hidden" value={value} /> : null
            )}
            <button aria-label="Search" className="search-submit" type="submit">
              <SearchIcon size={14} />
            </button>
            <input aria-label={search.placeholder} defaultValue={search.query} name="q" placeholder={search.placeholder} type="search" />
            {search.query ? (
              <Link aria-label="Clear search" className="search-clear" href={hrefWith(search.basePath, search.hiddenFields ?? {})}>
                <X size={13} />
              </Link>
            ) : null}
          </form>
        ) : null}
      </div>
      {action}
    </div>
  );
}
