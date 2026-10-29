"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { TransactionType } from "@/types";

export type TransactionSort = 'newest' | 'oldest' | 'largest' | 'smallest';

interface TransactionFiltersProps {
    search: string;
    setSearch: (value: string) => void;
    type: TransactionType | 'all';
    setType: (value: TransactionType | 'all') => void;
    category: string;
    categoryOptions: string[];
    setCategory: (value: string) => void;
    accountId: string;
    setAccountId: (value: string) => void;
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    sort: TransactionSort;
    setSort: (value: TransactionSort) => void;
    activeFilterCount: number;
    resetFilters: () => void;
}

export function TransactionFilters({
    search,
    setSearch,
    type,
    setType,
    category,
    categoryOptions,
    setCategory,
    accountId,
    setAccountId,
    dateRange,
    setDateRange,
    sort,
    setSort,
    activeFilterCount,
    resetFilters
}: TransactionFiltersProps) {
    const { t } = useTranslation();
    const { accounts } = useStore();

    return (
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <SlidersHorizontal className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">{t('transactions.filters.title')}</p>
                        <p className="text-xs text-muted-foreground">{t('transactions.filters.description')}</p>
                    </div>
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1">
                            {t('transactions.filters.active_count', { count: activeFilterCount })}
                        </Badge>
                    )}
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    disabled={activeFilterCount === 0}
                    className="self-start px-2 sm:self-auto"
                    title={t('common.reset')}
                >
                    <X className="mr-2 h-4 w-4" />
                    {t('common.reset')}
                </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="relative min-w-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('transactions.filters.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 pl-8"
                        aria-label={t('transactions.filters.search_placeholder')}
                    />
                </div>
                <DatePickerWithRange
                    date={dateRange}
                    setDate={setDateRange}
                    className="w-full"
                    align="end"
                />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select value={type} onValueChange={(val) => setType(val as TransactionType | 'all')}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('transactions.type')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('transactions.filters.all_types')}</SelectItem>
                        <SelectItem value="expense">{t('transactions.types.expense')}</SelectItem>
                        <SelectItem value="income">{t('transactions.types.income')}</SelectItem>
                        <SelectItem value="transfer">{t('transactions.types.transfer')}</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('transactions.category')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('transactions.filters.all_categories')}</SelectItem>
                        {categoryOptions.map((categoryOption) => (
                            <SelectItem key={categoryOption} value={categoryOption}>{categoryOption}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('transactions.account')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('transactions.filters.all_accounts')}</SelectItem>
                        {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name} ({acc.currency})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={sort} onValueChange={(value) => setSort(value as TransactionSort)}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('transactions.filters.sort')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">{t('transactions.filters.sort_newest')}</SelectItem>
                        <SelectItem value="oldest">{t('transactions.filters.sort_oldest')}</SelectItem>
                        <SelectItem value="largest">{t('transactions.filters.sort_largest')}</SelectItem>
                        <SelectItem value="smallest">{t('transactions.filters.sort_smallest')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
