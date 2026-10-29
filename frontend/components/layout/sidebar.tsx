"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import LogoutButton from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";
import { isNavigationItemActive, navigationItems } from "./navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="hidden border-r bg-card md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50">
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-6 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Plutus</h1>
        </div>
        <nav aria-label={t("common.primary_navigation")} className="flex flex-col flex-grow px-4 space-y-1">
          {navigationItems.map((item) => {
            const isActive = isNavigationItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all relative",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                  isActive
                    ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:rounded-r"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 mt-auto border-t space-y-2">
            <div className="px-3 pb-2">
              <p className="text-sm font-medium truncate">{user.full_name || user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              {user.is_superuser && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary mt-1">
                  {t("common.admin")}
                </span>
              )}
            </div>
            <LogoutButton />
          </div>
      </div>
    </div>
  );
}
