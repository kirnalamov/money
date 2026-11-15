"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { Transaction } from "@/types";
import { convertCurrency, formatMoney, formatPercent } from "@/lib/utils";

interface TransactionInsightsProps {
    transactions: Transaction[];
    isLoading?: boolean;
    onSelectCategory: (category: string) => void;
}

const BAR_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

export function TransactionInsights({ transactions, isLoading, onSelectCategory }: TransactionInsightsProps) {
    const { t, i18n } = useTranslation();
    const { accounts, defaultCurrency } = useStore();

    const { top, total } = useMemo(() => {
        const sums = new Map<string, number>();
        let sum = 0;
        for (const tx of transactions) {
            if (tx.type !== 'expense') continue;
            const currency = accounts.find(a => a.id === tx.accountId)?.currency || tx.currency;
            const amount = convertCurrency(tx.amount, currency, defaultCurrency);
            sums.set(tx.category, (sums.get(tx.category) || 0) + amount);
            sum += amount;
        }
        return { top: Array.from(sums.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5), total: sum };
    }, [accounts, defaultCurrency, transactions]);

    // Ключ только из букв/цифр/_, иначе i18next разберёт "." и ":" как разделители
    const categoryName = (category: string) => {
        const key = category.toLowerCase();
        return /^[\p{L}\d_ ]+$/u.test(key) ? t(`dashboard.categories.${key}`, { defaultValue: category }) : category;
    };
    const link = "inline-flex min-h-[44px] items-center text-xs text-muted-foreground hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring";

    return (
        <section aria-labelledby="transaction-insights-title" className="rounded-2xl border border-border bg-card p-5 xl:sticky xl:top-4">
            <h2 id="transaction-insights-title" className="text-base font-semibold leading-snug">{t('transactions.insights.title')}</h2>
            {isLoading ? (
                <div className="mt-4 space-y-3" role="status" aria-label={t('common.loading')}>
                    {[0, 1, 2, 3, 4].map(item => <Skeleton key={item} className="h-11 w-full" />)}
                </div>
            ) : top.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">{t('transactions.insights.empty')}</p>
            ) : (
                <ul className="mt-2">
                    {top.map(([category, value], index) => {
                        const share = total > 0 ? value / total : 0;
                        return (
                            <li key={category}>
                                <button type="button" onClick={() => onSelectCategory(category)} className="block min-h-[44px] w-full rounded-lg py-2 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    <span className="flex items-baseline justify-between gap-3 text-sm">
                                        <span className="min-w-0 truncate font-medium">{categoryName(category)}</span>
                                        <span className="shrink-0 tabular-nums">{formatMoney(value, defaultCurrency, i18n.language)} <span className="text-muted-foreground">{formatPercent(share * 100, i18n.language, false, 0)}</span></span>
                                    </span>
                                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                        <span className={`block h-full rounded-full ${BAR_COLORS[index]}`} style={{ width: `${Math.round(share * 100)}%` }} />
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 border-t border-border pt-2">
                <Link href="/analytics" className={link}>{t('transactions.insights.analytics')}</Link>
                <Link href="/limits" className={link}>{t('transactions.insights.limits')}</Link>
            </div>
        </section>
    );
}
