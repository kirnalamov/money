"use client";

import { useAuth } from "@/contexts/auth-context";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function LogoutButton() {
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
            className="w-full justify-start"
        >
            <LogOut className="mr-2 h-4 w-4" />
            {t("common.sign_out")}
        </Button>
    );
}
