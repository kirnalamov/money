"use client";

import { formatMoney } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";

interface TransactionSummaryProps {
    income: number;
    expense: number;
    net: number;
}

export function TransactionSummary({ income, expense, net }: TransactionSummaryProps) {
    const { t, i18n } = useTranslation();
    const { defaultCurrency } = useStore();
    const tile = "rounded-2xl border border-border bg-card p-5";
    const label = "text-sm text-muted-foreground";
    const value = "mt-1 truncate text-2xl font-bold tabular-nums";

    return (
        <div className="grid gap-3 sm:grid-cols-3">
            <div className={tile}><p className={label}>{t('transactions.summary.total_income')}</p><p className={`${value} text-income`}>{formatMoney(income, defaultCurrency, i18n.language)}</p></div>
            <div className={tile}><p className={label}>{t('transactions.summary.total_expense')}</p><p className={`${value} text-expense`}>{formatMoney(expense, defaultCurrency, i18n.language)}</p></div>
            <div className={tile}><p className={label}>{t('transactions.summary.net_result')}</p><p className={`${value} ${net >= 0 ? 'text-income' : 'text-expense'}`}>{formatMoney(net, defaultCurrency, i18n.language, true)}</p></div>
        </div>
    );
}
