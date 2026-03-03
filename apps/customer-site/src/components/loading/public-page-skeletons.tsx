import { Skeleton } from '@/components/ui/skeleton';

export function HomePageLoadingSkeleton() {
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden">
        <div className="min-h-[640px] bg-slate-100 px-4 pt-28 md:min-h-[760px] md:px-8 md:pt-40">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
            <Skeleton className="h-16 w-full max-w-3xl rounded-2xl bg-white/70 md:h-20" />
            <Skeleton className="mt-4 h-10 w-64 rounded-full bg-white/70" />
            <Skeleton className="mt-4 h-6 w-full max-w-2xl rounded-full bg-white/70" />
            <div className="mt-12 w-full max-w-[1120px] rounded-3xl border border-slate-200 bg-white p-4 md:p-5">
              <div className="grid gap-3 md:grid-cols-4">
                <Skeleton className="h-11 rounded-xl" />
                <Skeleton className="h-11 rounded-xl" />
                <Skeleton className="h-11 rounded-xl" />
                <Skeleton className="h-11 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14 md:py-16">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-3 h-11 w-full max-w-2xl" />
          <Skeleton className="mt-3 h-5 w-full max-w-3xl" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <article
                key={index}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <Skeleton className="h-9 w-40" />
                <Skeleton className="mt-3 h-16 w-36" />
                <Skeleton className="mt-4 h-5 w-full" />
                <Skeleton className="mt-2 h-5 w-11/12" />
                <Skeleton className="mt-6 h-10 w-40 rounded-full" />
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function HouseboatsListingLoadingSkeleton() {
  return (
    <div className="flex flex-col bg-white">
      <section className="relative px-4 pb-8 md:px-6 md:pb-12">
        <div className="mx-auto aspect-[21/10] min-h-[480px] w-full max-w-7xl overflow-hidden rounded-b-[3rem] bg-slate-100 md:aspect-[21/9] md:max-h-[750px]">
          <div className="flex h-full flex-col items-center justify-end gap-4 p-12">
            <Skeleton className="h-16 w-3/4 bg-white/70" />
            <Skeleton className="h-10 w-1/2 bg-white/70" />
            <Skeleton className="h-10 w-48 rounded-full bg-white/70" />
          </div>
        </div>
      </section>
      <section className="bg-slate-50 py-12">
        <div className="mx-auto w-[95%] max-w-6xl px-4 md:px-8">
          <div className="mb-12 text-center">
            <Skeleton className="mx-auto h-12 w-64" />
            <Skeleton className="mx-auto mt-3 h-4 w-96 max-w-full" />
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="flex flex-col gap-4">
                <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
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

export function RiverCruiseLoadingSkeleton() {
  return (
    <div className="bg-white">
      <section className="min-h-[56vh] bg-slate-100 px-4 pb-16 pt-28">
        <div className="mx-auto max-w-5xl text-center">
          <Skeleton className="mx-auto h-14 w-full max-w-2xl md:h-16" />
          <Skeleton className="mx-auto mt-4 h-6 w-full max-w-3xl" />
          <Skeleton className="mx-auto mt-5 h-9 w-72 rounded-full" />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-[380px] rounded-2xl" />
          ))}
        </div>
      </section>
    </div>
  );
}

export function RestaurantLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <section className="min-h-[66vh] bg-slate-100 px-4 pt-24 md:pt-32">
        <div className="mx-auto max-w-5xl text-center">
          <Skeleton className="mx-auto h-4 w-32 rounded-full bg-white/70" />
          <Skeleton className="mx-auto mt-3 h-14 w-full max-w-lg bg-white/70 md:h-16" />
          <Skeleton className="mx-auto mt-4 h-6 w-full max-w-2xl bg-white/70" />
          <Skeleton className="mx-auto mt-8 h-12 w-56 rounded-full bg-white/70" />
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="h-[420px] rounded-2xl" />
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      </section>
    </div>
  );
}

export function ContactLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-32 sm:pb-16 sm:pt-36">
      <div className="mb-10 text-center">
        <Skeleton className="mx-auto h-12 w-80" />
        <Skeleton className="mx-auto mt-3 h-5 w-full max-w-2xl" />
        <div className="mt-4 flex justify-center gap-2">
          <Skeleton className="h-8 w-56 rounded-full" />
          <Skeleton className="h-8 w-44 rounded-full" />
          <Skeleton className="h-8 w-44 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <Skeleton className="h-[540px] rounded-2xl lg:col-span-7" />
        <div className="space-y-6 lg:col-span-5">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function CheckoutLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white py-3">
        <div className="container mx-auto h-12 max-w-6xl px-4">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </header>
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid items-start gap-10 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-[560px] rounded-3xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-[500px] rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CheckoutStatusLoadingSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6">
        <Skeleton className="mx-auto h-20 w-20 rounded-full" />
        <Skeleton className="mx-auto mt-5 h-8 w-64" />
        <Skeleton className="mx-auto mt-3 h-5 w-72" />
        <Skeleton className="mt-8 h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function PaymentLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-8">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <Skeleton className="mx-auto h-10 w-40" />
        <div className="rounded-lg border border-[#18230f]/10 bg-white p-6">
          <Skeleton className="h-28 w-full rounded-lg" />
          <div className="mt-5 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HouseboatDetailLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#f6f7f9] pt-28">
      <div className="mx-auto w-full max-w-[1320px] space-y-6 px-4 md:px-6">
        <Skeleton className="h-7 w-72" />
        <div className="grid gap-3 lg:grid-cols-[1.45fr_1fr]">
          <Skeleton className="aspect-[4/3] rounded-[22px]" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="aspect-[4/3] rounded-[16px]" />
            ))}
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
