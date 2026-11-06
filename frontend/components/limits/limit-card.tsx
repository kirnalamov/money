"use client";

import { useTranslation } from "react-i18next";
import { LimitRule } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";

interface LimitCardProps {
    limit: LimitRule;
    onEdit: (limit: LimitRule) => void;
    onDelete: (id: string) => void;
}

export function LimitCard({ limit, onEdit, onDelete }: LimitCardProps) {
    const { t } = useTranslation();
    const percentage = limit.amount > 0 ? (limit.spent / limit.amount) * 100 : 0;
    const remaining = Math.max(0, limit.amount - limit.spent);
    const overrun = Math.max(0, limit.spent - limit.amount);

    // Determine color based on percentage
    let indicatorColor = "bg-primary";
    if (percentage > 100) indicatorColor = "bg-expense";
    else if (percentage >= 80) indicatorColor = "bg-warning";
    else indicatorColor = "bg-primary";

    return (
        <Card className="overflow-hidden rounded-2xl border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    <span className="max-w-[180px] truncate" title={limit.category}>{t(limit.category, { defaultValue: limit.category })}</span>
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                        ({t(`limits.periods.${limit.period}`)})
                    </span>
                </CardTitle>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(limit)} title={t("common.edit")} aria-label={t("common.edit")}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(limit.id)} title={t("common.delete")} aria-label={t("common.delete")}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                    {formatMoney(limit.spent, limit.currency)}
                    <span className="text-sm text-muted-foreground font-normal ml-2">
                        / {formatMoney(limit.amount, limit.currency)}
                    </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{limit.currency}</p>

                <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className={percentage > 100 ? "text-expense font-medium" : percentage >= 80 ? "text-warning font-medium" : "text-muted-foreground"}>
                            {Math.round(percentage)}% {t('limits.spent')}
                        </span>
                        <span className="text-muted-foreground">
                            {percentage > 100 ? (
                                <span className="text-expense">
                                    {t("limits.overrun", { amount: formatMoney(overrun, limit.currency) })}
                                </span>
                            ) : (
                                `${formatMoney(remaining, limit.currency)} ${t("limits.remaining")}`
                            )}
                        </span>
                    </div>
                    <Progress value={Math.min(100, percentage)} className="h-2" indicatorClassName={indicatorColor} />
                </div>
            </CardContent>
        </Card>
    );
}
