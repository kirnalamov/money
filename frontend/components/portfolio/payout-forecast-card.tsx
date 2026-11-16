"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { Calendar, Loader2 } from "lucide-react";
import { Currency } from "@/types";
import { PayoutEvent } from "@/lib/payouts";
import { SecurityLogo } from "@/components/portfolio/security-logo";
import { fmtMoney, fmtNum } from "@/lib/plutus-format";
import { cn } from "@/lib/utils";

const LOGO_PALETTE = ["#4ADE80", "#7DD3FC", "#C4B5FD", "#F87171", "#FBBF24", "#F9A8D4", "#5EEAD4", "#A3E635"];
function logoColor(symbol: string): string {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return LOGO_PALETTE[h % LOGO_PALETTE.length];
}

interface Props {
  months: { label: string; full: string }[];
  byMonth: PayoutEvent[][];
  events: PayoutEvent[];
  totalValue: number;
  currency: Currency;
  taxPct: number;
  loading: boolean;
}

export function PayoutForecastCard({
  months,
  byMonth,
  events,
  totalValue,
  currency,
  taxPct,
  loading,
}: Props) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("ru") ? ru : enUS;
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  const view = useMemo(() => {
    const dv = byMonth.map((l) => l.filter((e) => e.kind === "dividend").reduce((s, e) => s + e.net, 0));
    const cp = byMonth.map((l) => l.filter((e) => e.kind === "coupon").reduce((s, e) => s + e.net, 0));
    const mt = dv.map((v, i) => v + cp[i]);
    const mx = Math.max(...mt, 1);
    const rawStep = mx / 3;
    const pw = Math.pow(10, Math.floor(Math.log10(rawStep)));
    let st = pw * 10;
    for (const k of [1, 2, 2.5, 5, 10]) {
      if (k * pw >= rawStep) {
        st = k * pw;
        break;
      }
    }
    const top = st * Math.ceil(mx / st) || 1;
    const yTicks: { top: number; label: string }[] = [];
    for (let v = 0; v <= top + 1e-6; v += st) {
      yTicks.push({ top: 100 - (v / top) * 100, label: v === 0 ? "0" : fmtNum(v).replace(",00", "") });
    }
    const net = events.reduce((s, e) => s + e.net, 0);
    const gross = events.reduce((s, e) => s + e.gross, 0);
    return {
      dv,
      cp,
      mt,
      top,
      yTicks,
      net,
      gross,
      divSum: dv.reduce((s, v) => s + v, 0),
      cpnSum: cp.reduce((s, v) => s + v, 0),
    };
  }, [byMonth, events]);

  const active = pinned ?? hover;
  const upcoming = events.slice(0, 5);
  const kindLabel = (k: "dividend" | "coupon") =>
    k === "dividend" ? t("portfolio.dividend", "Дивиденд") : t("portfolio.coupon", "Купон");

  return (
    <section className="overflow-hidden rounded-[20px] border border-[#232721] bg-[#151714]">
      <div className="flex items-start gap-3.5 border-b border-[#232721] px-7 py-6">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-[#1E211C] text-[#C6F24E]">
          <Calendar className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="text-xl font-semibold">
            {t("portfolio.income_title", "Дивиденды и купоны")}
          </h2>
          <p className="mt-1 text-sm text-[#8D9388]">
            {t(
              "portfolio.income_desc2",
              "Прогноз строится по реальной истории выплат ваших бумаг: объявленные выплаты и прошлогодние, перенесённые на год вперёд. Это оценка, а не гарантия."
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-8 p-7">
        <div className="min-w-0 flex-[999_1_520px]">
          <div className="mb-7 flex flex-wrap items-end gap-x-12 gap-y-5">
            <div>
              <div className="text-[13px] font-medium text-[#8D9388]">
                {t("portfolio.income_expected_net", "Ожидается за 12 месяцев (после налога)")}
              </div>
              <div className="mt-1 flex items-center gap-3 text-4xl font-bold leading-[1.15] tracking-[-0.02em]">
                {fmtMoney(view.net, currency)}
                {loading && <Loader2 className="h-5 w-5 animate-spin text-[#8D9388]" />}
              </div>
              <div className="mt-0.5 text-[13px] text-[#8D9388]">
                {t("portfolio.before_tax", "до налога")} {fmtMoney(view.gross, currency)} ·{" "}
                {t("portfolio.tax_word", "налог")} {taxPct}%
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-[13px] text-[#8D9388]">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-[#C6F24E]" />
                {t("portfolio.dividends", "Дивиденды")}
              </div>
              <div className="mt-1 text-xl font-semibold">
                {view.divSum > 0 ? fmtMoney(view.divSum, currency) : "—"}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-[13px] text-[#8D9388]">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-[#7DD3FC]" />
                {t("portfolio.coupons", "Купоны")}
              </div>
              <div className="mt-1 text-xl font-semibold">
                {view.cpnSum > 0 ? fmtMoney(view.cpnSum, currency) : "—"}
              </div>
            </div>
            <div>
              <div className="text-[13px] text-[#8D9388]">
                {t("portfolio.to_value", "К стоимости позиций")}
              </div>
              <div className="mt-1 text-xl font-semibold">
                {totalValue > 0
                  ? `≈ ${((view.net / totalValue) * 100).toFixed(1).replace(".", ",")}% ${t("portfolio.per_year", "в год")}`
                  : "—"}
              </div>
            </div>
          </div>

          <div className="relative ml-12 mt-9 h-[240px]" onMouseLeave={() => setHover(null)}>
            {view.yTicks.map((yk, i) => (
              <div key={i}>
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-[#232721]"
                  style={{ top: `${yk.top}%` }}
                />
                <div
                  className="absolute -left-12 w-10 -translate-y-1/2 text-right text-xs text-[#8D9388]"
                  style={{ top: `${yk.top}%` }}
                >
                  {yk.label}
                </div>
              </div>
            ))}
            {months.map((m, i) => {
              const h = (view.mt[i] / view.top) * 100;
              return (
                <button
                  key={i}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onClick={() => setPinned(pinned === i ? null : i)}
                  aria-label={`${m.full}: ${fmtNum(view.mt[i])}`}
                  className="absolute bottom-0 top-0 flex cursor-pointer flex-col items-center justify-end border-0 bg-transparent p-0"
                  style={{ left: `${(i / 12) * 100}%`, width: `${100 / 12}%` }}
                >
                  {view.mt[i] > 0 && (
                    <span className="pb-1 text-[11.5px] font-semibold text-[#C9CEC3]">
                      {fmtNum(view.mt[i])}
                    </span>
                  )}
                  <div
                    className={cn(
                      "flex w-[56%] flex-col justify-end transition-opacity",
                      active != null && active !== i && "opacity-50"
                    )}
                    style={{ height: `${h}%` }}
                  >
                    <div className="rounded-t bg-[#7DD3FC]" style={{ flex: `${view.cp[i]} 1 0%` }} />
                    <div className="rounded-t bg-[#C6F24E]" style={{ flex: `${view.dv[i]} 1 0%` }} />
                  </div>
                </button>
              );
            })}

            {active != null && (
              <div
                className="pointer-events-none absolute z-10 w-64 -translate-x-1/2 rounded-xl border border-[#2A2E27] bg-[#0E0F0E] p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                style={{
                  left: `${Math.min(88, Math.max(12, ((active + 0.5) / 12) * 100))}%`,
                  bottom: `${Math.min((view.mt[active] / view.top) * 100 + 14, 62)}%`,
                }}
              >
                <div className="text-[13px] font-semibold">{months[active].full}</div>
                {byMonth[active].length === 0 ? (
                  <div className="mt-1.5 text-[13px] text-[#8D9388]">
                    {t("portfolio.no_payouts_month", "Выплат не ожидается")}
                  </div>
                ) : (
                  <>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {byMonth[active].slice(0, 6).map((e) => (
                        <div key={e.key} className="flex items-center justify-between gap-3 text-[13px]">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="h-2 w-2 flex-none rounded-[2px]"
                              style={{ background: e.kind === "dividend" ? "#C6F24E" : "#7DD3FC" }}
                            />
                            <span className="truncate font-semibold">{e.symbol}</span>
                            <span className="text-xs text-[#8D9388]">
                              {kindLabel(e.kind)}
                              {e.estimated ? " · ~" : ""}
                            </span>
                          </span>
                          <span className="flex-none font-semibold text-[#6EE7A0]">
                            +{fmtNum(e.net)}
                          </span>
                        </div>
                      ))}
                      {byMonth[active].length > 6 && (
                        <div className="text-xs text-[#8D9388]">
                          +{byMonth[active].length - 6} {t("portfolio.more", "ещё")}
                        </div>
                      )}
                    </div>
                    <div className="mt-2.5 flex justify-between border-t border-[#232721] pt-2 text-xs text-[#8D9388]">
                      <span>
                        {t("portfolio.before_tax", "до налога")}{" "}
                        {fmtNum(byMonth[active].reduce((s, e) => s + e.gross, 0))}
                      </span>
                      <span className="font-semibold text-[#F1F3EE]">
                        {t("portfolio.total_word", "Итого")}{" "}
                        {fmtMoney(view.mt[active], currency)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="relative ml-12 mt-2 h-[22px]">
            {months.map((m, i) => (
              <span
                key={i}
                className="absolute top-0 text-center text-xs text-[#8D9388]"
                style={{ left: `${(i / 12) * 100}%`, width: `${100 / 12}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <p className="ml-12 mt-2.5 text-[12.5px] text-[#8D9388]">
            {t(
              "portfolio.income_note2",
              "Суммы после налога по текущему курсу. «~» — запасная оценка там, где история выплат недоступна. Нажмите на столбец, чтобы закрепить подсказку."
            )}
          </p>
        </div>

        <div className="min-w-0 max-w-[400px] flex-[1_1_320px]">
          <h3 className="mb-2 text-base font-semibold">
            {t("portfolio.upcoming", "Ближайшие выплаты")}
          </h3>
          <div className="flex flex-col">
            {upcoming.map((u) => {
              const lc = logoColor(u.symbol);
              return (
                <div key={u.key} className="flex items-center gap-3 border-b border-[#1E211C] py-3">
                  <SecurityLogo
                    key={u.symbol}
                    symbol={u.symbol}
                    hint={u.unitCurrency === "RUB" ? "moex" : "global"}
                    size={36}
                    radius={10}
                    color={lc}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-semibold">{u.symbol}</span>
                    <span className="text-[12.5px] text-[#8D9388]">
                      {kindLabel(u.kind)} ·{" "}
                      {u.estimated
                        ? format(new Date(u.date), "LLL yyyy", { locale: dateLocale })
                        : format(new Date(u.date), "d MMM yyyy", { locale: dateLocale })}
                      {u.announced ? ` · ${t("portfolio.announced", "объявлено")}` : ""}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="font-semibold text-[#6EE7A0]">+{fmtMoney(u.net, currency)}</span>
                    <span className="text-xs text-[#8D9388]">
                      {u.perUnit > 0
                        ? `${fmtNum(u.qty, u.qty % 1 ? 2 : 0)} × ${fmtNum(u.perUnit)}`
                        : `${fmtNum(u.qty, u.qty % 1 ? 2 : 0)} × ${u.symbol}`}
                    </span>
                  </span>
                </div>
              );
            })}
            {upcoming.length === 0 && (
              <div className="py-3 text-[13px] text-[#8D9388]">
                {loading
                  ? t("portfolio.loading_payouts", "Загружаем историю выплат…")
                  : t("portfolio.no_payouts", "Выплат пока не ожидается")}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
