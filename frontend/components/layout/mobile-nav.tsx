"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { isNavigationItemActive, navigationItems } from "./navigation";

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const primaryItems = navigationItems.filter((item) => item.mobilePrimary);
  const secondaryItems = navigationItems.filter((item) => !item.mobilePrimary);
  const isMoreActive = secondaryItems.some((item) => isNavigationItemActive(pathname, item.href));

  return (
    <nav
      aria-label={t("common.primary_navigation")}
      className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 border-t bg-card/95 backdrop-blur-sm md:hidden shadow-lg pb-safe"
    >
      {primaryItems.map((item) => {
        const isActive = isNavigationItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center min-w-0 min-h-[56px] space-y-1 px-2 active:scale-95 transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="text-[10px] font-medium leading-tight text-center max-w-full truncate">{t(item.labelKey)}</span>
          </Link>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "h-full min-h-[56px] rounded-none flex flex-col gap-1 px-2 text-muted-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
              isMoreActive && "text-primary"
            )}
            aria-label={t("common.more_navigation")}
            aria-expanded={undefined}
          >
            <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-medium leading-tight">{t("common.more")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="mb-2 min-w-48">
          <DropdownMenuLabel>{t("common.more_navigation")}</DropdownMenuLabel>
          {secondaryItems.map((item) => {
            const isActive = isNavigationItemActive(pathname, item.href);
            return (
              <DropdownMenuItem key={item.href} asChild className={cn(isActive && "bg-accent text-accent-foreground")}>
                <Link href={item.href} aria-current={isActive ? "page" : undefined}>
                  <item.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t(item.labelKey)}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
