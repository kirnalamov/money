"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { TrendingUp, Award, Target, Zap } from "lucide-react";
import { useMemo } from "react";
import { startOfMonth, subMonths } from "date-fns";
import { convertCurrency, formatMoney } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function MotivationalStats() {
    const { transactions, accounts, goals, defaultCurrency } = useStore();
    const { t, i18n } = useTranslation();

    const insights = useMemo(() => {
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));

        // Calculate Spending
        const thisMonthSpend = transactions
            .filter(t => t.type === 'expense' && new Date(t.date) >= currentMonthStart)
            .reduce((acc, t) => acc + convertCurrency(t.amount, t.currency, defaultCurrency), 0);

        const lastMonthSpend = transactions
            .filter(t => t.type === 'expense' && new Date(t.date) >= lastMonthStart && new Date(t.date) < currentMonthStart)
            .reduce((acc, t) => acc + convertCurrency(t.amount, t.currency, defaultCurrency), 0);

        // Calculate Savings
        const totalSavings = accounts
            .filter(a => a.type === 'savings')
            .reduce((acc, a) => acc + convertCurrency(a.balance, a.currency, defaultCurrency), 0);

        const goalsHit = goals.filter(g => g.currentAmount >= g.targetAmount).length;

        let spendFeedback = t("profile.stats.tracking");
        let spendIcon = Target;

        if (lastMonthSpend > 0) {
            const diff = ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100;
            if (diff < -10) {
                spendFeedback = t("profile.stats.spent_less", { percent: Math.abs(diff).toFixed(0) });
                spendIcon = TrendingUp;
            } else if (diff > 10) {
                spendFeedback = t("profile.stats.spent_more", { percent: diff.toFixed(0) });
            } else {
                spendFeedback = t("profile.stats.spending_stable");
            }
        }

        // Top Category (Guilty Pleasure)
        const categoryTotals: Record<string, number> = {};
        transactions
            .filter(t => t.type === 'expense' && new Date(t.date) >= currentMonthStart)
            .forEach(t => {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + convertCurrency(t.amount, t.currency, defaultCurrency);
            });

        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
        const guiltyPleasure = topCategory
            ? t("profile.stats.favorite_category", { category: topCategory[0].split('.').pop() })
            : t("profile.stats.no_favorite_category");

        return {
            spendFeedback,
            spendIcon,
            totalSavings,
            goalsHit,
            guiltyPleasure
        };
    }, [transactions, accounts, goals, defaultCurrency, t]);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 h-full">
            {/* Hero Card */}
            <Card className="border-primary/20 bg-primary/5 lg:col-span-1">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Award className="h-5 w-5" />
                         {t("profile.stats.monthly_hype")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg font-medium leading-relaxed">
                        {insights.spendFeedback}
                    </p>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("profile.stats.total_savings")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tabular-nums">{formatMoney(insights.totalSavings, defaultCurrency, i18n.language)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t("profile.stats.savings_hint")}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("profile.stats.goals_hit")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {insights.goalsHit}
                            <Zap className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {insights.goalsHit > 0 ? t("profile.stats.goals_done") : t("profile.stats.goals_hint")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                        <CardTitle className="text-base">{t("profile.stats.fun_fact")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        {insights.guiltyPleasure}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
