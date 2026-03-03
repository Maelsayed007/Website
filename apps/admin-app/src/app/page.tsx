export default function AdminPage() {
    return (
        <div className="flex min-h-screen items-center justify-center px-6 py-16">
            <div className="w-full max-w-xl rounded-3xl border border-[#18230F]/10 bg-white/90 p-10 shadow-[0_20px_50px_-20px_rgba(24,35,15,0.35)]">
                <p className="mb-3 inline-flex rounded-full bg-[#34C759]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#18230F]">
                    Staff Surface
                </p>
                <h1 className="mb-3 text-4xl font-bold tracking-tight text-[#18230F]">
                    Amieira Admin Portal
                </h1>
                <p className="mb-8 text-sm text-[#18230F]/70">
                    Access operational dashboards and reservation management tools.
                </p>
                <button className="inline-flex h-11 items-center justify-center rounded-xl bg-[#18230F] px-6 text-sm font-semibold text-white transition hover:bg-[#223117]">
                    Login with Staff Account
                </button>
            </div>
        </div>
    );
}
