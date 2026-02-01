"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
    const { logout, isLoading } = useAuth();

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            disabled={isLoading}
            className="w-full justify-start"
        >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
        </Button>
    );
}
