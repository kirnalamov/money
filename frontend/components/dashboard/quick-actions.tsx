import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Wallet, Target, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";

export function QuickActions() {
    const { t } = useTranslation();
    const router = useRouter();
    const [activeType, setActiveType] = useState<'expense' | 'income' | 'transfer' | null>(null);

    const actions = [
        {
            label: t("dashboard.quick_actions.new_expense"),
            icon: Plus,
            onClick: () => setActiveType('expense')
        },
        {
            label: t("dashboard.quick_actions.add_income"),
            icon: Wallet,
            onClick: () => setActiveType('income')
        },
        {
            label: t("dashboard.quick_actions.transfer"),
            icon: ArrowRightLeft,
            onClick: () => setActiveType('transfer')
        },
        {
            label: t("dashboard.quick_actions.set_goal"),
            icon: Target,
            onClick: () => router.push("/savings")
        },
    ];

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {actions.map((action, idx) => (
                    <Button
                        key={idx}
                        variant="outline"
                        className="h-auto py-4 flex flex-col gap-2 border-2 glass-hover hover:border-primary/50 hover:text-primary transition-all duration-300 shadow-sm text-center whitespace-normal group"
                        onClick={action.onClick}
                    >
                        <action.icon className="h-5 w-5 group-hover:drop-shadow-[0_0_8px_rgba(0,200,83,0.5)] transition-all duration-300" />
                        <span className="text-xs font-medium leading-tight">{action.label}</span>
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
