"use client";

import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { formatPercent } from "@/lib/utils";
import { formatAmount } from "@/components/transactions/money";

interface PortfolioSummaryProps {
    totalValue: number;
    totalCost: number;
    totalPnL: number;
    returnPercent: number;
}

export function PortfolioSummary({ totalValue, totalCost, totalPnL, returnPercent }: PortfolioSummaryProps) {
    const { t, i18n } = useTranslation();
    const { defaultCurrency } = useStore();
    const locale = i18n.language;
    const up = totalPnL >= 0;
    const investedShare = totalValue > 0 ? Math.min(100, Math.max(0, (totalCost / totalValue) * 100)) : 100;
    const pnlShare = Math.max(0, 100 - investedShare);

    return (
        <section aria-label={t("portfolio.total_value")} className="flex min-w-0 flex-1 basis-[440px] flex-col gap-6 rounded-[20px] border border-[#232721] bg-[#151714] p-7 text-[#F1F3EE]">
            <div>
                <div className="text-[13px] font-medium text-[#8D9388]">{t("portfolio.total_value")}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-3">
                    <span className="text-[40px] font-bold leading-[1.1] tracking-[-0.03em] tabular-nums sm:text-5xl">{formatAmount(totalValue, defaultCurrency, locale)}</span>
                    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums ${up ? "bg-[#6EE7A0]/10 text-[#6EE7A0]" : "bg-[#F87171]/10 text-[#F87171]"}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            {up ? <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></> : <><path d="M17 7 7 17" /><path d="M17 17H7V7" /></>}
                        </svg>
                        {formatPercent(returnPercent, locale, true, 2)}
                    </span>
                </div>
            </div>
            <div>
                <div className="flex h-2 gap-[3px]" role="img" aria-label={`${t("portfolio.invested_capital")} ${formatPercent(investedShare, locale, false, 0)}`}>
                    <span className="rounded bg-[#F1F3EE]" style={{ flex: `${investedShare} 1 0` }} />
                    {pnlShare > 0 && <span className="rounded bg-[#6EE7A0]" style={{ flex: `${pnlShare} 1 0` }} />}
                </div>
                <div className="mt-5 flex flex-wrap gap-x-14 gap-y-6">
                    <div>
                        <div className="flex items-center gap-2 text-[13px] font-medium text-[#8D9388]"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#F1F3EE]" />{t("portfolio.invested_capital")}</div>
                        <div className="mt-1 text-[22px] font-semibold tabular-nums">{formatAmount(totalCost, defaultCurrency, locale)}</div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 text-[13px] font-medium text-[#8D9388]"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${up ? "bg-[#6EE7A0]" : "bg-[#F87171]"}`} />{t("portfolio.total_pnl")}</div>
                        <div className={`mt-1 text-[22px] font-semibold tabular-nums ${up ? "text-[#6EE7A0]" : "text-[#F87171]"}`}>{formatAmount(totalPnL, defaultCurrency, locale, true)}</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
