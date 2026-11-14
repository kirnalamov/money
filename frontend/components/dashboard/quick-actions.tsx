import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { cn } from "@/lib/utils";

export function QuickActions() {
    const { t } = useTranslation();
    const router = useRouter();
    const [activeType, setActiveType] = useState<'expense' | 'income' | 'transfer' | null>(null);

    const actions = [
        {
            label: t("dashboard.quick_actions.new_expense"),
            icon: ArrowUpRight,
            color: "bg-muted text-expense",
            onClick: () => setActiveType('expense')
        },
        {
            label: t("dashboard.quick_actions.add_income"),
            icon: ArrowDownLeft,
            color: "bg-muted text-income",
            onClick: () => setActiveType('income')
        },
        {
            label: t("dashboard.quick_actions.transfer"),
            icon: ArrowLeftRight,
            color: "bg-muted text-foreground",
            onClick: () => setActiveType('transfer')
        },
        {
            label: t("dashboard.quick_actions.set_goal"),
            icon: PiggyBank,
            color: "bg-muted text-primary",
            onClick: () => router.push("/savings")
        },
    ];

    return (
        <>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold">{t("dashboard.quick_actions.title")}</h3>
                <Button variant="link" className="min-h-[44px] px-2 text-xs text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" onClick={() => router.push("/transactions")}>{t("common.view_all")} <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-5">
                {actions.map((action, idx) => (
                    <Button
                        key={idx}
                        variant="outline"
                        className="group flex min-h-[58px] h-auto !justify-start gap-3 rounded-2xl border border-border bg-card px-4 py-2.5 text-left shadow-none transition-colors hover:bg-accent whitespace-normal"
                        onClick={action.onClick}
                    >
                        <span className="flex min-w-0 items-center gap-3"><span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", action.color)}><action.icon aria-hidden="true" className="h-5 w-5" /></span><span className="text-sm font-semibold leading-tight">{action.label}</span></span>
                        <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </Button>
                ))}
            </div>

            {/* Dialogs */}
            <AddTransactionDialog
                open={activeType === 'expense'}
                onOpenChange={(open) => !open && setActiveType(null)}
                defaultType="expense"
                trigger={null}
            />
            <AddTransactionDialog
                open={activeType === 'income'}
                onOpenChange={(open) => !open && setActiveType(null)}
                defaultType="income"
                trigger={null}
            />
            <AddTransactionDialog
                open={activeType === 'transfer'}
                onOpenChange={(open) => !open && setActiveType(null)}
                defaultType="transfer"
                trigger={null}
            />
        </>
    );
}
