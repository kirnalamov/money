"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { addMonths, format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useStore } from "@/lib/store";
import { convertCurrency, formatPercent } from "@/lib/utils";
import { formatAmount } from "@/components/transactions/money";
import { estimatePayments, logoColor } from "./estimates";

// Прогноз дивидендов и купонов на 12 месяцев вперёд (оценка на этапе дизайна).
export function IncomeForecastCard() {
    const { t, i18n } = useTranslation();
    const { positions, defaultCurrency } = useStore();
    const locale = i18n.language;
    const dateLocale = locale.startsWith("ru") ? ru : enUS;

    const data = useMemo(() => {
        const valued = positions.map(position => ({
            position,
            value: convertCurrency(position.quantity * position.currentPrice, position.currency, defaultCurrency),
        }));
        const events = estimatePayments(valued);
        const dividends = Array.from({ length: 12 }, () => 0);
        const coupons = Array.from({ length: 12 }, () => 0);
        for (const event of events) {
            if (event.kind === "div") dividends[event.monthIndex] += event.amount;
            else coupons[event.monthIndex] += event.amount;
        }
        const totals = dividends.map((v, i) => v + coupons[i]);
        const max = Math.max(...totals, 1);
        // «Красивый» шаг сетки по оси Y.
        const rawStep = max / 3;
        const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
        let step = pow * 10;
        for (const k of [1, 2, 2.5, 5, 10]) { if (k * pow >= rawStep) { step = k * pow; break; } }
        const top = step * Math.ceil(max / step);
        const ticks: { top: number; value: number }[] = [];
        for (let v = 0; v <= top + 1e-6; v += step) ticks.push({ top: 100 - (v / top) * 100, value: v });
        const totalValue = valued.reduce((sum, item) => sum + item.value, 0);
        const divSum = dividends.reduce((a, b) => a + b, 0);
        const cpnSum = coupons.reduce((a, b) => a + b, 0);
        const upcoming = [...events].sort((a, b) => a.monthIndex - b.monthIndex || b.amount - a.amount).slice(0, 5);
        return { dividends, coupons, totals, top, ticks, divSum, cpnSum, yearSum: divSum + cpnSum, totalValue, upcoming };
    }, [positions, defaultCurrency]);

    const start = addMonths(new Date(), 1);
    const monthShort = (index: number) => format(addMonths(start, index), "LLL", { locale: dateLocale }).replace(".", "");
    const monthFull = (index: number) => {
        const label = format(addMonths(start, index), "LLL yyyy", { locale: dateLocale }).replace(".", "");
        return label.charAt(0).toUpperCase() + label.slice(1);
    };

    return (
        <section aria-label={t("portfolio.income.title")} className="overflow-hidden rounded-[20px] border border-[#232721] bg-[#151714] text-[#F1F3EE]">
            <div className="flex items-start gap-3.5 border-b border-[#232721] px-7 py-6">
                <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#1E211C] text-[#C6F24E]"><CalendarDays className="h-[18px] w-[18px]" /></span>
                <div>
                    <h2 className="text-base font-semibold">{t("portfolio.income.title")}</h2>
                    <p className="mt-1 text-[13.5px] text-[#8D9388]">{t("portfolio.income.desc")}</p>
                </div>
            </div>

            {data.yearSum <= 0 ? (
                <p className="px-7 py-10 text-sm text-[#8D9388]">{t("portfolio.income.empty")}</p>
            ) : (
                <div className="flex flex-wrap items-start gap-8 p-7">
                    <div className="min-w-0 flex-[999_1_520px]">
                        <div className="mb-7 flex flex-wrap items-end gap-x-12 gap-y-5">
                            <div>
                                <div className="text-[13px] font-medium text-[#8D9388]">{t("portfolio.income.expected")}</div>
                                <div className="mt-1 text-4xl font-bold leading-[1.15] tracking-[-0.02em] tabular-nums">{formatAmount(data.yearSum, defaultCurrency, locale)}</div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-[13px] text-[#8D9388]"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px] bg-[#C6F24E]" />{t("portfolio.income.dividends")}</div>
                                <div className="mt-1 text-xl font-semibold tabular-nums">{data.divSum > 0 ? formatAmount(data.divSum, defaultCurrency, locale) : "—"}</div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-[13px] text-[#8D9388]"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px] bg-[#7DD3FC]" />{t("portfolio.income.coupons")}</div>
                                <div className="mt-1 text-xl font-semibold tabular-nums">{data.cpnSum > 0 ? formatAmount(data.cpnSum, defaultCurrency, locale) : "—"}</div>
                            </div>
                            <div>
                                <div className="text-[13px] text-[#8D9388]">{t("portfolio.income.to_value")}</div>
                                <div className="mt-1 text-xl font-semibold tabular-nums">{t("portfolio.income.per_year", { percent: formatPercent(data.totalValue > 0 ? (data.yearSum / data.totalValue) * 100 : 0, locale, false, 1) })}</div>
                            </div>
                        </div>

                        <div className="relative ml-12 mt-7 h-[220px]">
                            {data.ticks.map(tick => (
                                <div key={tick.value} aria-hidden="true">
                                    <div className="absolute left-0 right-0 border-t border-dashed border-[#232721]" style={{ top: `${tick.top}%` }} />
                                    <div className="absolute w-10 -translate-y-1/2 text-right text-xs text-[#8D9388]" style={{ top: `${tick.top}%`, left: -48 }}>{tick.value === 0 ? "0" : new Intl.NumberFormat(locale.startsWith("ru") ? "ru-RU" : "en-US", { maximumFractionDigits: 0 }).format(tick.value)}</div>
                                </div>
                            ))}
                            {data.totals.map((totalMonth, i) => (
                                <div key={i} className="absolute bottom-0 top-0 flex flex-col items-center justify-end" style={{ left: `${(i / 12) * 100}%`, width: `${100 / 12}%` }}>
                                    {totalMonth > 0 && <span className="pb-1 text-[11.5px] font-semibold tabular-nums text-[#C9CEC3]">{new Intl.NumberFormat(locale.startsWith("ru") ? "ru-RU" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalMonth)}</span>}
                                    <div className="flex w-[56%] flex-col justify-end" style={{ height: `${(totalMonth / data.top) * 100}%` }}>
                                        <div className="rounded-t bg-[#7DD3FC]" style={{ flex: `${data.coupons[i]} 1 0%` }} />
                                        <div className="rounded-t bg-[#C6F24E]" style={{ flex: `${data.dividends[i]} 1 0%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="relative ml-12 mt-2 h-[22px]">
                            {data.totals.map((_, i) => (
                                <span key={i} className="absolute top-0 text-center text-xs text-[#8D9388]" style={{ left: `${(i / 12) * 100}%`, width: `${100 / 12}%` }}>{monthShort(i)}</span>
                            ))}
                        </div>
                        <p className="ml-12 mt-2.5 text-[12.5px] text-[#8D9388]">{t("portfolio.income.note")}</p>
                    </div>

                    <div className="min-w-0 max-w-[400px] flex-[1_1_320px]">
                        <h3 className="mb-2 text-sm font-semibold">{t("portfolio.income.upcoming")}</h3>
                        <div className="flex flex-col">
                            {data.upcoming.map((event, index) => {
                                const color = logoColor(event.position.symbol);
                                const perUnit = event.position.quantity > 0 ? event.amount / event.position.quantity : 0;
                                return (
                                    <div key={index} className="flex items-center gap-3 border-b border-[#1E211C] py-3">
                                        <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] text-[15px] font-bold" style={{ backgroundColor: `${color}24`, color }}>{event.position.symbol.charAt(0).toUpperCase()}</span>
                                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <span className="text-sm font-semibold">{event.position.symbol}</span>
                                            <span className="text-[12.5px] text-[#8D9388]">{t(event.kind === "div" ? "portfolio.income.dividend" : "portfolio.income.coupon")} · {monthFull(event.monthIndex)}</span>
                                        </span>
                                        <span className="flex flex-col items-end gap-0.5">
                                            <span className="font-semibold tabular-nums text-[#6EE7A0]">{formatAmount(event.amount, defaultCurrency, locale, true)}</span>
                                            <span className="text-xs tabular-nums text-[#8D9388]">{t("portfolio.income.payment_note", { qty: event.position.quantity, amount: formatAmount(perUnit, defaultCurrency, locale) })}</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
