"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { useMemo } from "react";
import { convertCurrency, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AssetAllocation() {
    const { t } = useTranslation();
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

    const COLORS = ['hsl(var(--primary))', '#2979FF', '#FFB300', '#AB47BC', '#00C853'];

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
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
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
                                formatter={(value: number) => formatCurrency(value, defaultCurrency)}
                                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Legend
                                layout="vertical"
                                verticalAlign="middle"
                                align="right"
                                formatter={(value, entry: any) => {
                                    const item = data.find(d => d.name === value);
                                    return (
                                        <span className="text-sm text-muted-foreground ml-2">
                                            {getLabel(value)} ({item?.percent.toFixed(1)}%)
                                        </span>
                                    );
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
