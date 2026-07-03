import Link from "next/link";
import { SearchX } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { canAccess, getAccessContext } from "@/lib/access";
import { getGlobalSearchResults } from "@/lib/data";
import { moduleLabels } from "@/lib/labels";
import type { ModuleKey, Permission } from "@/lib/types";

export const dynamic = "force-dynamic";

const readPermissionByModule: Record<string, Permission> = {
  masters: "masters:read",
  receipt: "receipt:read",
  issuance: "issuance:read",
  performance: "performance:read",
  destruction: "destruction:read"
};

export default async function SearchPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await getAccessContext();
  const params = await searchParams;
  const query = typeof params?.q === "string" ? params.q.trim() : "";
  const allowedModules = (Object.keys(readPermissionByModule) as ModuleKey[]).filter((module) =>
    canAccess(access, readPermissionByModule[module])
  );
  const results = query ? await getGlobalSearchResults(query, allowedModules) : [];

  return (
    <AppShell active="search" title="Search">
      <section className="module-shell">
        <div className="module-toolbar">
          <div className="toolbar-left">
            <span>{query ? `Results for "${query}"` : "Search across all modules"}</span>
          </div>
        </div>
        <div className="detail-panel">
          {!query ? (
            <div className="empty-detail">Use the search box above to find a column across Receipt, Issuance, Performance, and Destruction.</div>
          ) : results.length ? (
            <div className="search-results">
              {results.map((record) => (
                <Link className="search-result-row" href={`/${record.module}?record=${record.id}`} key={`${record.module}:${record.id}`}>
                  <div>
                    <span className="search-result-module">{moduleLabels[record.module]}</span>
                    <p className="record-title">{record.title}</p>
                    <div className="record-subtitle">{record.subtitle}</div>
                  </div>
                  <StatusBadge label={record.statusLabel} status={record.status} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-detail">
              <span className="empty-detail-icon">
                <SearchX size={18} />
                No records match "{query}".
              </span>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
