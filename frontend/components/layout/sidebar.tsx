"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  ArrowRightLeft,
  Briefcase,
  DollarSign,
  Gauge,
  SlidersHorizontal,
  Wallet,
  CreditCard,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();

  const navItems = [
    { name: t("common.overview"), href: "/", icon: LayoutGrid },
    { name: t("common.transactions"), href: "/transactions", icon: ArrowRightLeft },
    { name: t("common.portfolio"), href: "/portfolio", icon: Briefcase },
    { name: t("common.savings"), href: "/savings", icon: DollarSign },
    { name: t("common.limits"), href: "/limits", icon: Gauge },
    { name: t("accounts.title"), href: "/accounts", icon: CreditCard },
    { name: t("common.settings"), href: "/settings", icon: SlidersHorizontal },
  ];


  const initial = (user?.full_name || user?.username || "U").charAt(0).toUpperCase();

  return (
    <div className="hidden md:flex md:w-[232px] md:flex-col md:fixed md:inset-y-0 z-50 border-r border-[#1E211D] bg-[#0E0F0E]">
      <div className="flex flex-col flex-grow gap-7 pt-7 px-4 pb-5 overflow-y-auto no-scrollbar">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#C6F24E] text-[#10170A]">
            <Wallet className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="text-[19px] font-bold tracking-[-0.01em] text-[#F1F3EE]">
            Plutus
          </span>
        </div>

        {/* Nav */}
        <nav aria-label="Main menu">
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm no-underline transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C6F24E] focus-visible:outline-offset-2",
                    isActive
                      ? "bg-[#1B1E1A] font-semibold text-[#F1F3EE] shadow-[inset_3px_0_0_#C6F24E]"
                      : "font-medium text-[#A2A89C] hover:bg-[#151714] hover:text-[#F1F3EE]"
                  )}
                >
                  <item.icon
                    className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "text-[#C6F24E]")}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User card → profile */}
        {isAuthenticated && user && (
          <Link
            href="/profile"
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={cn(
              "mt-auto flex items-center gap-3 rounded-xl border border-[#232721] p-3 text-inherit no-underline transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C6F24E] focus-visible:outline-offset-2",
              pathname === "/profile"
                ? "bg-[#1B1E1A] shadow-[inset_3px_0_0_#C6F24E]"
                : "bg-[#151714] hover:bg-[#1B1E1A]"
            )}
          >
            <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-[#C6F24E] font-bold text-[#10170A]">
              {initial}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13.5px] font-semibold text-[#F1F3EE]">
                {user.full_name || user.username}
              </span>
              <span className="truncate text-xs text-[#8D9388]">
                {t("profile.my_profile", "Мой профиль")}
              </span>
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
