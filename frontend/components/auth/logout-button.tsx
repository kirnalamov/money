"use client";

import { useAuth } from "@/contexts/auth-context";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
    const { logout, isLoading } = useAuth();
    const { reset } = useStore();

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
            Logout
        </Button>
    );
}
