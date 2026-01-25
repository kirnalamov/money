"use client";

import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { formatCurrency, cn } from "@/lib/utils";
import { Target, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link"; // Assuming next/link is available, or use router

export function GoalsSummary() {
    const { goals, defaultCurrency } = useStore();
    const { t } = useTranslation();

    // Take top 3 goals by priority (or just first 3 for now)
    const displayGoals = goals.slice(0, 3);

    if (goals.length === 0) {
        return (
            <div className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold">No Goals Set</h3>
                    <p className="text-sm text-muted-foreground mt-1">Start saving for your dreams today.</p>
                </div>
                <Link href="/savings">
                    <Button variant="outline" size="sm">Create Goal</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold leading-none tracking-tight">{t("savings.title") || "Goals"}</h3>
                <Link href="/savings">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </Link>
            </div>

            <div className="space-y-5">
                {displayGoals.map(goal => {
                    const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                    const isCompleted = progress >= 100;

                    return (
                        <div key={goal.id} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">{goal.name}</span>
                                <span className="text-muted-foreground">{progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full transition-all duration-500 rounded-full", isCompleted ? "bg-green-500" : "bg-primary")}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{formatCurrency(goal.currentAmount, goal.currency)}</span>
                                <span>{formatCurrency(goal.targetAmount, goal.currency)}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
