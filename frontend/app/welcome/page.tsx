"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  Check,
  CreditCard,
  Gauge,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const FEATURES = [
  { icon: CreditCard, key: "accounts", color: "#C4B5FD", title: "Все счета вместе", text: "Карты, наличные, накопительные и брокерские счета в разных валютах с пересчётом по курсу." },
  { icon: TrendingUp, key: "ops", color: "#6EE7A0", title: "Операции за секунды", text: "Расходы, доходы и переводы с категориями, метками и повторяющимися платежами." },
  { icon: Gauge, key: "limits", color: "#FBBF24", title: "Лимиты без сюрпризов", text: "Месячные, недельные и дневные лимиты по категориям с предупреждением при 80%." },
  { icon: PiggyBank, key: "goals", color: "#38BDF8", title: "Цели и накопления", text: "Сколько откладывать в месяц, чтобы успеть к сроку, и проценты по накопительным счетам." },
  { icon: Briefcase, key: "portfolio", color: "#C6F24E", title: "Портфель с живыми ценами", text: "Акции, облигации с НКД, ETF и крипта: цены, дивиденды, налоги и комиссии считаются сами." },
  { icon: BarChart3, key: "analytics", color: "#F9A8D4", title: "Аналитика капитала", text: "Динамика капитала, структура расходов, постоянные и переменные траты, прогноз на месяц." },
];

const STEPS = [
  { key: "s1", title: "Добавьте счета", text: "Укажите, где лежат деньги: займёт пару минут." },
  { key: "s2", title: "Записывайте траты", text: "Быстрое окно операции: сумма, категория, дата." },
  { key: "s3", title: "Следите за картиной", text: "Обзор, лимиты и уведомления покажут, что требует внимания." },
];

const btnPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#C6F24E] px-6 text-[15px] font-bold text-[#10170A] no-underline transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E0F0E]";
const btnGhost =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#2A2E27] bg-transparent px-6 text-[15px] font-semibold text-[#F1F3EE] no-underline transition hover:bg-[#151714] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]";

