"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Briefcase,
  PiggyBank,
  Settings,
  User
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/auth-context";

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  // Reduced to 5 core items for better mobile UX
  const navItems = [
    { name: t("common.overview"), href: "/", icon: LayoutDashboard },
    { name: t("common.transactions"), href: "/transactions", icon: ArrowRightLeft },
    { name: t("common.portfolio"), href: "/portfolio", icon: Briefcase },
    { name: t("common.savings"), href: "/savings", icon: PiggyBank },
    { name: t("common.settings"), href: "/settings", icon: Settings },
    { name: "My Profile", href: "/profile", icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t bg-card/95 backdrop-blur-sm md:hidden shadow-lg pb-safe"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 min-w-0 min-h-[56px] space-y-1 px-2 active:scale-95 transition-all touch-manipulation",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="w-6 h-6 flex-shrink-0" />
            <span className="text-[10px] xs:text-[11px] font-medium leading-tight text-center max-w-full truncate">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
