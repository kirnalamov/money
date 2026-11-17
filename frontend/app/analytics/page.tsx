import { Suspense } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsView } from "@/components/analytics/analytics-view";

export default function AnalyticsPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<Skeleton className="h-[240px] w-full rounded-2xl" role="status" />}>
                <AnalyticsView />
            </Suspense>
        </ProtectedRoute>
    );
}
