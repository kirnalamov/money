import { Suspense } from "react";
import { AnalyticsContent } from "@/components/analytics/analytics-content";

export default function AnalyticsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
            <AnalyticsContent />
        </Suspense>
    );
}
