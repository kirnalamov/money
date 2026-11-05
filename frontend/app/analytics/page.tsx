import { Suspense } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { AnalyticsContent } from "@/components/analytics/analytics-content";

export default function AnalyticsPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
                <AnalyticsContent />
            </Suspense>
        </ProtectedRoute>
    );
}
