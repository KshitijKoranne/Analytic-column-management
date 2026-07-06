import Link from "next/link";
import {
  Archive,
  ClipboardCheck,
  FileBarChart,
  FileClock,
  History,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";
import { logoutAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { canAccess, getAccessContext } from "@/lib/access";
import { roleLabels } from "@/lib/labels";
import type { ModuleKey, Permission } from "@/lib/types";

type NavKey = ModuleKey | "dashboard" | "reports";

const navItems: Array<{ key: NavKey; label: string; href: string; icon: React.ComponentType<{ size?: number }>; permission?: Permission }> = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "masters", label: "Masters", href: "/masters", icon: SlidersHorizontal, permission: "masters:read" },
  { key: "receipt", label: "Receipt", href: "/receipt", icon: PackageCheck, permission: "receipt:read" },
  { key: "issuance", label: "Issuance", href: "/issuance", icon: Send, permission: "issuance:read" },
  { key: "performance", label: "Performance", href: "/performance", icon: ClipboardCheck, permission: "performance:read" },
  { key: "destruction", label: "Destruction", href: "/destruction", icon: Archive, permission: "destruction:read" },
  { key: "reviews", label: "Reviews", href: "/reviews", icon: ShieldCheck, permission: "reviews:read" },
  { key: "reports", label: "Reports", href: "/reports", icon: FileBarChart, permission: "reports:read" },
  { key: "audit", label: "Audit", href: "/audit", icon: History, permission: "audit:read" },
  { key: "settings", label: "Settings", href: "/settings", icon: Settings, permission: "settings:read" }
];

function humanizeRole(roleKey: string) {
  return roleLabels[roleKey] ?? roleKey.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function AppShell({
  active,
  title,
  children
}: {
  active: NavKey;
  title: string;
  children: React.ReactNode;
}) {
  const user = await getAccessContext();
  const visibleNavItems = navItems.filter((item) => !item.permission || canAccess(user, item.permission));
  const primaryRole = humanizeRole(user.roles[0] ?? "admin");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">CM</span>
          <span>Column Management</span>
        </div>
        <nav className="nav">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.key} className={`nav-link ${active === item.key ? "active" : ""}`} href={item.href}>
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{title}</h1>
          </div>
          <div className="user-menu">
            <div className="user-identity">
              <FileClock size={15} />
              <div className="user-identity-text">
                <span>{user.name ?? user.email}</span>
                <small>{primaryRole}</small>
              </div>
            </div>
            <Link className="ghost-button" href="/change-password">
              Change password
            </Link>
            <form action={logoutAction}>
              <SubmitButton className="ghost-button" pendingLabel="Logging out…">
                <LogOut size={14} />
                Logout
              </SubmitButton>
            </form>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
