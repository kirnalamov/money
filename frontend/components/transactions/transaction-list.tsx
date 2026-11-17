"use client";

import { useStore } from "@/lib/store";
import { format, isToday, isYesterday } from "date-fns";
import { ru, enUS, type Locale } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { convertCurrency } from "@/lib/utils";
import { formatAmount } from "./money";
import { ShoppingBag, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Wallet, Banknote, Home, Utensils, Car, Zap, ShoppingCart, UtensilsCrossed, Clapperboard, Gamepad2, TrendingUp, PiggyBank, Tag, type LucideIcon } from "lucide-react";
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

const ROW_GRID = "grid-cols-[36px_minmax(0,1fr)_auto] md:grid-cols-[36px_minmax(0,1fr)_150px_52px_150px]";
// Цвета категорий — токены chart-1..5; полные имена классов нужны Tailwind.
export const PALETTE = ["#A3E635", "#38BDF8", "#C4B5FD", "#FBBF24", "#6EE7A0", "#5EEAD4"];

// Индекс цвета категории: сначала расходные категории по убыванию суммы, затем остальные.
export function buildCategoryColorIndex(transactions: Transaction[], toDefault: (tx: Transaction) => number) {
    const expense = new Map<string, number>();
    const others = new Set<string>();
    for (const tx of transactions) {
        const key = categoryKey(tx.category);
        if (tx.type === 'expense') expense.set(key, (expense.get(key) || 0) + toDefault(tx));
        else others.add(key);
    }
    const ordered = [...Array.from(expense.entries()).sort((a, b) => b[1] - a[1]).map(([key]) => key), ...Array.from(others).filter(key => !expense.has(key))];
    return new Map(ordered.map((key, index) => [key, index % PALETTE.length] as const));
}

interface TransactionListProps {
    transactions: Transaction[];
    emptyMessage?: string;
    emptyAction?: ReactNode;
    sort?: TransactionSort;
    colorIndex?: Map<string, number>;
    footer?: ReactNode;
}

export function TransactionList({ transactions, emptyMessage, emptyAction, sort = 'newest', colorIndex, footer }: TransactionListProps) {
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
        return format(date, 'd MMMM, EEEE', { locale });
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
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted"><ShoppingBag aria-hidden="true" className="h-6 w-6 text-muted-foreground" /></div>
                    <h3 className="text-base font-semibold text-muted-foreground">{emptyMessage || t('transactions.empty_state')}</h3>
                    {emptyAction && <div className="mt-5 flex justify-center">{emptyAction}</div>}
                </div>
            ) : (
                <div className="overflow-clip rounded-[20px] border border-[#232721] bg-[#151714] text-[#F1F3EE]">
                    <div className={`hidden items-center gap-x-4 border-b border-[#232721] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8D9388] md:grid ${ROW_GRID}`}>
                        <span aria-hidden="true" />
                        <span>{t('transactions.table.operation')}</span>
                        <span>{t('transactions.table.account')}</span>
                        <span>{t('transactions.table.time')}</span>
                        <span className="flex items-center justify-end gap-1.5 text-right">{t('transactions.table.amount')}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span>
                    </div>
                    <div>
                    {sortedDates.map((dateKey) => {
                        const dayTotal = getDayTotal(groupedTransactions[dateKey]);
                        return (
                        <div key={dateKey} className="[&:first-child>h2]:border-t-0">
                            <h2 className="flex items-center justify-between border-t border-[#1E211C] bg-[#121411] px-5 py-2.5 text-[13px] font-semibold">
                                <span>{getDateLabel(dateKey)}</span>
                                <span className={`font-medium tabular-nums ${dayTotal > 0 ? 'text-[#6EE7A0]' : 'text-[#8D9388]'}`}>{formatAmount(dayTotal, defaultCurrency, i18n.language, true)}</span>
                            </h2>
                            {groupedTransactions[dateKey].map((tx) => {
                                const accountName = getAccountName(tx.accountId);
                                const accountLabel = tx.type === 'transfer' ? `${accountName} → ${getAccountName(tx.toAccountId)}` : accountName;
                                const categoryName = getCategoryName(tx.category);
                                const title = tx.description || tx.merchant || categoryName;
                                const time = format(new Date(tx.date), 'HH:mm');
                                const isIn = tx.type === 'income';
                                const dot = PALETTE[(colorIndex?.get(categoryKey(tx.category)) ?? 0) % PALETTE.length];
                                return (
                                <div
                                    key={tx.id}
                                    className={`grid min-h-[56px] min-w-0 cursor-pointer items-center gap-x-4 border-t border-[#1E211C] px-5 py-3.5 text-left transition-colors duration-150 hover:bg-[#1A1D19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C6F24E] motion-reduce:transition-none ${ROW_GRID}`}
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
                                    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#1E211C]">
                                        {tx.type === 'transfer'
                                            ? <ArrowRightLeft aria-hidden="true" className="h-4 w-4 text-[#C9CEC3]" />
                                            : isIn
                                                ? <ArrowDownLeft aria-hidden="true" className="h-4 w-4 text-[#6EE7A0]" />
                                                : <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-[#C9CEC3]" />}
                                    </span>
                                    <span className="flex min-w-0 flex-col gap-[3px]">
                                        <span className="truncate text-sm font-semibold" title={title}>{title}</span>
                                        <span className="flex min-w-0 items-center gap-[7px] text-[12.5px] text-[#8D9388]">
                                            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
                                            <span className="shrink-0 md:truncate" title={tx.category}>{categoryName}</span>
                                            <span className="truncate md:hidden">&middot; {accountLabel}</span>
                                        </span>
                                    </span>
                                    <span className="hidden min-w-0 items-center gap-2 text-[13px] text-[#A2A89C] md:flex">
                                        <Wallet aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate" title={accountLabel}>{accountLabel}</span>
                                    </span>
                                    <span className="hidden text-[13px] tabular-nums text-[#8D9388] md:block">{time}</span>
                                    <span className="flex flex-col items-end gap-0.5 whitespace-nowrap">
                                        <span className={`text-[14.5px] font-semibold tabular-nums ${isIn ? 'text-[#6EE7A0]' : ''}`}>
                                            {formatAmount(tx.type === 'expense' ? -tx.amount : tx.amount, tx.currency, i18n.language, isIn)}
                                        </span>
                                        {tx.currency !== defaultCurrency && (
                                            <span className="text-xs tabular-nums text-[#8D9388]">
                                                &asymp; {formatAmount((tx.type === 'expense' ? -1 : 1) * convertCurrency(tx.amount, tx.currency, defaultCurrency), defaultCurrency, i18n.language, isIn)}
                                            </span>
                                        )}
                                        <span className="text-xs tabular-nums text-[#8D9388] md:hidden">{time}</span>
                                    </span>
                                </div>
                                );
                            })}
                        </div>
                        );
                    })}
                    </div>
                    {footer}
                </div>
            )}
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
