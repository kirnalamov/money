"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useStore } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getLegacyBackup } from "@/lib/legacy-backup";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const { fetchAllData, seedDemoPositions, isLoading: dataLoading, dataReady, dataError } = useStore();
    const [backup, setBackup] = useState<string | null>(null);

    useEffect(() => { setBackup(getLegacyBackup(localStorage)); }, []);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Store the attempted URL to redirect back after login
            sessionStorage.setItem("redirectAfterLogin", pathname);
            router.push("/login");
        }
        if (isAuthenticated) {
            void (async () => {
                await fetchAllData();
                if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" && user?.username === "demo") {
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

    return <>
        {backup && <Alert className="mb-4">
            <AlertTitle>{t("common.backup_title")}</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col gap-3">
                <span>{t("common.backup_description")}</span>
                <Button variant="outline" className="w-fit" onClick={() => {
                    const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }));
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'plutus-backup.json';
                    link.click();
                    URL.revokeObjectURL(url);
                }}>{t("common.backup_download")}</Button>
            </AlertDescription>
        </Alert>}
        {children}
    </>;
}
