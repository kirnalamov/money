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

    return (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-border bg-muted px-4 py-3 md:px-6">
            <div><p className="text-[11px] uppercase tracking-[.14em] text-muted-foreground">{t('transactions.summary.total_income')}</p><p className="mt-0.5 text-base font-semibold tabular-nums text-income">{formatMoney(income, defaultCurrency, i18n.language)}</p></div>
            <div><p className="text-[11px] uppercase tracking-[.14em] text-muted-foreground">{t('transactions.summary.total_expense')}</p><p className="mt-0.5 text-base font-semibold tabular-nums text-expense">{formatMoney(-expense, defaultCurrency, i18n.language)}</p></div>
            <div className="ml-auto"><p className="text-[11px] uppercase tracking-[.14em] text-muted-foreground">{t('transactions.summary.net_result')}</p><p className={`mt-0.5 text-lg font-semibold tabular-nums ${net >= 0 ? 'text-income' : 'text-expense'}`}>{formatMoney(net, defaultCurrency, i18n.language)}</p></div>
        </div>
    );
}
