"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useStore } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const { fetchAllData, seedDemoPositions, isLoading: dataLoading, dataReady, dataError } = useStore();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Store the attempted URL to redirect back after login
            sessionStorage.setItem("redirectAfterLogin", pathname);
            router.push("/login");
        }
        if (isAuthenticated) {
            void (async () => {
                await fetchAllData();
                if (user?.username === "demo") {
                    seedDemoPositions();
                }
            })();
        }
    }, [isAuthenticated, isLoading, router, pathname, user?.username, fetchAllData, seedDemoPositions]);

    if (isLoading || (isAuthenticated && (!dataReady || dataLoading))) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">{t("common.loading")}</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (dataError) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center px-4">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertTitle>{t("common.data_load_failed_title")}</AlertTitle>
                    <AlertDescription className="mt-2 flex flex-col gap-4">
                        <span>{t(dataError)}</span>
                        <Button variant="outline" className="w-fit" onClick={() => void fetchAllData()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {t("common.retry")}
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return <>{children}</>;
}
