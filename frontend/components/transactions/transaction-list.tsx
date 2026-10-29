"use client";

import { useStore } from "@/lib/store";
import { format, isToday, isYesterday } from "date-fns";
import { ru, enUS, type Locale } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { formatCurrency, convertCurrency } from "@/lib/utils";
import { ShoppingBag, ArrowUpRight, ArrowRightLeft, Wallet } from "lucide-react";
import { Transaction } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { TransactionDetailsDialog } from "./transaction-details-dialog";
import type { TransactionSort } from "./transaction-filters";

const localeMap: Record<string, Locale> = {
    ru: ru,
    en: enUS,
};

interface TransactionListProps {
    transactions: Transaction[];
    emptyMessage?: string;
    emptyAction?: ReactNode;
    sort?: TransactionSort;
}

export function TransactionList({ transactions, emptyMessage, emptyAction, sort = 'newest' }: TransactionListProps) {
    const { t, i18n } = useTranslation();
    const locale = localeMap[i18n.language] || enUS;
    const { accounts, defaultCurrency, addTransaction } = useStore();
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [deletedTransaction, setDeletedTransaction] = useState<Transaction | null>(null);
    const [restoreError, setRestoreError] = useState<string | null>(null);
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    }, []);

    const getAccountName = (id: number | undefined) => accounts.find(a => a.id === id)?.name || t('transactions.unknown_account');

    const isAmountSort = sort === 'largest' || sort === 'smallest';
    const groupedTransactions = isAmountSort
        ? { all: transactions }
        : transactions.reduce((groups, tx) => {
            const date = new Date(tx.date);
            const dateKey = format(date, 'yyyy-MM-dd');
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(tx);
            return groups;
        }, {} as Record<string, Transaction[]>);

    const sortedDates = isAmountSort
        ? ['all']
        : Object.keys(groupedTransactions).sort((a, b) => {
            const direction = sort === 'oldest' ? 1 : -1;
            return direction * (new Date(a).getTime() - new Date(b).getTime());
        });

    const getDateLabel = (dateKey: string) => {
        if (dateKey === 'all') return t(`transactions.filters.sort_${sort}`);
        const date = new Date(dateKey);
        if (isToday(date)) return t('common.today') || 'Today';
        if (isYesterday(date)) return t('common.yesterday') || 'Yesterday';
        return format(date, 'd MMMM yyyy, EEEE', { locale });
    };

    const getIcon = (type: string) => {
        if (type === 'income') return <ArrowUpRight className="h-5 w-5 text-emerald-500" />;
        if (type === 'transfer') return <ArrowRightLeft className="h-5 w-5 text-blue-500" />;
        // Specific icons based on category name could go here, for now generic expense
        return <ShoppingBag className="h-5 w-5 text-red-500" />;
    };

    const handleDeleted = (transaction: Transaction) => {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setDeletedTransaction(transaction);
        setRestoreError(null);
        undoTimerRef.current = setTimeout(() => setDeletedTransaction(null), 10_000);
    };

    const handleUndo = async () => {
        if (!deletedTransaction) return;
        const { id, ...transactionToRestore } = deletedTransaction;
        void id;
        setRestoreError(null);
        try {
            await addTransaction(transactionToRestore);
            setDeletedTransaction(null);
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        } catch {
            setRestoreError(t('transactions.restore_error'));
        }
    };

    const getTypeLabel = (type: Transaction['type']) => t(`transactions.types.${type}`);

    return (
        <div className="space-y-6">
            {deletedTransaction && (
                <Alert className="flex items-center justify-between gap-4">
                    <AlertDescription>{t('transactions.undo_deleted')}</AlertDescription>
                    <Button type="button" variant="outline" size="sm" onClick={handleUndo}>
                        {t('transactions.undo')}
                    </Button>
                </Alert>
            )}
            {restoreError && (
                <Alert variant="destructive">
                    <AlertDescription>{restoreError}</AlertDescription>
                </Alert>
            )}
            {transactions.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
                    <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium text-muted-foreground">{emptyMessage || t('transactions.empty_state')}</h3>
                    {emptyAction && <div className="mt-5 flex justify-center">{emptyAction}</div>}
                </div>
            ) : sortedDates.map((dateKey) => (
                <div key={dateKey} className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                        {getDateLabel(dateKey)}
                    </h3>
                    <div className="grid gap-3">
                        {groupedTransactions[dateKey].map((tx) => (
                            <div
                                key={tx.id}
                                className="group flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={() => {
                                    setSelectedTx(tx);
                                    setIsDetailsOpen(true);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        setSelectedTx(tx);
                                        setIsDetailsOpen(true);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={`${tx.category}, ${formatCurrency(tx.amount, tx.currency)}`}
                            >
                                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                    <div className={`p-2.5 rounded-full ${tx.type === 'income' ? 'bg-emerald-500/10' :
                                        tx.type === 'transfer' ? 'bg-blue-500/10' : 'bg-red-500/10'
                                        }`}>
                                        {getIcon(tx.type)}
                                    </div>
                                    <div className="flex min-w-0 flex-col gap-0.5">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="max-w-[160px] truncate text-sm font-semibold sm:max-w-[260px]" title={tx.category}>{tx.category}</span>
                                            <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] font-medium">
                                                {getTypeLabel(tx.type)}
                                            </Badge>
                                        </div>
                                        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Wallet className="h-3 w-3" />
                                                {getAccountName(tx.accountId)}
                                            </span>
                                            {tx.type === 'transfer' && (
                                                <>
                                                    <ArrowRightLeft className="h-3 w-3" />
                                                    <span>{getAccountName(tx.toAccountId)}</span>
                                                </>
                                            )}
                                            {tx.description && (
                                                <>
                                                    <span aria-hidden="true">&middot;</span>
                                                    <span className="max-w-[180px] truncate sm:max-w-[260px]" title={tx.description}>{tx.description}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="ml-auto flex shrink-0 flex-col items-end gap-0.5">
                                    <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' :
                                        tx.type === 'expense' ? 'text-red-600 dark:text-red-400' :
                                            'text-blue-600 dark:text-blue-400'
                                        }`}>
                                        {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                                        {formatCurrency(tx.amount, tx.currency)}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        {format(new Date(tx.date), 'HH:mm')}
                                    </span>
                                    {tx.currency !== defaultCurrency && (
                                        <span className="text-xs text-muted-foreground">
                                            &asymp; {formatCurrency(convertCurrency(tx.amount, tx.currency, defaultCurrency), defaultCurrency)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <TransactionDetailsDialog 
                transaction={selectedTx} 
                open={isDetailsOpen} 
                onOpenChange={setIsDetailsOpen}
                onDeleted={handleDeleted}
            />
        </div>
    );
}
