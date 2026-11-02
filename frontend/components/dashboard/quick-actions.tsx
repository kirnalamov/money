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
            color: "bg-[rgba(242,118,131,0.12)] text-[#F27683]",
            onClick: () => setActiveType('expense')
        },
        {
            label: t("dashboard.quick_actions.add_income"),
            icon: ArrowDownLeft,
            color: "bg-[rgba(142,220,101,0.12)] text-[#8EDC65]",
            onClick: () => setActiveType('income')
        },
        {
            label: t("dashboard.quick_actions.transfer"),
            icon: ArrowLeftRight,
            color: "bg-[rgba(85,188,235,0.12)] text-[#55BCEB]",
            onClick: () => setActiveType('transfer')
        },
        {
            label: t("dashboard.quick_actions.set_goal"),
            icon: PiggyBank,
            color: "bg-[rgba(169,135,232,0.12)] text-[#A987E8]",
            onClick: () => router.push("/savings")
        },
    ];

    return (
        <>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t("dashboard.quick_actions.title")}</h3>
                <Button variant="link" className="h-auto p-0 text-primary" onClick={() => router.push("/transactions")}>{t("common.view_all")} <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-5">
                {actions.map((action, idx) => (
                    <Button
                        key={idx}
                        variant="outline"
                        className="group flex min-h-[58px] h-auto !justify-start gap-3 rounded-[17px] border border-[#292F2B] bg-[#111311] px-4 py-2.5 text-left shadow-none transition-colors duration-[180ms] hover:border-[rgba(192,240,92,0.25)] hover:bg-[#191D1A] whitespace-normal"
                        onClick={action.onClick}
                    >
                        <span className="flex min-w-0 items-center gap-3"><span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", action.color)}><action.icon aria-hidden="true" className="h-5 w-5" /></span><span className="text-[15px] font-semibold leading-tight">{action.label}</span></span>
                        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-[#89928B] transition-colors group-hover:text-[#C0F05C]" />
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
