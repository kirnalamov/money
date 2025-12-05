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
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 border-t bg-card md:hidden pb-safe">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
