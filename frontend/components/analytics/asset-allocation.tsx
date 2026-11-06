"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { useMemo, useEffect, useRef, useState } from "react";
import { convertCurrency, formatMoney } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AssetAllocation() {
    const { t, i18n } = useTranslation();
    const { accounts, defaultCurrency } = useStore();
    const chartRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState(0);
    useEffect(() => {
        if (!chartRef.current) return;
        const observer = new ResizeObserver(([entry]) => setChartWidth(entry.contentRect.width));
        observer.observe(chartRef.current);
        return () => observer.disconnect();
    }, []);

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

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>{t('portfolio.allocation_title')}</CardTitle>
            </CardHeader>
            <CardContent>
                <div ref={chartRef} className="h-[300px] w-full min-w-0" aria-label={t('portfolio.allocation_title')}>
                    {chartWidth > 0 && <ResponsiveContainer width={chartWidth} height={300}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number, name) => [formatMoney(value, defaultCurrency, i18n.language), getLabel(String(name))]}
                                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Legend
                                layout="vertical"
                                verticalAlign="middle"
                                align="right"
                                content={() => (
                                    <ul aria-label={t('portfolio.allocation_title')}>
                                        {data.map((item, index) => (
                                            <li key={item.name} className="flex items-center">
                                                <span
                                                    aria-hidden="true"
                                                    className="h-2.5 w-2.5 rounded-full"
                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                />
                                                <span className="text-sm text-muted-foreground ml-2">
                                                    {getLabel(item.name)} ({item.percent.toFixed(1)}%)
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>}
                </div>
            </CardContent>
        </Card>
    );
}
