import { Skeleton } from '@/components/ui/skeleton';

export default function HouseboatReservationsLoading() {
  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-60 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-36 rounded-full" />
          <Skeleton className="h-9 w-full max-w-sm rounded-full" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <Skeleton className="h-[640px] w-full rounded-xl" />
      </div>
    </div>
  );
}
