'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QuickLoginForm() {
    return (
        <div className="w-full max-w-[280px] space-y-3 p-1">
            <h3 className="text-2xl font-display font-semibold tracking-tight text-[#18230F]">
                Staff Access Only
            </h3>
            <p className="text-sm text-slate-600">
                Customer login is currently disabled. Use the staff portal for backoffice access.
            </p>
            <Button asChild className="w-full rounded-full bg-brand-primary text-white hover:bg-brand-primary-strong">
                <Link href="/staff-login">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Go to Staff Login
                </Link>
            </Button>
        </div>
    );
}
