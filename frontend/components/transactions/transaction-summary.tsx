"use client";

import { formatMoney } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Scale, TrendingDown, TrendingUp } from "lucide-react";

interface TransactionSummaryProps {
    income: number;
    expense: number;
    net: number;
}

export function TransactionSummary({ income, expense, net }: TransactionSummaryProps) {
    const { t, i18n } = useTranslation();
    const { defaultCurrency } = useStore();
    const tile = "flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-card p-5";
    const label = "text-sm text-muted-foreground";
    const value = "mt-1 truncate text-2xl font-bold tabular-nums tracking-tight";
    const netColor = net >= 0 ? 'text-income' : 'text-expense';
    const icon = (Icon: typeof Scale, color: string) => (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon aria-hidden="true" className={`h-5 w-5 ${color}`} /></div>
    );

    return (
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            <div className={tile}>{icon(TrendingUp, 'text-income')}<div className="min-w-0"><p className={label}>{t('transactions.summary.total_income')}</p><p className={`${value} text-income`}>{formatMoney(income, defaultCurrency, i18n.language)}</p></div></div>
            <div className={tile}>{icon(TrendingDown, 'text-expense')}<div className="min-w-0"><p className={label}>{t('transactions.summary.total_expense')}</p><p className={`${value} text-expense`}>{formatMoney(expense, defaultCurrency, i18n.language)}</p></div></div>
            <div className={tile}>{icon(Scale, netColor)}<div className="min-w-0"><p className={label}>{t('transactions.summary.net_result')}</p><p className={`${value} ${netColor}`}>{formatMoney(net, defaultCurrency, i18n.language, true)}</p></div></div>
        </div>
    );
}
