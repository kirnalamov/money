"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import LogoutButton from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { PanelLeftClose, PanelLeftOpen, Wallet } from "lucide-react";
import { isNavigationItemActive, navigationItems } from "./navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const isCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
    setCollapsed(isCollapsed);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", collapsed ? "5rem" : "225px");
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  return (
    <aside className="hidden border-r bg-background transition-[width] duration-200 md:fixed md:inset-y-0 md:z-50 md:flex md:flex-col" style={{ width: collapsed ? "5rem" : "225px" }}>
      <div className="flex flex-col flex-grow overflow-y-auto pt-6">
        <div className={cn("mb-12 flex h-[42px] flex-shrink-0 items-center", collapsed ? "justify-center px-3" : "px-7")}>
          <div className={cn("flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-primary", !collapsed && "mr-3")}>
            <Wallet className="h-6 w-6 text-primary-foreground" />
          </div>
          {!collapsed && <h1 className="text-xl font-bold tracking-tight text-primary">Plutus</h1>}
        </div>
        <div className="sr-only">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={t(collapsed ? "common.expand_sidebar" : "common.collapse_sidebar")}
            title={t(collapsed ? "common.expand_sidebar" : "common.collapse_sidebar")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <nav aria-label={t("common.primary_navigation")} className={cn("flex flex-grow flex-col space-y-1", collapsed ? "px-3" : "px-3")}>
          {navigationItems.map((item) => {
            const isActive = isNavigationItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={collapsed ? t(item.labelKey) : undefined}
                title={collapsed ? t(item.labelKey) : undefined}
                className={cn(
                  "group relative flex h-[50px] items-center rounded-[14px] px-4 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                  isActive
                    ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:rounded-r"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0 transition-colors",
                    !collapsed && "mr-3",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                />
                {!collapsed && t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className={cn("mt-auto flex border-t p-4", collapsed ? "justify-center" : "flex-col gap-2")}>
          {!collapsed && (
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">{(user.full_name || user.username).charAt(0).toUpperCase()}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.full_name || user.username}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                {user.is_superuser && (
                  <span className="mt-1 inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {t("common.admin")}
                  </span>
                )}
              </div>
            </div>
          )}
          <LogoutButton collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}
