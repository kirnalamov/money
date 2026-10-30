import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Wallet, Target, ArrowRightLeft } from "lucide-react";
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
            icon: Plus,
            color: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
            onClick: () => setActiveType('expense')
        },
        {
            label: t("dashboard.quick_actions.add_income"),
            icon: Wallet,
            color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
            onClick: () => setActiveType('income')
        },
        {
            label: t("dashboard.quick_actions.transfer"),
            icon: ArrowRightLeft,
            color: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
            onClick: () => setActiveType('transfer')
        },
        {
            label: t("dashboard.quick_actions.set_goal"),
            icon: Target,
            color: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
            onClick: () => router.push("/savings")
        },
    ];

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {actions.map((action, idx) => (
                    <Button
                        key={idx}
                        variant="outline"
                        className="h-24 items-start justify-between rounded-[1.4rem] border bg-card p-3 flex flex-col gap-2 hover:bg-accent shadow-none text-left whitespace-normal"
                        onClick={action.onClick}
                    >
                        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", action.color)}><action.icon aria-hidden="true" className="h-4 w-4" /></span>
                        <span className="text-sm font-medium leading-tight">{action.label}</span>
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
