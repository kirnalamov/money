"use client";

import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";

interface TransactionSummaryProps {
    income: number;
    expense: number;
    net: number;
    transactionCount: number;
}

export function TransactionSummary({ income, expense, net, transactionCount }: TransactionSummaryProps) {
    const { t } = useTranslation();
    const { defaultCurrency } = useStore();

    return (
        <div className="grid grid-cols-2 divide-x divide-white/[.09] rounded-xl border border-white/[.09] bg-[#161913] md:grid-cols-3">
            <div className="p-4 md:p-5"><p className="text-xs text-[#8f9588]">{t('transactions.summary.total_income')}</p><p className="mt-1 text-lg font-semibold tabular-nums text-[#a7f3d0]">+{formatCurrency(income, defaultCurrency)}</p></div>
            <div className="p-4 md:p-5"><p className="text-xs text-[#8f9588]">{t('transactions.summary.total_expense')}</p><p className="mt-1 text-lg font-semibold tabular-nums text-[#ff6f6a]">-{formatCurrency(expense, defaultCurrency)}</p></div>
            <div className="col-span-2 border-t border-white/[.09] p-4 md:col-span-1 md:border-t-0 md:p-5"><p className="text-xs text-[#8f9588]">{t('transactions.summary.net_result')}</p><p className={`mt-1 text-lg font-semibold tabular-nums ${net >= 0 ? 'text-[#a7f3d0]' : 'text-[#ff6f6a]'}`}>{net >= 0 ? '+' : ''}{formatCurrency(net, defaultCurrency)}</p><p className="mt-1 text-xs text-[#8f9588]">{t('transactions.summary.transactions_count', { count: transactionCount })}</p></div>
        </div>
    );
}
