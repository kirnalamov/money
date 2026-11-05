"use client";

import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";

interface TransactionSummaryProps {
    income: number;
    expense: number;
    net: number;
}

export function TransactionSummary({ income, expense, net }: TransactionSummaryProps) {
    const { t } = useTranslation();
    const { defaultCurrency } = useStore();

    return (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-[rgba(200,240,90,.09)] bg-[#161913] px-4 py-3 md:px-6">
            <div><p className="text-[11px] uppercase tracking-[.14em] text-[#8f9588]">{t('transactions.summary.total_income')}</p><p className="mt-0.5 text-base font-semibold tabular-nums text-[#34d399]">+{formatCurrency(income, defaultCurrency)}</p></div>
            <div><p className="text-[11px] uppercase tracking-[.14em] text-[#8f9588]">{t('transactions.summary.total_expense')}</p><p className="mt-0.5 text-base font-semibold tabular-nums text-[#ff6f6a]">-{formatCurrency(expense, defaultCurrency)}</p></div>
            <div className="ml-auto"><p className="text-[11px] uppercase tracking-[.14em] text-[#8f9588]">{t('transactions.summary.net_result')}</p><p className={`mt-0.5 text-lg font-semibold tabular-nums ${net >= 0 ? 'text-[#34d399]' : 'text-[#ff6f6a]'}`}>{net >= 0 ? '+' : ''}{formatCurrency(net, defaultCurrency)}</p></div>
        </div>
    );
}
