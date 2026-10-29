"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-emerald-500/20 bg-emerald-500/10 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {t('transactions.summary.total_income')}
                    </CardTitle>
                    <div className="rounded-lg bg-emerald-500/15 p-2">
                        <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(income, defaultCurrency)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {t('transactions.summary.transactions_count', { count: transactionCount })}
                    </p>
                </CardContent>
            </Card>

            <Card className="border-red-500/20 bg-red-500/10 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
                        {t('transactions.summary.total_expense')}
                    </CardTitle>
                    <div className="rounded-lg bg-red-500/15 p-2">
                        <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        -{formatCurrency(expense, defaultCurrency)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {t('transactions.summary.transactions_count', { count: transactionCount })}
                    </p>
                </CardContent>
            </Card>

            <Card className="border-blue-500/20 bg-blue-500/10 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {t('transactions.summary.net_result')}
                    </CardTitle>
                    <div className="rounded-lg bg-blue-500/15 p-2">
                        <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500'}`}>
                        {net >= 0 ? '+' : ''}{formatCurrency(net, defaultCurrency)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {t('transactions.summary.transactions_count', { count: transactionCount })}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
