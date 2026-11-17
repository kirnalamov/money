"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BarChart3, Gauge, LineChart, ShieldCheck, Wallet } from "lucide-react";

const POINTS = [
  { icon: Wallet, key: "accounts", ru: "Все счета, карты и наличные в одном месте" },
  { icon: LineChart, key: "portfolio", ru: "Портфель с живыми ценами и дивидендами" },
  { icon: Gauge, key: "limits", ru: "Лимиты, цели и уведомления вовремя" },
  { icon: BarChart3, key: "analytics", ru: "Аналитика расходов и динамика капитала" },
];

/** Общая рамка входа и регистрации: слева о продукте, справа форма. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-screen bg-[#0E0F0E] text-[#F1F3EE] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-[#1E211D] bg-[linear-gradient(160deg,#171E10_0%,#0E0F0E_65%)] p-12 lg:flex">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#C6F24E]/[0.07] blur-3xl" />
        <Link href="/welcome" className="relative flex items-center gap-3 no-underline">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C6F24E] text-[#10170A]"><Wallet className="h-[22px] w-[22px]" strokeWidth={2} /></span>
          <span className="text-xl font-bold tracking-[-0.01em] text-[#F1F3EE]">Plutus</span>
        </Link>
        <div className="relative max-w-[460px]">
          <h2 className="text-[34px] font-bold leading-[1.15] tracking-[-0.02em]">{t("landing.auth_tagline", "Финансы под контролем — без таблиц и хаоса")}</h2>
          <ul className="mt-8 flex flex-col gap-4">
            {POINTS.map((p) => (
              <li key={p.key} className="flex items-center gap-3.5 text-[15px] text-[#C9CEC3]">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#C6F24E]/10 text-[#C6F24E]"><p.icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" /></span>
                {t(`landing.point_${p.key}`, p.ru)}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative flex items-center gap-2 text-[13px] text-[#8D9388]">
          <ShieldCheck className="h-4 w-4 text-[#6EE7A0]" aria-hidden="true" />
          {t("landing.auth_privacy", "Ваши данные хранятся только в вашем аккаунте")}
        </div>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/welcome" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#8D9388] no-underline hover:text-[#F1F3EE]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("landing.back", "На главную")}
          </Link>
          <Link href="/welcome" className="flex items-center gap-2.5 no-underline lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#C6F24E] text-[#10170A]"><Wallet className="h-[18px] w-[18px]" strokeWidth={2} /></span>
            <span className="text-base font-bold text-[#F1F3EE]">Plutus</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[420px]">
            <h1 className="text-[28px] font-bold tracking-[-0.02em]">{title}</h1>
            <p className="mt-1.5 text-[14.5px] text-[#8D9388]">{subtitle}</p>
            <div className="mt-7">{children}</div>
            <div className="mt-6 text-center text-sm text-[#8D9388]">{footer}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
