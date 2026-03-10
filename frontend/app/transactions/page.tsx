



"use client";

import ProtectedRoute from "@/components/auth/protected-route";

import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionSummary } from "@/components/transactions/transaction-summary";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionType } from "@/types";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { convertCurrency } from "@/lib/utils";

export default function TransactionsPage() {
  const { t } = useTranslation();
  const { transactions, accounts, defaultCurrency } = useStore();

  // Filters State
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TransactionType | 'all'>('all');
  const [accountId, setAccountId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Filter Logic
  const filteredTransactions = transactions.filter(tx => {
    // 1. Search
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesDesc = tx.description?.toLowerCase().includes(searchLower);
      const matchesCat = tx.category.toLowerCase().includes(searchLower);
      const matchesTags = tx.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      if (!matchesDesc && !matchesCat && !matchesTags) return false;
    }

    // 2. Type
    if (type !== 'all' && tx.type !== type) return false;

    // 3. Account
    if (accountId !== 'all' && tx.accountId.toString() !== accountId && tx.toAccountId?.toString() !== accountId) return false;

    // 4. Date Range
    if (dateRange?.from) {
      const txDate = new Date(tx.date);
      const end = dateRange.to || dateRange.from;
      // Set end of day for the end date to include all transactions on that day
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);

      if (txDate < dateRange.from || txDate > endOfDay) return false;
    }

    return true;
  });

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
    setAccountId('all');
    setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6 container mx-auto pb-20 md:pb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t('transactions.title')}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {filteredTransactions.length} {t('common.transactions').toLowerCase()} found
            </p>
          </div>
          <AddTransactionDialog />
        </div>

        <TransactionSummary
          income={stats.income}
          expense={stats.expense}
          net={stats.net}
        />

        <TransactionFilters
          search={search}
          setSearch={setSearch}
          type={type}
          setType={setType}
          accountId={accountId}
          setAccountId={setAccountId}
          dateRange={dateRange}
          setDateRange={setDateRange}
          resetFilters={resetFilters}
        />

        <TransactionList transactions={filteredTransactions} />
      </div>
    </ProtectedRoute>
  );
}
