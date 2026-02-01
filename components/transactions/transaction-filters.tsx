"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { TransactionType } from "@/types";

interface TransactionFiltersProps {
    search: string;
    setSearch: (value: string) => void;
    type: TransactionType | 'all';
    setType: (value: TransactionType | 'all') => void;
    accountId: string;
    setAccountId: (value: string) => void;
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    resetFilters: () => void;
}

export function TransactionFilters({
    search,
    setSearch,
    type,
    setType,
    accountId,
    setAccountId,
    dateRange,
    setDateRange,
    resetFilters
}: TransactionFiltersProps) {
    const { t } = useTranslation();
    const { accounts } = useStore();

    return (
        <div className="flex flex-col gap-4 p-4 bg-card border rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('transactions.filters.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>

                {/* Date Range */}
                <DatePickerWithRange
                    date={dateRange}
                    setDate={setDateRange}
                    className="w-full md:w-[260px]"
                    align="end"
                />
            </div>

            <div className="flex flex-col md:flex-row gap-4 text-sm">
                {/* Type Filter */}
                <Select value={type} onValueChange={(val) => setType(val as any)}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder={t('transactions.type')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('dashboard.date_filters.all')}</SelectItem>
                        <SelectItem value="expense">{t('transactions.types.expense')}</SelectItem>
                        <SelectItem value="income">{t('transactions.types.income')}</SelectItem>
                        <SelectItem value="transfer">{t('transactions.types.transfer')}</SelectItem>
                    </SelectContent>
                </Select>

                {/* Account Filter */}
                <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder={t('transactions.account')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('dashboard.charts.select_accounts')}</SelectItem>
                        {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Reset */}
                <Button variant="ghost" onClick={resetFilters} className="px-3" title={t('common.reset')}>
                    <X className="h-4 w-4 mr-2" />
                    {t('common.reset')}
                </Button>
            </div>
        </div>
    );
}
