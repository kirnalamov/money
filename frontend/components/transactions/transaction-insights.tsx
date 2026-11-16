"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { Transaction } from "@/types";
import { convertCurrency, formatPercent } from "@/lib/utils";
import { PALETTE, categoryKey, getCategoryLabel } from "./transaction-list";
import { formatAmount } from "./money";

interface TransactionInsightsProps {
    transactions: Transaction[];
    isLoading?: boolean;
    onSelectCategory: (category: string) => void;
}

// Целые проценты, в сумме дающие 100: остаток раздаётся по наибольшей дробной части.
function sharePercents(values: number[]) {
    const total = values.reduce((a, b) => a + b, 0);
    if (total <= 0) return values.map(() => 0);
    const raw = values.map(v => (v / total) * 100);
    const floors = raw.map(Math.floor);
    let rest = 100 - floors.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - floors[i], i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => {
        if (rest > 0) { floors[i] += 1; rest -= 1; }
    });
    return floors;
}

const R = 52;
const C = 2 * Math.PI * R;
const GAP = 3;

export function TransactionInsights({ transactions, isLoading, onSelectCategory }: TransactionInsightsProps) {
    const { t, i18n } = useTranslation();
    const { accounts, defaultCurrency } = useStore();
    const locale = i18n.language;

    const { items, total } = useMemo(() => {
        const sums = new Map<string, { name: string; value: number }>();
        let sum = 0;
        for (const tx of transactions) {
            if (tx.type !== 'expense') continue;
            const currency = accounts.find(a => a.id === tx.accountId)?.currency || tx.currency;
            const amount = convertCurrency(tx.amount, currency, defaultCurrency);
            const key = categoryKey(tx.category);
            const prev = sums.get(key);
            sums.set(key, { name: prev?.name ?? tx.category, value: (prev?.value ?? 0) + amount });
            sum += amount;
        }
        const sorted = Array.from(sums.values()).sort((a, b) => b.value - a.value);
        const percents = sharePercents(sorted.map(item => item.value));
        return { items: sorted.slice(0, 5).map((item, index) => ({ ...item, percent: percents[index] })), total: sum };
    }, [accounts, defaultCurrency, transactions]);

    // Сегменты кольца: длина дуги минус зазор, смещение накапливается.
    const arcs = items.map((item, index) => {
        const before = items.slice(0, index).reduce((sum, prev) => sum + prev.value, 0);
        const len = total > 0 ? (item.value / total) * C : 0;
        return { color: PALETTE[index % PALETTE.length], dash: Math.max(len - GAP, 0.5), offset: total > 0 ? -(before / total) * C : 0 };
    });
    const link = "flex-1 rounded-[10px] border border-[#2A2E27] px-3 py-2.5 text-center text-[13.5px] font-semibold text-[#C6F24E] no-underline transition-colors duration-150 hover:bg-[#1B1E1A] hover:text-[#E2FF92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#151714]";

    return (
        <section aria-labelledby="transaction-insights-title" className="rounded-[20px] border border-[#232721] bg-[#151714] p-6 text-[#F1F3EE] xl:sticky xl:top-6">
            <h2 id="transaction-insights-title" className="mb-5 text-base font-semibold">{t('transactions.insights.title')}</h2>
            {isLoading ? (
                <div className="space-y-3" role="status" aria-label={t('common.loading')}>
                    <Skeleton className="mx-auto h-40 w-40 rounded-full" />
                    {[0, 1, 2, 3].map(item => <Skeleton key={item} className="h-6 w-full" />)}
                </div>
            ) : items.length === 0 ? (
                <p className="text-sm text-[#8D9388]">{t('transactions.insights.empty')}</p>
            ) : (
                <>
                    <div className="relative mx-auto mb-6 h-[168px] w-[168px]">
                        <svg width="168" height="168" viewBox="0 0 140 140" role="img" aria-label={t('transactions.insights.aria')}>
                            {arcs.map((arc, i) => (
                                <circle key={items[i].name} cx="70" cy="70" r={R} fill="none" stroke={arc.color} strokeWidth="16" strokeDasharray={`${arc.dash} ${C}`} strokeDashoffset={arc.offset} transform="rotate(-90 70 70)" />
                            ))}
                        </svg>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xs text-[#8D9388]">{t('transactions.insights.total')}</span>
                            <span className="text-[15px] font-bold tabular-nums">{formatAmount(total, defaultCurrency, locale)}</span>
                        </div>
                    </div>
                    <ul className="flex flex-col gap-3.5">
                        {items.map((item, index) => (
                            <li key={item.name}>
                                <button type="button" onClick={() => onSelectCategory(item.name)} className="flex w-full items-center gap-2.5 rounded-md text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]">
                                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: PALETTE[index % PALETTE.length] }} />
                                    <span className="min-w-0 flex-1 truncate font-medium" title={getCategoryLabel(t, item.name)}>{getCategoryLabel(t, item.name)}</span>
                                    <span className="shrink-0 font-semibold tabular-nums">{formatAmount(item.value, defaultCurrency, locale)}</span>
                                    <span className="w-9 shrink-0 text-right text-[13px] tabular-nums text-[#8D9388]">{formatPercent(item.percent, locale, false, 0)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            )}
            <div className="mt-6 flex gap-2.5 border-t border-[#232721] pt-5">
                <Link href="/analytics" className={link}>{t('transactions.insights.analytics')}</Link>
                <Link href="/limits" className={link}>{t('transactions.insights.limits')}</Link>
            </div>
        </section>
    );
}
