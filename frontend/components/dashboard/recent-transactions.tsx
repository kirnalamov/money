"use client";

import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { convertCurrency, formatMoney, cn } from "@/lib/utils";
import { ArrowRightLeft, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { enUS, ru } from "date-fns/locale";

export function RecentTransactions() {
    const { t, i18n } = useTranslation();
    const { transactions, defaultCurrency } = useStore();
    const categoryLabel = (category: string) => {
        const key = category.toLowerCase();
        return /^[\p{L}_ ]+$/u.test(key) ? t(`dashboard.categories.${key}`, { defaultValue: category }) : category;
    };

    // Sort by date desc and show the latest 13 transactions.
    const recent = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 13);

    if (recent.length === 0) {
        return (
            <div className="rounded-[1.5rem] border bg-card text-card-foreground min-h-[170px] flex flex-col items-center justify-center p-8 text-muted-foreground">
                <div className="p-3 bg-muted rounded-full mb-3">
                    <ArrowRightLeft className="h-6 w-6" />
                </div>
                <p className="text-sm">{t("dashboard.empty.transactions_title")}</p>
            </div>
        )
    }

    return (
        <div className="rounded-[1.5rem] border bg-card flex flex-col min-h-[170px]">
            <div className="p-6 pb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold leading-snug">{t("dashboard.recent_transactions")}</h3>
                <Button variant="ghost" size="sm" className="min-h-[44px] text-xs text-muted-foreground" asChild>
                    <Link href="/transactions" className="focus-visible:ring-2 focus-visible:ring-ring">{t("common.view_all")}</Link>
                </Button>
            </div>
            <div className="px-3 pb-3 pt-1 space-y-1">
                {recent.map((tx) => {
                    const isExpense = tx.type === 'expense';
                    const isIncome = tx.type === 'income';
                    const convertedAmount = convertCurrency(tx.amount, tx.currency, defaultCurrency);

                    return (
                        <div key={tx.id} className="flex min-h-[55px] items-center justify-between gap-3 rounded-2xl bg-muted/50 px-3 py-2">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted",
                                    isExpense ? "text-expense" : isIncome ? "text-income" : "text-muted-foreground"
                                )}>
                                    {isExpense ? <ArrowDownLeft aria-hidden="true" className="h-4 w-4" /> : isIncome ? <ArrowUpRight aria-hidden="true" className="h-4 w-4" /> : <ArrowRightLeft aria-hidden="true" className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium leading-snug break-words">{tx.description || categoryLabel(tx.category)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(tx.date), i18n.language === "ru" ? "d MMM" : "MMM d", {
                                            locale: i18n.language === "ru" ? ru : enUS,
                                        })}
                                    </p>
                                </div>
                            </div>
                            <div className={cn("shrink-0 text-right font-semibold text-sm tabular-nums",
                                isExpense ? "text-expense" : isIncome ? "text-income" : "text-foreground"
                            )}>
                                <div>{formatMoney(isExpense ? -tx.amount : tx.amount, tx.currency, i18n.language, isIncome)}</div>
                                {tx.currency !== defaultCurrency && (
                                    <div className="text-xs font-normal text-muted-foreground">
                                        ≈ {formatMoney(isExpense ? -convertedAmount : convertedAmount, defaultCurrency, i18n.language, isIncome)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
