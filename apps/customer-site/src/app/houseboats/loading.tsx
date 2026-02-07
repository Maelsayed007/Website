import { Skeleton } from "@/components/ui/skeleton";

export default function HouseboatsLoading() {
    return (
        <div className="flex flex-col bg-white">
            {/* Hero Skeleton */}
            <section className="relative px-4 md:px-6 pb-8 md:pb-12">
                <div className="max-w-7xl mx-auto w-full aspect-[21/10] md:aspect-[21/9] min-h-[480px] max-h-[750px] relative rounded-b-[3rem] bg-slate-100 animate-pulse overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 p-12 flex flex-col items-center gap-4">
                        <Skeleton className="h-16 w-3/4 bg-white/20" />
                        <Skeleton className="h-10 w-1/2 bg-white/20" />
                        <Skeleton className="h-10 w-48 rounded-full bg-white/20 mt-4" />
                    </div>
                </div>
            </section>

            {/* Fleet Section Skeleton */}
            <section className="py-12 bg-[#34C759]/5">
                <div className="w-[95%] max-w-6xl mx-auto px-4 md:px-8">
                    <div className="mb-12 text-center">
                        <Skeleton className="h-12 w-64 mx-auto mb-4" />
                        <Skeleton className="h-4 w-96 mx-auto" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex flex-col gap-4">
                                <Skeleton className="aspect-[4/3] rounded-2xl w-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
