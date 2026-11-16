"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { convertCurrency, formatPercent } from "@/lib/utils";
import { formatAmount } from "@/components/transactions/money";
import { CLASS_COLORS, sharePercents } from "./estimates";

const R = 52;
const C = 2 * Math.PI * R;
const GAP = 3;

// Распределение активов: позиции по классам + наличные со счетов, как в макете.
export function AssetAllocationCard() {
    const { t, i18n } = useTranslation();
    const { positions, accounts, defaultCurrency } = useStore();
    const locale = i18n.language;

    const { items, total } = useMemo(() => {
        const sums = new Map<string, number>();
        for (const position of positions) {
            const value = convertCurrency(position.quantity * position.currentPrice, position.currency, defaultCurrency);
            const key = position.assetClass || "stock";
            sums.set(key, (sums.get(key) || 0) + value);
        }
        const cash = accounts.reduce((sum, account) => sum + Math.max(0, convertCurrency(account.balance, account.currency, defaultCurrency)), 0);
        if (cash > 0) sums.set("cash", (sums.get("cash") || 0) + cash);
        const sorted = Array.from(sums.entries())
            .map(([key, value]) => ({ key, value }))
            .sort((a, b) => b.value - a.value);
        const percents = sharePercents(sorted.map(item => item.value));
        return {
            items: sorted.map((item, index) => ({ ...item, percent: percents[index], color: CLASS_COLORS[item.key] || "#8D9388" })),
            total: sorted.reduce((sum, item) => sum + item.value, 0),
        };
    }, [accounts, defaultCurrency, positions]);

    const arcs = items.map((item, index) => {
        const before = items.slice(0, index).reduce((sum, prev) => sum + prev.value, 0);
        const len = total > 0 ? (item.value / total) * C : 0;
        return { color: item.color, dash: Math.max(len - GAP, 0.5), offset: total > 0 ? -(before / total) * C : 0 };
    });

    return (
        <section aria-label={t("portfolio.allocation_title")} className="min-w-0 flex-1 basis-[440px] rounded-[20px] border border-[#232721] bg-[#151714] p-7 text-[#F1F3EE]">
            <h2 className="mb-5 text-base font-semibold">{t("portfolio.allocation_title")}</h2>
            {items.length === 0 ? (
                <p className="text-sm text-[#8D9388]">{t("portfolio.no_positions")}</p>
            ) : (
                <div className="flex flex-wrap items-center gap-x-9 gap-y-6">
                    <div className="relative h-[168px] w-[168px] flex-none">
                        <svg width="168" height="168" viewBox="0 0 140 140" role="img" aria-label={t("portfolio.allocation_accessibility", { total: formatAmount(total, defaultCurrency, locale), count: items.length })}>
                            {arcs.map((arc, i) => (
                                <circle key={items[i].key} cx="70" cy="70" r={R} fill="none" stroke={arc.color} strokeWidth="16" strokeDasharray={`${arc.dash} ${C}`} strokeDashoffset={arc.offset} transform="rotate(-90 70 70)" />
                            ))}
                        </svg>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xs text-[#8D9388]">{t("portfolio.allocation_with_cash")}</span>
                            <span className="text-[15px] font-bold tabular-nums">{formatAmount(total, defaultCurrency, locale)}</span>
                        </div>
                    </div>
                    <div className="flex min-w-0 flex-1 basis-[220px] flex-col gap-4">
                        {items.map(item => (
                            <div key={item.key}>
                                <div className="flex items-center gap-2.5 text-sm">
                                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: item.color }} />
                                    <span className="min-w-0 flex-1 truncate font-medium">{t(`portfolio.asset_classes.${item.key}`)}</span>
                                    <span className="font-semibold tabular-nums">{formatPercent(item.percent, locale, false, 0)}</span>
                                </div>
                                <div className="mt-2 h-1 rounded-sm bg-[#232721]">
                                    <div className="h-1 rounded-sm" style={{ width: `${item.percent}%`, backgroundColor: item.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
