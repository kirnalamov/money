"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Briefcase,
  PiggyBank,
  Gauge,
  Settings,
  LogOut,
  Wallet
} from "lucide-react";
import { useTranslation } from "react-i18next";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { name: t("common.overview"), href: "/", icon: LayoutDashboard },
    { name: t("common.transactions"), href: "/transactions", icon: ArrowRightLeft },
    { name: t("common.portfolio"), href: "/portfolio", icon: Briefcase },
    { name: t("common.savings"), href: "/savings", icon: PiggyBank },
    { name: t("common.limits"), href: "/limits", icon: Gauge },
    { name: t("accounts.title"), href: "/accounts", icon: Wallet },
    { name: t("common.settings"), href: "/settings", icon: Settings },
  ];

  return (
    <div className="hidden border-r bg-card md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50">
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-6 mb-8">
          <h1 className="text-2xl font-bold text-primary">Plutus</h1>
        </div>
        <div className="flex flex-col flex-grow px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </div>
        <div className="p-4 mt-auto border-t">
           <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-muted hover:text-foreground transition-colors">
             <LogOut className="w-5 h-5 mr-3" />
             {t("common.sign_out")}
           </button>
        </div>
      </div>
    </div>
  );
}
