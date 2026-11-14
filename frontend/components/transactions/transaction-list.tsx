"use client";

import { useStore } from "@/lib/store";
import { format, isToday, isYesterday } from "date-fns";
import { ru, enUS, type Locale } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { formatMoney, convertCurrency } from "@/lib/utils";
import { ShoppingBag, ArrowUpRight, ArrowRightLeft, Wallet, Banknote, Home, Utensils, Car, Zap, ShoppingCart, UtensilsCrossed, Clapperboard, Gamepad2, TrendingUp, PiggyBank, Tag, type LucideIcon } from "lucide-react";
import { Transaction } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { TransactionDetailsDialog } from "./transaction-details-dialog";
import type { TransactionSort } from "./transaction-filters";

const localeMap: Record<string, Locale> = {
    ru: ru,
    en: enUS,
};

const categoryIcons: Record<string, LucideIcon> = {
    salary: Banknote,
    housing: Home,
    food: Utensils,
    transport: Car,
    shopping: ShoppingBag,
    utilities: Zap,
    groceries: ShoppingCart,
    dining_out: UtensilsCrossed,
    entertainment: Clapperboard,
    leisure: Gamepad2,
    investments: TrendingUp,
    savings: PiggyBank,
};

// Ключ словаря dashboard.categories.*; сохранённое имя категории не меняется.
export const categoryKey = (category: string) => category.trim().toLowerCase().replace(/[\s-]+/g, '_');

export function getCategoryLabel(t: TFunction, category: string) {
    const key = categoryKey(category);
    return /^[\p{L}\d_]+$/u.test(key) ? t(`dashboard.categories.${key}`, { defaultValue: category }) : category;
}

export function getCategoryIcon(type: string, category: string): LucideIcon {
    if (type === 'transfer') return ArrowRightLeft;
    const icon = categoryIcons[categoryKey(category)];
    if (icon) return icon;
    return type === 'income' ? ArrowUpRight : Tag;
}

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
    const getCategoryName = (category: string) => getCategoryLabel(t, category);
    const lastRowRef = useRef<HTMLElement | null>(null);
    const openDetails = (tx: Transaction, row: HTMLElement) => {
        lastRowRef.current = row;
        setSelectedTx(tx);
        setIsDetailsOpen(true);
    };

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
        if (dateKey === 'all') return t('transactions.all_operations');
        const date = new Date(dateKey);
        if (isToday(date)) return t('common.today') || 'Today';
        if (isYesterday(date)) return t('common.yesterday') || 'Yesterday';
        return format(date, 'd MMMM yyyy, EEEE', { locale });
    };

    const getIcon = (tx: Transaction) => {
        const Icon = getCategoryIcon(tx.type, tx.category);
        const color = tx.type === 'income' ? 'text-income' : tx.type === 'transfer' ? 'text-chart-2' : 'text-expense';
        return <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />;
    };

    const handleDeleted = (transaction: Transaction) => {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setDeletedTransaction(transaction);
        setRestoreError(null);
        undoTimerRef.current = setTimeout(() => setDeletedTransaction(null), 10_000);
    };

    const getDayTotal = (items: Transaction[]) => items.reduce((sum, tx) => sum + (tx.type === 'expense' ? -1 : tx.type === 'income' ? 1 : 0) * convertCurrency(tx.amount, tx.currency, defaultCurrency), 0);

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
                    <h3 className="text-base font-semibold text-muted-foreground">{emptyMessage || t('transactions.empty_state')}</h3>
                    {emptyAction && <div className="mt-5 flex justify-center">{emptyAction}</div>}
                </div>
            ) : sortedDates.map((dateKey) => (
                <div key={dateKey} className="overflow-clip rounded-2xl border border-border bg-card">
                     <h2 className="sticky top-0 z-10 flex scroll-mt-0 items-center justify-between border-b border-border bg-muted px-4 py-3 text-sm font-medium text-foreground">
                         <span>{getDateLabel(dateKey)}</span><span className="tabular-nums text-xs text-muted-foreground">{formatMoney(getDayTotal(groupedTransactions[dateKey]), defaultCurrency, i18n.language, true)}</span>
                    </h2>
                    <div className="divide-y divide-border">
                        {groupedTransactions[dateKey].map((tx) => (
                            <div
                                key={tx.id}
                                 className="group flex min-h-[56px] min-w-0 cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
                                onClick={(event) => openDetails(tx, event.currentTarget)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        openDetails(tx, event.currentTarget);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                        {getIcon(tx)}
                                    </div>
                                    <div className="flex min-w-0 flex-col gap-0.5">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="break-words text-sm font-medium leading-snug" title={tx.category}>{getCategoryName(tx.category)}</span>
                                        </div>
                                        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Wallet className="h-3 w-3" />
                                                <span className="max-w-[160px] truncate sm:max-w-[220px]" title={getAccountName(tx.accountId)}>{getAccountName(tx.accountId)}</span>
                                            </span>
                                            {tx.type === 'transfer' && (
                                                <>
                                                    <ArrowRightLeft className="h-3 w-3" />
                                                    <span className="max-w-[160px] truncate sm:max-w-[220px]" title={getAccountName(tx.toAccountId)}>{getAccountName(tx.toAccountId)}</span>
                                                </>
                                            )}
                                            {tx.description && (
                                                <span className="flex min-w-0 items-center gap-1.5">
                                                    <span aria-hidden="true">&middot;</span>
                                                    <span className="min-w-0 break-words" title={tx.description}>{tx.description}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="ml-auto flex shrink-0 flex-col items-end gap-0.5">
                                    <div className="flex items-baseline gap-2 whitespace-nowrap">
                                        <span className="text-xs tabular-nums text-muted-foreground">
                                            {format(new Date(tx.date), 'HH:mm')}
                                        </span>
                                        <span className={`font-semibold tabular-nums text-sm ${tx.type === 'income' ? 'text-income' :
                                            tx.type === 'expense' ? 'text-expense' : 'text-chart-2'
                                            }`}>
                                            {formatMoney(tx.type === 'expense' ? -tx.amount : tx.amount, tx.currency, i18n.language, tx.type !== 'transfer')}
                                        </span>
                                    </div>
                                    {tx.currency !== defaultCurrency && (
                                        <span className="text-xs tabular-nums text-muted-foreground">
                                            &asymp; {formatMoney((tx.type === 'expense' ? -1 : 1) * convertCurrency(tx.amount, tx.currency, defaultCurrency), defaultCurrency, i18n.language, tx.type !== 'transfer')}
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
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    lastRowRef.current?.focus();
                }}
            />
        </div>
    );
}
