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
            color: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
            onClick: () => setActiveType('expense')
        },
        {
            label: t("dashboard.quick_actions.add_income"),
            icon: ArrowDownLeft,
            color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
            onClick: () => setActiveType('income')
        },
        {
            label: t("dashboard.quick_actions.transfer"),
            icon: ArrowLeftRight,
            color: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
            onClick: () => setActiveType('transfer')
        },
        {
            label: t("dashboard.quick_actions.set_goal"),
            icon: PiggyBank,
            color: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
            onClick: () => router.push("/savings")
        },
    ];

    return (
        <>
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t("dashboard.quick_actions.title")}</h3>
                <Button variant="link" className="h-auto p-0 text-primary" onClick={() => router.push("/transactions")}>{t("common.view_all")} <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {actions.map((action, idx) => (
                    <Button
                        key={idx}
                        variant="outline"
                        className="group min-h-[58px] h-auto justify-between rounded-[17px] border bg-card px-4 py-2.5 flex gap-3 hover:border-primary/30 hover:bg-accent shadow-none whitespace-normal"
                        onClick={action.onClick}
                    >
                        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", action.color)}><action.icon aria-hidden="true" className="h-5 w-5" /></span>
                        <span className="text-[15px] font-semibold leading-tight">{action.label}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
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
