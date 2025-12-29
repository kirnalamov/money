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
  Settings
} from "lucide-react";
import { useTranslation } from "react-i18next";

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { name: t("common.overview"), href: "/", icon: LayoutDashboard },
    { name: t("common.transactions"), href: "/transactions", icon: ArrowRightLeft },
    { name: t("common.portfolio"), href: "/portfolio", icon: Briefcase },
    { name: t("common.savings"), href: "/savings", icon: PiggyBank },
    { name: t("common.limits"), href: "/limits", icon: Gauge },
    { name: t("common.settings"), href: "/settings", icon: Settings },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between h-16 border-t bg-card md:hidden px-0 shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 min-w-0 h-full space-y-0.5 px-0.5 active:opacity-70 transition-opacity touch-manipulation",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] xs:text-[10px] font-medium leading-tight text-center max-w-full truncate px-0.5">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
