"use client";

import { useStore } from "@/lib/store";
import { LimitCard } from "./limit-card";
import { useTranslation } from "react-i18next";
import { LimitRule } from "@/types";

interface LimitListProps {
    onEdit: (limit: LimitRule) => void;
}

export function LimitList({ onEdit }: LimitListProps) {
    const { limits, deleteLimit } = useStore();
    const { t } = useTranslation();

    const handleDelete = (id: string) => {
        if (confirm(t("limits.delete_confirm"))) {
            deleteLimit(id);
        }
    };

    if (limits.length === 0) {
        return (
            <div className="border rounded-xl p-12 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/10 border-dashed">
                <p>{t("limits.no_limits")}</p>
                <p className="text-sm mt-1">{t("limits.add_hint")}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in-50 duration-300">
            {limits.map(limit => (
                <LimitCard
                    key={limit.id}
                    limit={limit}
                    onEdit={onEdit}
                    onDelete={handleDelete}
                />
            ))}
        </div>
    );
}
