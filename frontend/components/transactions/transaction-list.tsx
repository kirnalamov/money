"use client";

import { useStore } from "@/lib/store";
import { format, isToday, isYesterday } from "date-fns";
import { ru, enUS, type Locale } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { formatCurrency, convertCurrency } from "@/lib/utils";
import { ShoppingBag, ArrowUpRight, ArrowDownRight, ArrowRightLeft, CreditCard, Banknote, Landmark, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/types";

const localeMap: Record<string, Locale> = {
    ru: ru,
    en: enUS,
};

interface TransactionListProps {
    transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
    const { t, i18n } = useTranslation();
    const locale = localeMap[i18n.language] || enUS;
    const { accounts, defaultCurrency } = useStore();

    const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Unknown';

    // Group transactions by date
    const groupedTransactions = transactions.reduce((groups, tx) => {
        const date = new Date(tx.date);
        const dateKey = format(date, 'yyyy-MM-dd');
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(tx);
        return groups;
    }, {} as Record<string, Transaction[]>);

    // Sort dates descending
    const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const getDateLabel = (dateKey: string) => {
        const date = new Date(dateKey);
        if (isToday(date)) return t('common.today') || 'Today';
        if (isYesterday(date)) return t('common.yesterday') || 'Yesterday';
        return format(date, 'd MMMM yyyy, EEEE', { locale });
    };

    const getIcon = (type: string, category: string) => {
        if (type === 'income') return <ArrowUpRight className="h-5 w-5 text-emerald-500" />;
        if (type === 'transfer') return <ArrowRightLeft className="h-5 w-5 text-blue-500" />;
        // Specific icons based on category name could go here, for now generic expense
        return <ShoppingBag className="h-5 w-5 text-red-500" />;
    };

    if (transactions.length === 0) {
        return (
            <div className="text-center py-12 bg-card rounded-lg border border-dashed">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">{t('transactions.empty_state')}</h3>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {sortedDates.map((dateKey) => (
                <div key={dateKey} className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                        {getDateLabel(dateKey)}
                    </h3>
                    <div className="grid gap-3">
                        {groupedTransactions[dateKey].map((tx) => (
                            <div key={tx.id} className="group flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors rounded-xl border shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-full ${tx.type === 'income' ? 'bg-emerald-500/10' :
                                            tx.type === 'transfer' ? 'bg-blue-500/10' : 'bg-red-500/10'
                                        }`}>
                                        {getIcon(tx.type, tx.category)}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-semibold text-sm">{tx.category}</span>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Wallet className="h-3 w-3" />
                                                {getAccountName(tx.accountId)}
                                            </span>
                                            {tx.type === 'transfer' && (
                                                <>
                                                    <ArrowRightLeft className="h-3 w-3" />
                                                    <span>{getAccountName(tx.toAccountId!)}</span>
                                                </>
                                            )}
                                            {tx.description && (
                                                <>
                                                    <span>•</span>
                                                    <span>{tx.description}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-0.5">
                                    <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' :
                                            tx.type === 'expense' ? 'text-red-600 dark:text-red-400' :
                                                'text-blue-600 dark:text-blue-400'
                                        }`}>
                                        {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                                        {formatCurrency(tx.amount, tx.currency)}
                                    </span>
                                    {tx.currency !== defaultCurrency && (
                                        <span className="text-xs text-muted-foreground">
                                            ≈ {formatCurrency(convertCurrency(tx.amount, tx.currency, defaultCurrency), defaultCurrency)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
