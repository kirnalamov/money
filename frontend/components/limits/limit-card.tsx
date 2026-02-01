"use client";

import { useTranslation } from "react-i18next";
import { LimitRule } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useStore } from "@/lib/store";

interface LimitCardProps {
    limit: LimitRule;
    onEdit: (limit: LimitRule) => void;
    onDelete: (id: string) => void;
}

export function LimitCard({ limit, onEdit, onDelete }: LimitCardProps) {
    const { t } = useTranslation();
    const { defaultCurrency } = useStore();

    const percentage = Math.min(100, (limit.spent / limit.amount) * 100);
    const remaining = Math.max(0, limit.amount - limit.spent);

    // Determine color based on percentage
    let indicatorColor = "bg-primary";
    if (percentage >= 100) indicatorColor = "bg-red-500";
    else if (percentage >= 75) indicatorColor = "bg-amber-500";
    else indicatorColor = "bg-emerald-500";

    return (
        <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {t(limit.category)}
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                        ({t(`limits.periods.${limit.period}`)})
                    </span>
                </CardTitle>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(limit)}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(limit.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {formatCurrency(limit.spent, limit.currency)}
                    <span className="text-sm text-muted-foreground font-normal ml-2">
                        / {formatCurrency(limit.amount, limit.currency)}
                    </span>
                </div>

                <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className={percentage >= 100 ? "text-red-500 font-medium" : "text-muted-foreground"}>
                            {Math.round(percentage)}% {t('limits.spent')}
                        </span>
                        <span className="text-muted-foreground">
                            {formatCurrency(remaining, limit.currency)} {t('limits.remaining')}
                        </span>
                    </div>
                    <Progress value={percentage} className="h-2" indicatorClassName={indicatorColor} />
                </div>
            </CardContent>
        </Card>
    );
}
