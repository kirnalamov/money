"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { TrendingUp, Award, Target, Zap } from "lucide-react";
import { useMemo } from "react";
import { startOfMonth, subMonths } from "date-fns";

export function MotivationalStats() {
    const { transactions, accounts, goals } = useStore();

    const insights = useMemo(() => {
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));

        // Calculate Spending
        const thisMonthSpend = transactions
            .filter(t => t.type === 'expense' && new Date(t.date) >= currentMonthStart)
            .reduce((acc, t) => acc + t.amount, 0);

        const lastMonthSpend = transactions
            .filter(t => t.type === 'expense' && new Date(t.date) >= lastMonthStart && new Date(t.date) < currentMonthStart)
            .reduce((acc, t) => acc + t.amount, 0);

        // Calculate Savings
        const totalSavings = accounts
            .filter(a => a.type === 'savings')
            .reduce((acc, a) => acc + a.balance, 0);

        const goalsHit = goals.filter(g => g.currentAmount >= g.targetAmount).length;

        let spendFeedback = "You're tracking your spending.";
        let spendIcon = Target;

        if (lastMonthSpend > 0) {
            const diff = ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100;
            if (diff < -10) {
                spendFeedback = `You've spent ${Math.abs(diff).toFixed(0)}% less than last month! Amazing work! 📉`;
                spendIcon = TrendingUp;
            } else if (diff > 10) {
                spendFeedback = `Spending is up ${diff.toFixed(0)}% vs last month. Keep an eye on it! range 👀`;
            } else {
                spendFeedback = "Your spending is stable compared to last month. Consistency is key! ⚖️";
            }
        }

        // Top Category (Guilty Pleasure)
        const categoryTotals: Record<string, number> = {};
        transactions
            .filter(t => t.type === 'expense' && new Date(t.date) >= currentMonthStart)
            .forEach(t => {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            });

        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
        const guiltyPleasure = topCategory
            ? `${topCategory[0].split('.').pop()} seems to be your favorite treat this month.`
            : "No clear favorite category yet.";

        return {
            spendFeedback,
            spendIcon,
            totalSavings,
            goalsHit,
            guiltyPleasure
        };
    }, [transactions, accounts, goals]);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 h-full">
            {/* Hero Card */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 lg:col-span-1">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Award className="h-5 w-5" />
                        Monthly Hype
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
                            Total Savings Power
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${insights.totalSavings.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Your safety net is looking strong!
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Goals Crushed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {insights.goalsHit}
                            <Zap className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {insights.goalsHit > 0 ? "You're unstoppable!" : "Set a goal and go for it!"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Fun Fact</CardTitle>
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
