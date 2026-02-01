"use client";

import { useStore } from "@/lib/store";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { formatCurrency, convertCurrency } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateRange } from "react-day-picker";
import { Tag, TrendingUp, DollarSign, Award } from "lucide-react";

interface DetailedTagsProps {
    dateRange: DateRange | undefined;
}

export function DetailedTags({ dateRange }: DetailedTagsProps) {
    const { transactions, defaultCurrency, accounts } = useStore();
    const { t } = useTranslation();

    // Filter transactions by date range
    const filteredTransactions = transactions.filter(tx => {
        if (tx.type !== 'expense') return false;
        if (!dateRange?.from) return true;
        const date = new Date(tx.date);
        const from = dateRange.from;
        const to = dateRange.to || dateRange.from;
        return date >= from && date <= to;
    });

    // Aggregate expenses by tag
    const tagDataMap: Record<string, { value: number, count: number }> = {};
    let totalTaggedSpend = 0;

    filteredTransactions.forEach(tx => {
        const account = accounts.find(a => a.id === tx.accountId);
        if (!account) return;

        const amountInDefault = convertCurrency(tx.amount, account.currency, defaultCurrency);

        if (tx.tags && tx.tags.length > 0) {
            tx.tags.forEach(tag => {
                const normalizedTag = tag.trim(); // Keep case for display but maybe normalize for aggregation if strict
                // Ideally normalize to lowercase for aggregation key, keep original for display name
                const key = normalizedTag.toLowerCase();

                if (!tagDataMap[key]) {
                    tagDataMap[key] = { value: 0, count: 0 };
                }
                tagDataMap[key].value += amountInDefault;
                tagDataMap[key].count += 1;
                totalTaggedSpend += amountInDefault; // Note: this might double count if transaction has multiple tags. This is "Spend by Tag" volume.
            });
        }
    });

    const data = Object.entries(tagDataMap)
        .map(([key, stats]) => ({ name: key, ...stats }))
        .sort((a, b) => b.value - a.value);

    const topTag = data[0];
    const avgTagValue = data.length > 0 ? totalTaggedSpend / data.length : 0;

    // Most frequent tag
    const mostFrequent = [...data].sort((a, b) => b.count - a.count)[0];

    const colors = ['#00C853', '#2979FF', '#FFB300', '#F44336', '#AB47BC', '#009688', '#FF4081', '#3F51B5', '#FFC107', '#4CAF50'];

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground bg-card rounded-xl border border-dashed">
                <Tag className="w-12 h-12 mb-4 opacity-20" />
                <p>{t('analytics.tags.no_data_title')}</p>
                <p className="text-sm mt-2">{t('analytics.tags.no_data_desc')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('analytics.tags.top_spending')}</CardTitle>
                        <Award className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{topTag?.name || "N/A"}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatCurrency(topTag?.value || 0, defaultCurrency)} {t('analytics.tags.total')}
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('analytics.tags.most_frequent')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{mostFrequent?.name || "N/A"}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('analytics.tags.used_in_transactions', { count: mostFrequent?.count || 0 })}
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('analytics.tags.unique_tags')}</CardTitle>
                        <Tag className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('analytics.tags.active_tags')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Chart */}
            <Card className="p-6 h-[600px] glass-card">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-lg">{t('analytics.tags.chart_title')}</h3>
                        <p className="text-sm text-muted-foreground">{t('analytics.tags.chart_subtitle')}</p>
                    </div>
                </div>
                <div className="h-[500px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
                        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                            <XAxis type="number" tickFormatter={(val) => formatCurrency(val, defaultCurrency)} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={120}
                                tick={{ fill: 'hsl(var(--foreground))', fontSize: 13 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
                                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                                formatter={(value: number) => [formatCurrency(value, defaultCurrency), t('analytics.stats.total_spend')]}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
}
