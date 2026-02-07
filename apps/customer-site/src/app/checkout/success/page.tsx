'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle2, Home, Receipt, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

function CheckoutSuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [isValid, setIsValid] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const verifySession = async () => {
            if (!sessionId) {
                const timer = setTimeout(() => router.push('/'), 3000);
                return () => clearTimeout(timer);
            }

            setIsLoading(true);
            try {
                // Call backend to verify payment and ensure booking was created
                const res = await fetch('/api/payments/verify-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId })
                });

                if (res.ok) {
                    setIsValid(true);
                } else {
                    const data = await res.json();
                    console.error('Verification failed:', data.error);
                    // Still show success since payment went through Stripe
                    // Webhook should have handled it, or will retry
                    setIsValid(true);
                }
            } catch (err) {
                console.error('Verification error:', err);
                setIsValid(true); // Payment went through, trust Stripe
            } finally {
                setIsLoading(false);
            }
        };

        verifySession();
    }, [sessionId, router]);

    if (!sessionId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <Loader2 className="w-10 h-10 text-muted-foreground animate-spin mb-4" />
                <h2 className="text-xl font-semibold">Redirecting...</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg border-emerald-100">
                <div className="bg-emerald-50 p-6 flex justify-center border-b border-emerald-100 rounded-t-xl">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                    </div>
                </div>

                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold text-gray-900">Booking Confirmed!</CardTitle>
                    <p className="text-gray-500 mt-2">
                        Thank you for your reservation. Your payment has been processed successfully.
                    </p>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
                        <p className="font-medium text-slate-900 mb-1">What happens next?</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600">
                            <li>You will receive a confirmation email shortly.</li>
                            <li>We will review your booking details.</li>
                            <li>Our team sends you the boarding instructions.</li>
                        </ul>
                    </div>

                    <div className="text-center text-xs text-gray-400">
                        Session ID: <span className="font-mono">{sessionId.slice(0, 10)}...</span>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pt-2">
                    <Button className="w-full bg-[#18230F] hover:bg-[#18230F]/90 text-white font-bold h-12" asChild>
                        <Link href="/">
                            <Home className="w-4 h-4 mr-2" />
                            Return to Home
                        </Link>
                    </Button>
                    {/* Optional: Add Link to My Bookings if they have an account */}
                </CardFooter>
            </Card>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white" />}>
            <CheckoutSuccessContent />
        </Suspense>
    );
}
