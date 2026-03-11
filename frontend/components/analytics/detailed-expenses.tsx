"use client";

import { useStore } from "@/lib/store";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, PieChart, Pie, Legend } from "recharts";
import { formatCurrency, convertCurrency } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, DollarSign, PieChart as PieIcon, BarChart as BarIcon, FilterX, AlertCircle, Building, ShoppingBag, AlertTriangle, ArrowRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { SpendVelocityChart } from "@/components/analytics/spend-velocity-chart";
import { SpendingHeatmap } from "@/components/analytics/spending-heatmap";
import { calculateForecast } from "@/components/analytics/insights-engine";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DetailedExpensesProps {
    dateRange: DateRange | undefined;
}

type ChartType = 'pie' | 'bar';

export function DetailedExpenses({ dateRange }: DetailedExpensesProps) {
    const { transactions, defaultCurrency, accounts, categories } = useStore();
    const { t } = useTranslation();
    const [chartType, setChartType] = useState<ChartType>('pie');
    const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set());
    const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set(accounts.map(a => a.id)));

    // Toggle logic
    const toggleCategory = (cat: string) => {
        const newSet = new Set(excludedCategories);
        if (newSet.has(cat)) newSet.delete(cat);
        else newSet.add(cat);
        setExcludedCategories(newSet);
    };

    const toggleAccount = (id: number) => {
        const newSet = new Set(selectedAccounts);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedAccounts(newSet);
    };

    // Filter transactions
    const filteredTransactions = transactions.filter(tx => {
        if (tx.type !== 'expense') return false;

        if (!dateRange?.from) return true;
        const date = new Date(tx.date);
        const from = dateRange.from;
        const to = dateRange.to || dateRange.from;
        if (date < from || date > to) return false;

        if (!selectedAccounts.has(tx.accountId)) return false;
        if (excludedCategories.has(tx.category)) return false;

        return true;
    });

    // Aggregations
    const categoryData: Record<string, number> = {};
    let totalSpend = 0;

    // Calculate Fixed vs Variable
    const totalFixed = filteredTransactions
        .filter(t => t.isRecurring)
        .reduce((acc, t) => {
            const account = accounts.find(a => a.id === t.accountId);
            if (!account) return acc;
            return acc + convertCurrency(t.amount, account.currency, defaultCurrency);
        }, 0);

    filteredTransactions.forEach(tx => {
        const account = accounts.find(a => a.id === tx.accountId);
        if (!account) return;
        const amount = convertCurrency(tx.amount, account.currency, defaultCurrency);
        categoryData[tx.category] = (categoryData[tx.category] || 0) + amount;
        totalSpend += amount;
    });

    const totalVariable = totalSpend - totalFixed;
    const fixedRatio = totalSpend > 0 ? (totalFixed / totalSpend) * 100 : 0;

    // Get all unique categories from ALL expense transactions for the sidebar list
    const allCategories = Array.from(new Set(transactions.filter(t => t.type === 'expense').map(t => t.category))).sort();

    const data = Object.entries(categoryData)
        .map(([name, value]) => {
            const catObj = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
            return { name, value, color: catObj?.color };
        })
        .sort((a, b) => b.value - a.value);

    // Stats
    const days = dateRange?.from && dateRange?.to
        ? Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        : 30;

    const avgDaily = totalSpend / days;
    const topCategory = data[0];

    // Uncategorized Warning Logic
    const uncategorizedAmount = categoryData['Uncategorized'] || 0;
    const uncategorizedShare = totalSpend > 0 ? (uncategorizedAmount / totalSpend) * 100 : 0;
    // Show warning if > 15% and amount is significant (> 1000 whatever currency units, logic simplification)
    const isUncategorizedHigh = uncategorizedShare > 15 && uncategorizedAmount > 0;

    const colors = ['#00C853', '#2979FF', '#FFB300', '#F44336', '#AB47BC', '#009688', '#FF4081', '#3F51B5', '#FFC107', '#4CAF50'];

    // Forecast (Calculated globally for simplicity)
    const forecast = calculateForecast(transactions, accounts, defaultCurrency);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content (Charts & Stats) */}
            <div className="lg:col-span-3 space-y-6">

                {/* Diagnosis Alerts */}
                {isUncategorizedHigh && (
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-foreground">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <AlertTitle className="text-destructive font-semibold">{t('analytics.forecast.uncategorized_warning_title')}</AlertTitle>
                        <AlertDescription className="flex items-center justify-between text-xs sm:text-sm mt-1">
                            <span dangerouslySetInnerHTML={{ __html: t('analytics.forecast.uncategorized_warning_desc', { percent: uncategorizedShare.toFixed(1) }) }} />
                        </AlertDescription>
                    </Alert>
                )}

                {/* Insights Engine (New Selection) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Velocity Chart */}
                    <div className="h-[460px]">
                        <SpendVelocityChart />
                    </div>
                    {/* Forecast & Heatmap Column */}
                    <div className="space-y-4 h-[460px] flex flex-col">
                        <Card className="glass-card flex-none">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base text-muted-foreground flex justify-between items-center">
                                    <span>{t('analytics.forecast.title')}</span>
                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                        {t('analytics.forecast.active')}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold mt-1">
                                    {formatCurrency(forecast.projectedSpend, defaultCurrency)}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                                    <span>{t('analytics.forecast.current')}: {formatCurrency(forecast.currentSpend, defaultCurrency)}</span>
                                    <span>{t('analytics.forecast.burn')}: {formatCurrency(forecast.burnRate, defaultCurrency)}/day</span>
                                </div>
                                <div className="w-full bg-secondary h-2 rounded-full mt-3 overflow-hidden">
                                    <div
                                        className="bg-primary h-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, (forecast.currentSpend / forecast.projectedSpend) * 100)}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        {/* Heatmap Mini */}
                        <div className="flex-1 overflow-hidden">
                            <SpendingHeatmap />
                        </div>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="glass-card premium-gradient">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <DollarSign className="w-4 h-4" /> {t('analytics.stats.total_spend')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalSpend, defaultCurrency)}</div>
                            <p className="text-xs text-muted-foreground mt-1">{t('analytics.stats.in_selected_period')}</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" /> {t('analytics.stats.avg_daily')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(avgDaily, defaultCurrency)}</div>
                            <p className="text-xs text-muted-foreground mt-1">~{formatCurrency(avgDaily * 30, defaultCurrency)} {t('analytics.stats.per_month')}</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingDown className="w-4 h-4" /> {t('analytics.stats.top_category')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate">{topCategory?.name || "N/A"}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {topCategory ? `${((topCategory.value / totalSpend) * 100).toFixed(1)}% ${t('analytics.stats.of_total')}` : t('common.no_data')}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Mandatory Spending Summary */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('analytics.stats.fixed_costs')}</CardTitle>
                            <Building className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalFixed, defaultCurrency)}</div>
                            <p className="text-xs text-muted-foreground">
                                {fixedRatio.toFixed(0)}{t('analytics.stats.of_total_spending')}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('analytics.stats.discretionary')}</CardTitle>
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalVariable, defaultCurrency)}</div>
                            <p className="text-xs text-muted-foreground">
                                {(100 - fixedRatio).toFixed(0)}{t('analytics.stats.of_total_spending')}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main breakdowns Chart */}
                <Card className="p-6 h-[500px] glass-card flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-semibold text-lg">{t('analytics.breakdown.title')}</h3>
                            <p className="text-sm text-muted-foreground">{t('analytics.breakdown.subtitle')}</p>
                        </div>
                        <div className="flex bg-muted p-1 rounded-lg shrink-0">
                            <Button
                                variant={chartType === 'pie' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => setChartType('pie')}
                            >
                                <PieIcon className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">{t('dashboard.charts.chart_types.pie')}</span>
                                <span className="sm:hidden">{t('dashboard.charts.chart_types.pie').slice(0, 1)}</span>
                            </Button>
                            <Button
                                variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => setChartType('bar')}
                            >
                                <BarIcon className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">{t('dashboard.charts.chart_types.bar')}</span>
                                <span className="sm:hidden">{t('dashboard.charts.chart_types.bar').slice(0, 1)}</span>
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        {data.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                {t('analytics.common.no_data')}
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
                                {chartType === 'pie' ? (
                                    <PieChart>
                                        <Pie
                                            data={data}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={140}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} strokeWidth={2} stroke="hsl(var(--card))" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                                            formatter={(value: number) => [formatCurrency(value, defaultCurrency), 'Spend']}
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                ) : (
                                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
                                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                                            formatter={(value: number) => [formatCurrency(value, defaultCurrency), 'Spend']}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                            {data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        )}
                    </div>
                </Card>
            </div>

            {/* Settings Sidebar */}
            <div className="space-y-6">
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="text-base">{t('analytics.settings.title')}</CardTitle>
                        <CardDescription>{t('analytics.settings.subtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Accounts Filter */}
                        <div className="space-y-3">
                            <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">{t('analytics.settings.accounts')}</Label>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                {accounts.map(acc => (
                                    <div key={acc.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`acc-${acc.id}`}
                                            checked={selectedAccounts.has(acc.id)}
                                            onCheckedChange={() => toggleAccount(acc.id)}
                                        />
                                        <Label htmlFor={`acc-${acc.id}`} className="text-sm font-normal truncate cursor-pointer">
                                            {acc.name}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        {/* Category Exclusion */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">{t('analytics.settings.exclude_categories')}</Label>
                                <FilterX className="w-3 h-3 text-muted-foreground" />
                            </div>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {allCategories.map(cat => (
                                    <div key={cat} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`cat-${cat}`}
                                            checked={excludedCategories.has(cat)}
                                            onCheckedChange={() => toggleCategory(cat)}
                                        />
                                        <Label htmlFor={`cat-${cat}`} className="text-sm font-normal truncate cursor-pointer">
                                            {cat}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
