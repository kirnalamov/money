import { Suspense } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { AnalyticsContent } from "@/components/analytics/analytics-content";

export default function AnalyticsPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                <AnalyticsContent />
            </Suspense>
        </ProtectedRoute>
    );
}
