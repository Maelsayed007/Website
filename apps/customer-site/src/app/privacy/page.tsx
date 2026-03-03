export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fc] pt-32 pb-14">
      <div className="mx-auto max-w-4xl px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Legal</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#18230F]">Privacy Policy</h1>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <p className="text-sm leading-7 text-slate-700">
            We process booking and account data only for operating reservations, payments, and support.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Contact us through the website contact page for data access, correction, or deletion requests.
          </p>
        </div>
      </div>
    </main>
  );
}
