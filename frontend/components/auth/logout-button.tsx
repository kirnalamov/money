"use client";

import { useAuth } from "@/contexts/auth-context";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
    const { logout, isLoading } = useAuth();
    const { reset } = useStore();
    const { t } = useTranslation();

    const handleLogout = () => {
        reset();
        logout();
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoading}
            aria-label={t("common.sign_out")}
            title={collapsed ? t("common.sign_out") : undefined}
            className={collapsed ? "h-9 w-9 shrink-0 justify-center p-0" : "w-full justify-start"}
        >
            <LogOut className={collapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} />
            {!collapsed && t("common.sign_out")}
        </Button>
    );
}
