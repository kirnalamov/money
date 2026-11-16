"use client";

import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { formatPercent } from "@/lib/utils";
import { formatAmount } from "./money";

interface TransactionSummaryProps {
    income: number;
    expense: number;
    net: number;
}

const Arrow = ({ d, d2, color }: { d: string; d2: string; color: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /><path d={d2} /></svg>
);

export function TransactionSummary({ income, expense, net }: TransactionSummaryProps) {
    const { t, i18n } = useTranslation();
    const { defaultCurrency } = useStore();
    const locale = i18n.language;
    const spent = income > 0 ? Math.round((expense / income) * 100) : null;
    const left = spent === null ? null : Math.max(0, 100 - spent);
    const spentLabel = spent === null ? '' : formatPercent(spent, locale, false, 0);
    const leftLabel = left === null ? '' : formatPercent(left, locale, false, 0);

    return (
        <section aria-label={t('transactions.summary.net_result')} className="flex flex-col gap-5 rounded-[20px] border border-[#232721] bg-[#151714] px-5 py-6 text-[#F1F3EE] sm:px-7">
            <div className="flex flex-wrap items-end justify-between gap-x-14 gap-y-6">
                <div>
                    <div className="text-[13px] font-medium text-[#8D9388]">{t('transactions.summary.net_result')}</div>
                    <div className="mt-1 text-4xl font-bold leading-[1.1] tracking-[-0.03em] tabular-nums sm:text-[44px]">{formatAmount(net, defaultCurrency, locale, true)}</div>
                </div>
                <div className="flex flex-wrap gap-x-12 gap-y-4">
                    <div>
                        <div className="flex items-center gap-2 text-[13px] font-medium text-[#8D9388]"><Arrow d="M17 7 7 17" d2="M17 17H7V7" color="#6EE7A0" />{t('transactions.summary.total_income')}</div>
                        <div className="mt-1 text-[22px] font-semibold tabular-nums text-[#6EE7A0]">{formatAmount(income, defaultCurrency, locale)}</div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 text-[13px] font-medium text-[#8D9388]"><Arrow d="M7 17 17 7" d2="M7 7h10v10" color="#C9CEC3" />{t('transactions.summary.total_expense')}</div>
                        <div className="mt-1 text-[22px] font-semibold tabular-nums">{formatAmount(expense, defaultCurrency, locale)}</div>
                    </div>
                </div>
            </div>
            {spent !== null && left !== null && (
                <div>
                    <div className="flex h-2 gap-[3px]" role="img" aria-label={t('transactions.summary.bar_aria', { percent: spentLabel })}>
                        <span className="rounded bg-[#F1F3EE]" style={{ flex: `${Math.min(spent, 100)} 1 0` }} />
                        {left > 0 && <span className="rounded bg-[#6EE7A0]" style={{ flex: `${left} 1 0` }} />}
                    </div>
                    <div className="mt-2 flex justify-between gap-4 text-[12.5px] text-[#8D9388]">
                        <span>{t('transactions.summary.spent_pct', { percent: spentLabel })}</span>
                        {left > 0 && <span>{t('transactions.summary.left_pct', { percent: leftLabel })}</span>}
                    </div>
                </div>
            )}
        </section>
    );
}
