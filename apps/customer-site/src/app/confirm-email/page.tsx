'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabase, useAuth } from '@/components/providers/supabase-provider';
import { motion } from 'framer-motion';
import { Mail, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConfirmEmailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const { supabase } = useSupabase();
    const { user } = useAuth();
    const [isConfirmed, setIsConfirmed] = useState(false);

    useEffect(() => {
        if (user) {
            setIsConfirmed(true);
            setTimeout(() => {
                router.push('/my-bookings');
            }, 2000);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || session?.user) {
                setIsConfirmed(true);
                setTimeout(() => {
                    router.push('/my-bookings');
                }, 2000);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [user, supabase, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 pt-44 pb-12 font-sans px-4">
            <div className="w-full max-w-[420px] bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex justify-center mb-8"
                >
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center relative">
                        {isConfirmed ? (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-emerald-500"
                            >
                                <CheckCircle2 className="w-10 h-10" />
                            </motion.div>
                        ) : (
                            <>
                                <Mail className="w-10 h-10 text-emerald-500" />
                                <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full animate-ping" />
                            </>
                        )}
                    </div>
                </motion.div>

                <h1 className="text-4xl font-normal tracking-tight text-[#18230F] font-display mb-4">
                    {isConfirmed ? 'Account Verified' : 'Confirm your email'}
                </h1>

                <p className="text-[#18230F]/70 font-headline font-medium text-base mb-8 leading-relaxed">
                    {isConfirmed
                        ? "Thank you for confirming. We're getting your traveler dashboard ready..."
                        : `We've sent a magic link to ${email || 'your email'}. Please click it to activate your club membership.`
                    }
                </p>

                {!isConfirmed && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-center gap-3 text-[#18230F]/40 font-bold font-headline text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Waiting for confirmation
                        </div>

                        <div className="pt-6 border-t border-slate-100 italic text-[11px] text-[#18230F]/40 font-headline">
                            Can't find the email? Check your spam folder or wait a few moments.
                        </div>
                    </div>
                )}

                {isConfirmed && (
                    <Button
                        onClick={() => router.push('/my-bookings')}
                        className="w-full h-12 bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-normal rounded-full transition-all shadow-md flex items-center justify-center gap-2 group tracking-tight text-[20px] font-display border-none"
                    >
                        Go to Bookings <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                )}
            </div>
        </div>
    );
}
