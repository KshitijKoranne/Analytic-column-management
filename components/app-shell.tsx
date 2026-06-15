import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Archive,
  ClipboardCheck,
  FileClock,
  History,
  LogOut,
  PackageCheck,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions";
import { roleLabels } from "@/lib/labels";
import type { ModuleKey } from "@/lib/types";

const navItems: Array<{ key: ModuleKey; label: string; href: string; icon: React.ComponentType<{ size?: number }> }> = [
  { key: "masters", label: "Masters", href: "/masters", icon: SlidersHorizontal },
  { key: "receipt", label: "Receipt", href: "/receipt", icon: PackageCheck },
  { key: "issuance", label: "Issuance", href: "/issuance", icon: Send },
  { key: "performance", label: "Performance", href: "/performance", icon: ClipboardCheck },
  { key: "destruction", label: "Destruction", href: "/destruction", icon: Archive },
  { key: "reviews", label: "Reviews", href: "/reviews", icon: ShieldCheck },
  { key: "audit", label: "Audit", href: "/audit", icon: History },
  { key: "settings", label: "Settings", href: "/settings", icon: Settings }
];

export async function AppShell({
  active,
  title,
  children
}: {
  active: ModuleKey;
  title: string;
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">CM</span>
          <span>Column Management</span>
        </div>
        <nav className="nav">
          {navItems.map((item) => {
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
            <small>{roleLabels[(session.user.role ?? "auditor") as keyof typeof roleLabels] ?? session.user.role}</small>
          </div>
          <div className="user-menu">
            <FileClock size={15} />
            <span>{session.user.name ?? session.user.email}</span>
            <form action={logoutAction}>
              <button className="ghost-button" type="submit">
                <LogOut size={14} />
                Logout
              </button>
            </form>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
