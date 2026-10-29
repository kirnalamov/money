"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, convertCurrency } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Wallet, Landmark, PiggyBank } from "lucide-react";
import { useStore } from "@/lib/store";
import { useMemo } from "react";

export function NetWorthStats() {
    const { t } = useTranslation();
    const { accounts, defaultCurrency } = useStore();

    const stats = useMemo(() => {
        let total = 0;
        let liquid = 0;

        accounts.forEach(acc => {
            const amount = convertCurrency(acc.balance, acc.currency, defaultCurrency);
            total += amount;

            if (['bank', 'cash', 'savings'].includes(acc.type)) {
                liquid += amount;
            }

        });

        return { total, liquid };
    }, [accounts, defaultCurrency]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-primary">
                        {t('dashboard.net_worth_total')}
                    </CardTitle>
                    <Wallet className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary">
                        {formatCurrency(stats.total, defaultCurrency)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                        {t('analytics.stats.current_snapshot')}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t('analytics.stats.liquid_assets')}
                    </CardTitle>
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {formatCurrency(stats.liquid, defaultCurrency)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {stats.total > 0 ? `${((stats.liquid / stats.total) * 100).toFixed(1)}% ` : ""}{t('analytics.stats.of_total')}
                    </p>
                </CardContent>
            </Card>

            {/* Placeholder for maybe "Liabilities" or "Investment Return" if we had that data */}
            {/* For now sticking to 2 main cards or maybe a generic "Active Accounts" count? */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t('accounts.title')}
                    </CardTitle>
                    <PiggyBank className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {accounts.length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('analytics.stats.active_accounts')}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
