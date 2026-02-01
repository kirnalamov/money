"use client";

import { useTranslation } from "react-i18next";
import { Plus, Wallet, Target, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActions() {
    const { t } = useTranslation();

    const actions = [
        { label: t("dashboard.quick_actions.new_expense"), icon: Plus, onClick: () => console.log("Add expense triggered") },
        { label: t("dashboard.quick_actions.add_income"), icon: Wallet, onClick: () => console.log("Add income triggered") },
        { label: t("dashboard.quick_actions.transfer"), icon: ArrowRightLeft, onClick: () => console.log("Transfer triggered") },
        { label: t("dashboard.quick_actions.set_goal"), icon: Target, onClick: () => console.log("Set goal triggered") },
    ];

    return (
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
    );
}
