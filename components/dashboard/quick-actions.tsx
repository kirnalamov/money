"use client";

import { useTranslation } from "react-i18next";
import { Plus, Wallet, Target, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActions() {
    const { t } = useTranslation();

    const actions = [
        { label: "New Expense", icon: Plus, onClick: () => console.log("Add expense triggered") },
        { label: "Add Income", icon: Wallet, onClick: () => console.log("Add income triggered") },
        { label: "Transfer", icon: ArrowRightLeft, onClick: () => console.log("Transfer triggered") },
        { label: "Set Goal", icon: Target, onClick: () => console.log("Set goal triggered") },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((action, idx) => (
                <Button
                    key={idx}
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
                    onClick={action.onClick}
                >
                    <action.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{action.label}</span>
                </Button>
            ))}
        </div>
    );
}