function PreviewCard() {
  // условный пример: ничего не загружается и не связано с данными пользователя
  const pts = [18, 24, 22, 30, 28, 36, 34, 44, 41, 52, 50, 64];
  const line = pts.map((v, i) => `${(i / (pts.length - 1)) * 100},${100 - v * 1.4}`).join(" ");
  return (
    <div aria-hidden="true" className="relative w-full max-w-[520px] rounded-[24px] border border-[#2A2E27] bg-[linear-gradient(135deg,#171E10_0%,#151714_60%)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
      <div className="flex items-center gap-2.5 text-sm text-[#C9CEC3]">
        Общий капитал
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6EE7A0]/[0.14] px-2.5 py-[3px] text-[12.5px] font-bold text-[#6EE7A0]">
          <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.4} /> +12,4%
        </span>
      </div>
      <div className="mt-1 text-[40px] font-bold leading-tight tracking-[-0.03em]">24 535 $</div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-4 h-[130px] w-full overflow-visible">
        <defs>
          <linearGradient id="lp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6EE7A0" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6EE7A0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lp-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="60%" stopColor="#6EE7A0" />
            <stop offset="100%" stopColor="#C6F24E" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${line} 100,100`} fill="url(#lp-fill)" />
        <polyline points={line} fill="none" stroke="url(#lp-stroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {[
          { l: "Свободно", v: "6 840 $", c: "#C6F24E" },
          { l: "Инвестиции", v: "15 200 $", c: "#38BDF8" },
          { l: "Накопления", v: "2 495 $", c: "#C4B5FD" },
        ].map((x) => (
          <div key={x.l} className="rounded-xl border border-[#232721] bg-[#121411] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11.5px] text-[#8D9388]"><span className="h-2 w-2 rounded-full" style={{ background: x.c }} />{x.l}</div>
            <div className="mt-0.5 text-[14px] font-bold">{x.v}</div>
          </div>
        ))}
      </div>
      <div className="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-2xl border border-[#F87171]/30 bg-[#151714] px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)] sm:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F87171] text-[#10170A]"><Bell className="h-4 w-4" strokeWidth={2.4} /></span>
        <div>
          <div className="text-[13px] font-semibold">Лимит «Еда» почти исчерпан</div>
          <div className="text-[12px] text-[#A2A89C]">Потрачено 84%</div>
        </div>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#0E0F0E] text-[#F1F3EE]">
      <header className="sticky top-0 z-40 border-b border-[#1E211D] bg-[#0E0F0E]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/welcome" className="flex items-center gap-2.5 no-underline">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#C6F24E] text-[#10170A]"><Wallet className="h-5 w-5" strokeWidth={2} /></span>
            <span className="text-[19px] font-bold tracking-[-0.01em] text-[#F1F3EE]">Plutus</span>
          </Link>
          <nav aria-label={t("landing.nav", "Разделы страницы")} className="hidden items-center gap-7 text-sm font-medium text-[#A2A89C] md:flex">
            <a href="#features" className="no-underline hover:text-[#F1F3EE]">{t("landing.nav_features", "Возможности")}</a>
            <a href="#how" className="no-underline hover:text-[#F1F3EE]">{t("landing.nav_how", "Как это работает")}</a>
          </nav>
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-[#C6F24E] px-4 text-sm font-bold text-[#10170A] no-underline hover:brightness-95">{t("landing.open_app", "Открыть приложение")}</Link>
            ) : (
              <>
                <Link href="/login" className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-[#F1F3EE] no-underline hover:bg-[#151714]">{t("auth.login", "Войти")}</Link>
                <Link href="/register" className="hidden h-10 items-center rounded-xl bg-[#C6F24E] px-4 text-sm font-bold text-[#10170A] no-underline hover:brightness-95 sm:inline-flex">{t("landing.start", "Начать")}</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-160px] h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-[#C6F24E]/[0.08] blur-3xl" />
          <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#2A2E27] bg-[#151714] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#C9CEC3]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#6EE7A0]" aria-hidden="true" />
                {t("landing.badge", "Личные финансы и инвестиции")}
              </span>
              <h1 className="mt-5 text-[44px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[56px]">
                {t("landing.h1_a", "Все ваши деньги")} <span className="bg-[linear-gradient(90deg,#6EE7A0,#C6F24E)] bg-clip-text text-transparent">{t("landing.h1_b", "в одном месте")}</span>
              </h1>
              <p className="mt-5 max-w-[540px] text-[17px] leading-relaxed text-[#A2A89C]">
                {t("landing.lead", "Счета, расходы, лимиты, цели и инвестиционный портфель с живыми ценами. Понятная картина капитала и уведомления, когда что-то идёт не так.")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {isAuthenticated ? (
                  <Link href="/" className={btnPrimary}>{t("landing.open_app", "Открыть приложение")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                ) : (
                  <>
                    <Link href="/register" className={btnPrimary}>{t("landing.cta", "Создать аккаунт")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                    <Link href="/login" className={btnGhost}>{t("auth.login", "Войти")}</Link>
                  </>
                )}
              </div>
              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-[#8D9388]">
                {[t("landing.perk1", "Бесплатно"), t("landing.perk2", "Рубли, доллары, евро, фунты"), t("landing.perk3", "Данные только в вашем аккаунте")].map((p) => (
                  <li key={p} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#6EE7A0]" aria-hidden="true" />{p}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center lg:justify-end"><PreviewCard /></div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-20 sm:px-8">
          <div className="max-w-[640px]">
            <h2 className="text-[32px] font-bold tracking-[-0.02em]">{t("landing.features_title", "Всё, что нужно для контроля над деньгами")}</h2>
            <p className="mt-3 text-[16px] text-[#8D9388]">{t("landing.features_sub", "Одно приложение вместо таблиц, заметок и десятка банковских кабинетов.")}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.key} className="rounded-[20px] border border-[#232721] bg-[#151714] p-6 transition-colors hover:border-[#2F352C]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${f.color}1F`, color: f.color }}>
                  <f.icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[17px] font-semibold">{t(`landing.f_${f.key}_title`, f.title)}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#8D9388]">{t(`landing.f_${f.key}_text`, f.text)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* HOW */}
        <section id="how" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 pb-20 sm:px-8">
          <h2 className="text-[32px] font-bold tracking-[-0.02em]">{t("landing.how_title", "Три шага до порядка в финансах")}</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.key} className="rounded-[20px] border border-[#232721] bg-[#121411] p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C6F24E] text-[15px] font-bold text-[#10170A]">{i + 1}</span>
                <h3 className="mt-4 text-[17px] font-semibold">{t(`landing.${s.key}_title`, s.title)}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#8D9388]">{t(`landing.${s.key}_text`, s.text)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-8">
          <div className="relative overflow-hidden rounded-[28px] border border-[#2A2E27] bg-[linear-gradient(135deg,#1A2410_0%,#151714_70%)] px-8 py-14 text-center sm:px-14">
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-[#C6F24E]/10 blur-3xl" />
            <h2 className="relative text-[32px] font-bold tracking-[-0.02em]">{t("landing.cta_title", "Начните с первого счёта")}</h2>
            <p className="relative mx-auto mt-3 max-w-[520px] text-[16px] text-[#A2A89C]">{t("landing.cta_sub", "Регистрация занимает меньше минуты. Всё остальное приложение подскажет само.")}</p>
            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <Link href={isAuthenticated ? "/" : "/register"} className={btnPrimary}>{isAuthenticated ? t("landing.open_app", "Открыть приложение") : t("landing.cta", "Создать аккаунт")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1E211D]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[13px] text-[#8D9388] sm:px-8">
          <span className="flex items-center gap-2"><Wallet className="h-4 w-4" aria-hidden="true" /> Plutus · {new Date().getFullYear()}</span>
          <span>{t("landing.footer", "Личные финансы и инвестиции")}</span>
        </div>
      </footer>
    </div>
  );
}
