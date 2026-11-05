"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, X, Filter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { TransactionType } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
        <div className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative min-w-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('transactions.filters.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 border-white/[.09] bg-[#161913] pl-8"
                        aria-label={t('transactions.filters.search_placeholder')}
                    />
                </div>
                <DatePickerWithRange
                    date={dateRange}
                    setDate={setDateRange}
                    className="w-full"
                    align="end"
                />
                <Popover>
                    <PopoverTrigger asChild><Button variant="outline" className="h-10 shrink-0 border-white/[.09] bg-[#161913]"><Filter className="mr-2 h-4 w-4" />{t('transactions.filters.filter_button')}{activeFilterCount > 0 && <Badge className="ml-1">{activeFilterCount}</Badge>}</Button></PopoverTrigger>
                    <PopoverContent className="space-y-3">
                        <p className="text-sm font-semibold">{t('transactions.filters.title')}</p>
                        <Select value={type} onValueChange={(val) => setType(val as TransactionType | 'all')}><SelectTrigger aria-label={t('transactions.type')}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('transactions.filters.all_types')}</SelectItem><SelectItem value="expense">{t('transactions.types.expense')}</SelectItem><SelectItem value="income">{t('transactions.types.income')}</SelectItem><SelectItem value="transfer">{t('transactions.types.transfer')}</SelectItem></SelectContent></Select>
                        <Select value={category} onValueChange={setCategory}><SelectTrigger aria-label={t('transactions.category')}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('transactions.filters.all_categories')}</SelectItem>{categoryOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
                        <Select value={accountId} onValueChange={setAccountId}><SelectTrigger aria-label={t('transactions.account')}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('transactions.filters.all_accounts')}</SelectItem>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name} ({acc.currency})</SelectItem>)}</SelectContent></Select>
                        <Button type="button" variant="ghost" onClick={resetFilters} disabled={activeFilterCount === 0}><X className="mr-2 h-4 w-4" />{t('common.reset')}</Button>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {[['all', t('transactions.filters.all_types')], ['expense', t('transactions.types.expense')], ['income', t('transactions.types.income')], ['transfer', t('transactions.types.transfer')]].map(([value, label]) => <Button key={value} type="button" variant={type === value ? 'secondary' : 'ghost'} size="sm" onClick={() => setType(value as TransactionType | 'all')} className="rounded-full">{label}</Button>)}
                <Select value={sort} onValueChange={(value) => setSort(value as TransactionSort)}><SelectTrigger className="ml-auto h-9 w-auto min-w-[150px] border-0 bg-transparent" aria-label={t('transactions.filters.sort')}><SlidersHorizontal className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">{t('transactions.filters.sort_newest')}</SelectItem><SelectItem value="oldest">{t('transactions.filters.sort_oldest')}</SelectItem><SelectItem value="largest">{t('transactions.filters.sort_largest')}</SelectItem><SelectItem value="smallest">{t('transactions.filters.sort_smallest')}</SelectItem></SelectContent></Select>
            </div>
            {/* Category and account stay in the popover so the primary row remains usable on narrow screens. */}
            <div className="hidden">
                <Select value={type} onValueChange={(val) => setType(val as TransactionType | 'all')}>
                    <SelectTrigger className="w-full" aria-label={t('transactions.type')}>
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
                    <SelectTrigger className="w-full" aria-label={t('transactions.category')}>
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
                    <SelectTrigger className="w-full" aria-label={t('transactions.account')}>
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
                    <SelectTrigger className="w-full" aria-label={t('transactions.filters.sort')}>
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
