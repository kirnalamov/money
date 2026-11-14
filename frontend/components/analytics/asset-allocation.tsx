"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { useMemo } from "react";
import { convertCurrency, formatMoney, formatMoneyCompact, formatPercent } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AssetAllocation() {
    const { t, i18n } = useTranslation();
    const { accounts, defaultCurrency } = useStore();

    const data = useMemo(() => {
        const groups: Record<string, number> = {};
        let total = 0;

        accounts.forEach(acc => {
            const amount = convertCurrency(acc.balance, acc.currency, defaultCurrency);
            if (amount > 0) {
                groups[acc.type] = (groups[acc.type] || 0) + amount;
                total += amount;
            }
        });

        return Object.entries(groups).map(([type, value]) => ({
            name: type,
            value: value,
            percent: total > 0 ? (value / total) * 100 : 0
        })).sort((a, b) => b.value - a.value);
    }, [accounts, defaultCurrency]);

    const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

    const getLabel = (key: string) => {
        // Mapping account types to readable labels
        // Assuming translation keys exist or using fallback
        const keyMap: Record<string, string> = {
            'bank': t('accounts.types.bank'),
            'savings': t('accounts.types.savings'),
            'cash': t('accounts.types.cash'),
            'brokerage': t('accounts.types.brokerage')
        };
        return keyMap[key] || key;
    };

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const chartLabel = `${t('portfolio.allocation_title')}: ${data.map((item) => `${getLabel(item.name)} ${formatPercent(item.percent, i18n.language)}`).join(', ')}`;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-base">{t('portfolio.allocation_title')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 items-center">
                {data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('analytics.common.no_data')}</p>
                ) : (
                    <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
                        <div role="img" aria-label={chartLabel} className="relative h-[180px] w-full min-w-0 max-w-[180px] shrink-0">
                            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
                                <span className="max-w-[96px] whitespace-nowrap text-center text-base font-bold leading-none tabular-nums">{formatMoneyCompact(total, defaultCurrency, i18n.language)}</span>
                                <span className="mt-1 text-xs text-muted-foreground">{t('dashboard.charts.total')}</span>
                            </div>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180} initialDimension={{ width: 180, height: 180 }}>
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={64}
                                        outerRadius={82}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="hsl(var(--card))"
                                        strokeWidth={2}
                                    >
                                        {data.map((entry, index) => (
                                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number, name) => [formatMoney(value, defaultCurrency, i18n.language), getLabel(String(name))]}
                                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <ul aria-label={t('portfolio.allocation_title')} className="w-full min-w-0 space-y-2 sm:w-auto">
                            {data.map((item, index) => (
                                <li key={item.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="min-w-0 truncate">{getLabel(item.name)}</span>
                                    <span className="ml-auto whitespace-nowrap tabular-nums text-foreground sm:ml-2">{formatPercent(item.percent, i18n.language)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
