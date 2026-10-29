



"use client";

import ProtectedRoute from "@/components/auth/protected-route";

import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { TransactionFilters, TransactionSort } from "@/components/transactions/transaction-filters";
import { TransactionSummary } from "@/components/transactions/transaction-summary";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionType } from "@/types";
import { DateRange } from "react-day-picker";
import { endOfMonth, isSameDay, startOfMonth } from "date-fns";
import { convertCurrency } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const { t } = useTranslation();
  const { transactions, accounts, categories, defaultCurrency } = useStore();

  // Filters State
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TransactionType | 'all'>('all');
  const [category, setCategory] = useState<string>('all');
  const [accountId, setAccountId] = useState<string>('all');
  const [sort, setSort] = useState<TransactionSort>('newest');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [page, setPage] = useState(1);

  const filteredTransactions = useMemo(() => transactions.filter(tx => {
    if (search.trim()) {
      const searchLower = search.trim().toLowerCase();
      const account = accounts.find(item => item.id === tx.accountId);
      const destinationAccount = tx.toAccountId ? accounts.find(item => item.id === tx.toAccountId) : undefined;
      const searchableValues = [
        tx.description,
        tx.merchant,
        tx.category,
        account?.name,
        destinationAccount?.name,
        ...(tx.tags || []),
      ].filter(Boolean).map(value => value!.toLowerCase());
      if (!searchableValues.some(value => value.includes(searchLower))) return false;
    }

    if (type !== 'all' && tx.type !== type) return false;

    if (category !== 'all' && tx.category !== category) return false;

    if (accountId !== 'all' && tx.accountId.toString() !== accountId && tx.toAccountId?.toString() !== accountId) return false;

    if (dateRange?.from) {
      const txDate = new Date(tx.date);
      const end = dateRange.to || dateRange.from;
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);

      if (txDate < dateRange.from || txDate > endOfDay) return false;
    }

    return true;
  }), [accountId, accounts, category, dateRange, search, transactions, type]);

  const sortedTransactions = useMemo(() => [...filteredTransactions].sort((a, b) => {
    if (sort === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sort === 'largest' || sort === 'smallest') {
      const accountA = accounts.find(account => account.id === a.accountId);
      const accountB = accounts.find(account => account.id === b.accountId);
      const amountA = convertCurrency(a.amount, accountA?.currency || a.currency, defaultCurrency);
      const amountB = convertCurrency(b.amount, accountB?.currency || b.currency, defaultCurrency);
      return sort === 'largest' ? amountB - amountA : amountA - amountB;
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  }), [accounts, defaultCurrency, filteredTransactions, sort]);

  const pageCount = Math.max(1, Math.ceil(sortedTransactions.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedTransactions = sortedTransactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Stats Calculation
  const stats = filteredTransactions.reduce((acc, tx) => {
    const account = accounts.find(a => a.id === tx.accountId);
    if (!account) return acc;

    const convertedAmount = convertCurrency(tx.amount, account.currency, defaultCurrency);

    if (tx.type === 'income') {
      acc.income += convertedAmount;
      acc.net += convertedAmount;
    } else if (tx.type === 'expense') {
      acc.expense += convertedAmount;
      acc.net -= convertedAmount;
    }
    return acc;
  }, { income: 0, expense: 0, net: 0 });

  const resetFilters = () => {
    setSearch("");
    setType('all');
    setCategory('all');
    setAccountId('all');
    setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    setPage(1);
  };

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const updateType = (value: TransactionType | 'all') => {
    setType(value);
    setPage(1);
  };
  const updateCategory = (value: string) => {
    setCategory(value);
    setPage(1);
  };
  const updateAccountId = (value: string) => {
    setAccountId(value);
    setPage(1);
  };
  const updateDateRange = (value: DateRange | undefined) => {
    setDateRange(value);
    setPage(1);
  };
  const updateSort = (value: TransactionSort) => {
    setSort(value);
    setPage(1);
  };

  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  const isDefaultDateRange = Boolean(
    dateRange?.from && dateRange.to &&
    isSameDay(dateRange.from, currentMonthStart) &&
    isSameDay(dateRange.to, currentMonthEnd)
  );
  const activeFilterCount = [
    search.trim(),
    type !== 'all',
    category !== 'all',
    accountId !== 'all',
    !isDefaultDateRange,
  ].filter(Boolean).length;
  const categoryOptions = Array.from(new Set([
    ...categories.map(item => item.name),
    ...transactions.map(transaction => transaction.category),
  ])).sort((a, b) => a.localeCompare(b));

  return (
    <ProtectedRoute>
      <div className="container mx-auto space-y-6 pb-20 md:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-1 rounded-xl bg-primary/10 p-3 text-primary">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">{t('transactions.title')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
              {t('transactions.results_count', { count: filteredTransactions.length })}
              </p>
            </div>
          </div>
          <div className="w-full shrink-0 sm:w-auto">
            <AddTransactionDialog />
          </div>
        </div>

        <TransactionSummary
          income={stats.income}
          expense={stats.expense}
          net={stats.net}
          transactionCount={filteredTransactions.length}
        />

        <TransactionFilters
          search={search}
          setSearch={updateSearch}
          type={type}
          setType={updateType}
          category={category}
          categoryOptions={categoryOptions}
          setCategory={updateCategory}
          accountId={accountId}
          setAccountId={updateAccountId}
          dateRange={dateRange}
          setDateRange={updateDateRange}
          sort={sort}
          setSort={updateSort}
          activeFilterCount={activeFilterCount}
          resetFilters={resetFilters}
        />

        <TransactionList
          transactions={pagedTransactions}
          sort={sort}
          emptyMessage={transactions.length > 0 ? t('transactions.no_matches') : undefined}
          emptyAction={transactions.length > 0 ? (
            <Button type="button" variant="outline" onClick={resetFilters}>
              {t('common.reset')}
            </Button>
          ) : (
            <AddTransactionDialog />
          )}
        />

        {pageCount > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <span className="text-sm text-muted-foreground">
              {t('transactions.pagination.page', { current: currentPage, total: pageCount })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label={t('transactions.pagination.previous')}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t('transactions.pagination.previous')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((currentPage) => Math.min(pageCount, currentPage + 1))}
                disabled={currentPage === pageCount}
                aria-label={t('transactions.pagination.next')}
              >
                {t('transactions.pagination.next')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
