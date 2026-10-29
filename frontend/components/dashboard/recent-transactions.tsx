"use client";

import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { convertCurrency, formatCurrency, cn } from "@/lib/utils";
import { ArrowRightLeft, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { enUS, ru } from "date-fns/locale";

export function RecentTransactions() {
    const { t, i18n } = useTranslation();
    const { transactions, defaultCurrency } = useStore();

    // Sort by date desc and take top 5
    const recent = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    if (recent.length === 0) {
        return (
            <div className="rounded-[1.5rem] border bg-card text-card-foreground h-full flex flex-col items-center justify-center p-8 text-muted-foreground">
                <div className="p-3 bg-muted rounded-full mb-3">
                    <ArrowRightLeft className="h-6 w-6" />
                </div>
                <p className="text-sm">{t("dashboard.empty.transactions_title")}</p>
            </div>
        )
    }

    return (
        <div className="rounded-[1.5rem] border bg-card flex flex-col flex-1 min-h-[300px]">
            <div className="p-6 pb-2 flex items-center justify-between">
                <h3 className="font-semibold leading-none tracking-tight">{t("dashboard.recent_transactions")}</h3>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-8" asChild>
                    <Link href="/transactions">{t("common.view_all")}</Link>
                </Button>
            </div>
            <div className="p-4 pt-2 space-y-2">
                {recent.map((tx) => {
                    const isExpense = tx.type === 'expense';
                    const convertedAmount = convertCurrency(tx.amount, tx.currency, defaultCurrency);

                    return (
                        <div key={tx.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 p-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className={cn("p-2.5 rounded-xl transition-colors",
                                    isExpense ? "bg-red-100/50 text-red-600 dark:bg-red-900/10" : "bg-green-100/50 text-green-600 dark:bg-green-900/10"
                                )}>
                                    {isExpense ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium leading-snug break-words">{tx.description || t(tx.category)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(tx.date), i18n.language === "ru" ? "d MMM" : "MMM d", {
                                            locale: i18n.language === "ru" ? ru : enUS,
                                        })}
                                    </p>
                                </div>
                            </div>
                            <div className={cn("shrink-0 text-right font-semibold text-sm tabular-nums",
                                isExpense ? "text-foreground" : "text-green-600"
                            )}>
                                <div>{isExpense ? "-" : "+"}{formatCurrency(tx.amount, tx.currency)}</div>
                                {tx.currency !== defaultCurrency && (
                                    <div className="text-xs font-normal text-muted-foreground">
                                        ≈ {formatCurrency(convertedAmount, defaultCurrency)}
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
