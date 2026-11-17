"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

/** Публичные страницы (лендинг, вход, регистрация) — без боковой панели и нижнего меню. */
const PUBLIC_ROUTES = ["/welcome", "/login", "/register"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <div className="min-h-screen">{children}</div>;
  }
  return (
    <div className="flex min-h-screen flex-col">
      <Sidebar />
      <main className="flex-1 md:pl-[232px] pb-16 md:pb-0">
        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-10 md:pt-8 md:pb-12">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}
