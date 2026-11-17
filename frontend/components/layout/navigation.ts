import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  Briefcase,
  Gauge,
  LayoutDashboard,
  PiggyBank,
  Settings,
  User,
  Wallet,
} from "lucide-react";

export interface NavigationItem {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  mobilePrimary?: boolean;
}

export const navigationItems: NavigationItem[] = [
  { labelKey: "common.overview", href: "/", icon: LayoutDashboard, mobilePrimary: true },
  { labelKey: "common.transactions", href: "/transactions", icon: ArrowRightLeft, mobilePrimary: true },
  { labelKey: "common.portfolio", href: "/portfolio", icon: Briefcase, mobilePrimary: true },
  { labelKey: "common.savings", href: "/savings", icon: PiggyBank, mobilePrimary: true },
  { labelKey: "common.limits", href: "/limits", icon: Gauge },
  { labelKey: "common.accounts", href: "/accounts", icon: Wallet },
  { labelKey: "common.profile", href: "/profile", icon: User },
  { labelKey: "common.settings", href: "/settings", icon: Settings },
];

export function isNavigationItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
