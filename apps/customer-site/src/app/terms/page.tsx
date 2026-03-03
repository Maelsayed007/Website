export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fc] pt-32 pb-14">
      <div className="mx-auto max-w-4xl px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Legal</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#18230F]">Terms of Service</h1>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <p className="text-sm leading-7 text-slate-700">
            By using this website, you agree to provide accurate booking details and follow payment terms shown at checkout.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Reservation availability, prices, and confirmation status are subject to operational validation.
          </p>
        </div>
      </div>
    </main>
  );
}
