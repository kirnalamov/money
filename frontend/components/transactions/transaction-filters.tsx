"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { TransactionType } from "@/types";
import { categoryKey, getCategoryLabel } from "./transaction-list";
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
    // 'salary' и 'Salary' — одна метка; выбранное значение приоритетно, чтобы Select его нашёл.
    const uniqueCategories = Array.from(new Map(
        [...categoryOptions].reverse().map((item) => [categoryKey(item), item] as const)
    ).values()).reverse().map((item) => (categoryKey(item) === categoryKey(category) ? category : item));

    return (
        <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-0 flex-1 basis-full sm:basis-[260px]">
                    <Search aria-hidden="true" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8D9388]" />
                    <Input
                        id="transaction-search"
                        name="search"
                        type="search"
                        placeholder={t('transactions.filters.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                     className="h-11 min-w-11 rounded-xl border-[#232721] bg-[#151714] pl-10 text-sm text-[#F1F3EE] placeholder:text-[#8D9388]"
                        aria-label={t('transactions.filters.search_placeholder')}
                    />
                </div>
                <div role="group" aria-label={t('transactions.type')} className="flex h-11 max-w-full gap-0.5 overflow-x-auto rounded-xl border border-[#232721] bg-[#151714] p-1">
                    {[['all', t('transactions.filters.all')], ['expense', t('transactions.types.expense')], ['income', t('transactions.types.income')], ['transfer', t('transactions.types.transfer')]].map(([value, label]) => <button key={value} type="button" aria-pressed={type === value} onClick={() => setType(value as TransactionType | 'all')} className={`rounded-[9px] px-4 text-[13.5px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] ${type === value ? 'bg-[#2A2F27] text-[#F1F3EE]' : 'text-[#A2A89C] hover:text-[#F1F3EE]'}`}>{label}</button>)}
                </div>
                <DatePickerWithRange
                    date={dateRange}
                    setDate={setDateRange}
                    monthLabel
                    triggerClassName="h-11 gap-2.5 rounded-xl border-[#232721] bg-[#151714] px-4 text-sm font-medium text-[#F1F3EE] hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"
                    className="w-full sm:w-auto"
                    align="end"
                />
                <Popover>
                     <PopoverTrigger asChild><Button variant="outline" className="h-11 shrink-0 gap-2 rounded-xl border-[#232721] bg-[#151714] px-4 text-sm font-medium text-[#C9CEC3] hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"><SlidersHorizontal aria-hidden="true" className="h-4 w-4" />{t('transactions.filters.filter_button')}{activeFilterCount > 0 && <Badge className="ml-1 bg-primary text-primary-foreground">{activeFilterCount}</Badge>}</Button></PopoverTrigger>
                     <PopoverContent align="end" className="space-y-3 border-border bg-muted">
                        <p className="text-sm font-semibold">{t('transactions.filters.title')}</p>
                        <Select value={type} onValueChange={(val) => setType(val as TransactionType | 'all')}><SelectTrigger className="h-11 min-w-11 focus-visible:ring-2 focus-visible:ring-ring" aria-label={t('transactions.type')}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('transactions.filters.all_types')}</SelectItem><SelectItem value="expense">{t('transactions.types.expense')}</SelectItem><SelectItem value="income">{t('transactions.types.income')}</SelectItem><SelectItem value="transfer">{t('transactions.types.transfer')}</SelectItem></SelectContent></Select>
                        <Select value={category} onValueChange={setCategory}><SelectTrigger className="h-11 min-w-11 focus-visible:ring-2 focus-visible:ring-ring" aria-label={t('transactions.category')}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('transactions.filters.all_categories')}</SelectItem>{uniqueCategories.map((item) => <SelectItem key={item} value={item}>{getCategoryLabel(t, item)}</SelectItem>)}</SelectContent></Select>
                        <Select value={accountId} onValueChange={setAccountId}><SelectTrigger className="h-11 min-w-11 focus-visible:ring-2 focus-visible:ring-ring" aria-label={t('transactions.account')}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('transactions.filters.all_accounts')}</SelectItem>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name} ({acc.currency})</SelectItem>)}</SelectContent></Select>
                        <Select value={sort} onValueChange={(value) => setSort(value as TransactionSort)}><SelectTrigger className="h-11 min-w-11 focus-visible:ring-2 focus-visible:ring-ring" aria-label={t('transactions.filters.sort')}><ArrowUpDown aria-hidden="true" className="mr-1.5 h-4 w-4 shrink-0" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">{t('transactions.filters.sort_newest')}</SelectItem><SelectItem value="oldest">{t('transactions.filters.sort_oldest')}</SelectItem><SelectItem value="largest">{t('transactions.filters.sort_largest')}</SelectItem><SelectItem value="smallest">{t('transactions.filters.sort_smallest')}</SelectItem></SelectContent></Select>
                        <Button type="button" variant="ghost" onClick={resetFilters} disabled={activeFilterCount === 0}><X className="mr-2 h-4 w-4" />{t('common.reset')}</Button>
                    </PopoverContent>
                </Popover>
        </div>
    );
}
