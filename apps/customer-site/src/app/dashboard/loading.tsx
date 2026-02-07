import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>

            {/* KPI Cards Skeleton */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Activity Sections Skeleton */}
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full rounded-lg" />
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
