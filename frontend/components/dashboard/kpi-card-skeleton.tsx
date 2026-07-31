import { Skeleton } from "@/components/ui/skeleton"

export function KpiCardSkeleton() {
    return (
        <div className="rounded-xl border bg-card p-6 shadow">
            <div className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <div className="pt-2">
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
            </div>
        </div>
    )
}
