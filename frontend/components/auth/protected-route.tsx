"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useStore } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { fetchAllData } = useStore();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Store the attempted URL to redirect back after login
            sessionStorage.setItem("redirectAfterLogin", pathname);
            router.push("/login");
        }
        if (isAuthenticated) {
            fetchAllData();
        }
    }, [isAuthenticated, isLoading, router, pathname, fetchAllData]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
