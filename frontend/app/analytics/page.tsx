import { Suspense } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsContent } from "@/components/analytics/analytics-content";

export default function AnalyticsPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<Skeleton className="h-[240px] w-full rounded-2xl" role="status" />}>
                <AnalyticsContent />
            </Suspense>
        </ProtectedRoute>
    );
}
