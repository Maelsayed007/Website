
'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation'; // Although we'll handle loading states manually
import { format } from 'date-fns';
import { Loader2, CheckCircle, AlertCircle, CreditCard, Building, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
// We might need UI components if available, defaulting to standard Tailwind

type BookingSummary = {
    id: string;
    clientName: string;
    serviceType: string;
    startDate: string;
    endDate?: string;
    amountDue: number;
    currency: string;
};

import { useParams, useSearchParams, useRouter } from 'next/navigation';

export default function PaymentPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const token = params?.token as string;
    const sessionId = searchParams.get('session_id');
    const successParam = searchParams.get('success');
    const canceledParam = searchParams.get('canceled');

    const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'paid' | 'success' | 'verifying'>('loading');
    const [booking, setBooking] = useState<BookingSummary | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    // Billing Form State
    const [needsInvoice, setNeedsInvoice] = useState(false);
    const [billingInfo, setBillingInfo] = useState({
        name: '',
        nif: '',
        address: ''
    });
    const [processing, setProcessing] = useState(false);

    // Fetch Token Validity
    useEffect(() => {
        console.log("PAYMENT PAGE MOUNTED. Token:", token);

        if (!token) {
            console.log("No token yet...");
            return;
        }

        console.log("Fetching validation for:", token);

        fetch(`/api/payments/link/validate?token=${token}`)
            .then(res => {
                console.log("Fetch Status:", res.status);
                return res.json();
            })
            .then(data => {
                console.log("Validation Data:", data);
                if (data.error) {
                    setStatus('invalid');
                    setErrorMessage(data.error);
                } else {
                    setBooking(data.booking);
                    setBillingInfo(prev => ({ ...prev, name: data.booking.clientName }));
                    setStatus('valid');
                }
            })
            .catch((e) => {
                console.error("Fetch Error:", e);
                setStatus('invalid');
                setErrorMessage("Failed to validate link (Network Error).");
            });

        // Safety timeout in case fetch hangs
        const timer = setTimeout(() => {
            setStatus((prev) => prev === 'loading' ? 'invalid' : prev);
            if (status === 'loading') setErrorMessage("Loading timed out. Please refresh.");
        }, 10000);

        return () => clearTimeout(timer);
    }, [token]);

    // Handle Return from Stripe
    useEffect(() => {
        if (successParam && sessionId && token) {
            setStatus('verifying');

            fetch('/api/payments/verify-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, token })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setStatus('success');
                    } else {
                        setStatus('invalid'); // Or error state
                        setErrorMessage(data.error || "Payment verification failed.");
                    }
                })
                .catch(err => {
                    console.error("Verify Error:", err);
                    setErrorMessage("Failed to verify payment.");
                    setStatus('invalid');
                });
        }

        if (canceledParam) {
            setErrorMessage("Payment was canceled.");
            // Keep on form to try again?
        }
    }, [successParam, sessionId, token, canceledParam]);

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        try {
            // New Flow: Create Checkout Session & Redirect
            const res = await fetch('/api/payments/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: token,
                    billingInfo: needsInvoice ? billingInfo : null
                })
            });
            const data = await res.json();

            if (data.url) {
                // Redirect to Stripe
                window.location.href = data.url;
            } else {
                alert(data.error || 'Failed to initialize payment');
                setProcessing(false);
            }
        } catch (err) {
            alert('Something went wrong. Please try again.');
            setProcessing(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-[#F1F8F1] flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-[#18230F] animate-spin" />
                <p className="mt-4 text-sm text-gray-500 font-medium">Initializing Payment Interface...</p>
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div className="min-h-screen bg-[#F1F8F1] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h1 className="text-xl font-bold text-[#18230F]">Link Expired or Invalid</h1>
                    <p className="text-gray-500">{errorMessage}</p>
                </div>
            </div>
        );
    }

    if (status === 'verifying') {
        return (
            <div className="min-h-screen bg-[#F1F8F1] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
                    <Loader2 className="h-10 w-10 text-[#34C759] animate-spin mx-auto" />
                    <div className="space-y-2">
                        <h1 className="text-xl font-bold text-[#18230F]">Verifying Payment...</h1>
                        <p className="text-gray-500">Please wait while we confirm your transaction securely.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'success' || status === 'paid') {
        return (
            <div className="min-h-screen bg-[#F1F8F1] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-[#18230F]">Payment Successful!</h1>
                        <p className="text-gray-500">Your reservation is confirmed. A receipt has been sent to your email.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F1F8F1] flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="w-full max-w-3xl space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h2 className="text-sm font-bold tracking-widest text-[#18230F] uppercase">Secure Payment</h2>
                    <h1 className="text-3xl font-bold text-[#18230F]">Complete Your Reservation</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Payment Form */}
                    <div className="lg:col-span-3 bg-white rounded-3xl p-8 shadow-sm border border-[#18230F]/5">
                        <form onSubmit={handlePayment} className="space-y-6">

                            {/* Billing Address Toggle */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex items-center h-5">
                                        <input
                                            id="invoice"
                                            name="invoice"
                                            type="checkbox"
                                            checked={needsInvoice}
                                            onChange={(e) => setNeedsInvoice(e.target.checked)}
                                            className="h-5 w-5 rounded border-gray-300 text-[#34C759] focus:ring-[#34C759]"
                                        />
                                    </div>
                                    <div className="text-sm">
                                        <label htmlFor="invoice" className="font-bold text-[#18230F]">I need an Invoice with Tax ID (NIF)</label>
                                        <p className="text-gray-500 text-xs">If unchecked, a standard receipt will be issued.</p>
                                    </div>
                                </div>

                                {needsInvoice && (
                                    <div className="pl-8 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-[#18230F] mb-1">Full Name / Company</label>
                                            <input
                                                required={needsInvoice}
                                                type="text"
                                                value={billingInfo.name}
                                                onChange={e => setBillingInfo({ ...billingInfo, name: e.target.value })}
                                                className="block w-full rounded-xl border-gray-200 bg-gray-50 h-11 px-4 focus:border-[#34C759] focus:ring-[#34C759]"
                                                placeholder="Enter generic name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-[#18230F] mb-1">Tax ID (NIF)</label>
                                            <input
                                                required={needsInvoice}
                                                type="text"
                                                value={billingInfo.nif}
                                                onChange={e => setBillingInfo({ ...billingInfo, nif: e.target.value })}
                                                className="block w-full rounded-xl border-gray-200 bg-gray-50 h-11 px-4 focus:border-[#34C759] focus:ring-[#34C759]"
                                                placeholder="999 999 990"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-[#18230F] mb-1">Billing Address</label>
                                            <input
                                                required={needsInvoice}
                                                type="text"
                                                value={billingInfo.address}
                                                onChange={e => setBillingInfo({ ...billingInfo, address: e.target.value })}
                                                className="block w-full rounded-xl border-gray-200 bg-gray-50 h-11 px-4 focus:border-[#34C759] focus:ring-[#34C759]"
                                                placeholder="Street, City, Zip"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <hr className="border-gray-100" />

                            {/* Payment Method */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-[#18230F] flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    Payment Method
                                </h3>

                                <div className="p-4 border border-[#34C759] bg-[#F1F8F1]/30 rounded-xl relative">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-6 bg-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-500">STRIPE</div>
                                        <span className="text-sm font-medium text-[#18230F]">Secure Checkout (Redirect)</span>
                                    </div>
                                    <div className="absolute top-2 right-2 text-green-600">
                                        <CheckCircle className="h-5 w-5" />
                                    </div>
                                </div>

                                {/* Mock Card Input (Visual Only) */}
                                <div className="grid grid-cols-2 gap-4 opacity-75 pointer-events-none">
                                    <div className="col-span-2">
                                        <div className="h-11 bg-gray-50 rounded-xl border border-gray-200" />
                                    </div>
                                    <div className="h-11 bg-gray-50 rounded-xl border border-gray-200" />
                                    <div className="h-11 bg-gray-50 rounded-xl border border-gray-200" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full h-12 bg-[#18230F] text-white font-bold rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Running...
                                    </>
                                ) : (
                                    `Proceed to Secure Checkout €${booking?.amountDue.toFixed(2)}`
                                )}
                            </button>

                            <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                                Secured by Stripe
                            </p>
                        </form>
                    </div>

                    {/* Summary Card */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-[#18230F] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
                            {/* Accent Circle */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#34C759] rounded-full blur-3xl opacity-20" />

                            <div className="relative space-y-6">
                                <div>
                                    <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Total Amount</h3>
                                    <div className="text-4xl font-black">€{booking?.amountDue.toFixed(2)}</div>
                                </div>

                                <hr className="border-white/10" />

                                <div className="space-y-4">
                                    <div>
                                        <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Reservation</div>
                                        <div className="font-medium text-lg">{booking?.serviceType}</div>
                                    </div>
                                    <div>
                                        <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Date</div>
                                        <div className="font-medium">{format(new Date(booking?.startDate || new Date()), 'dd MMM yyyy')}</div>
                                    </div>
                                    <div>
                                        <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Client</div>
                                        <div className="font-medium">{booking?.clientName}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#18230F]/5 text-center">
                            <div className="w-10 h-10 bg-[#F1F8F1] rounded-full flex items-center justify-center mx-auto mb-3">
                                <Building className="h-5 w-5 text-[#34C759]" />
                            </div>
                            <h3 className="text-sm font-bold text-[#18230F]">Amieira Marina</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Port de Plaisance<br />
                                7220-358 Amieira, Portugal
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
