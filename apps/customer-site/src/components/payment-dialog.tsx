'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getStripe } from '@/lib/stripe-client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, ShieldCheck } from 'lucide-react';

type PaymentDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    bookingDetails: {
        dates: { from: Date; to: Date };
        houseboatId: string;
        houseboatName: string;
        totalPrice: number;
        depositAmount: number;
        numberOfGuests: number;
    };
    clientDetails: {
        name: string;
        email: string;
        phone: string;
        nif?: string;
        address?: string;
    };
    setClientDetails: (details: any) => void;
};

export default function PaymentDialog({
    isOpen,
    onClose,
    bookingDetails,
    clientDetails,
    setClientDetails
}: PaymentDialogProps) {
    const [paymentOption, setPaymentOption] = useState<'deposit' | 'full'>('deposit');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handlePayment = async () => {
        if (!clientDetails.name || !clientDetails.email || !clientDetails.phone) {
            toast({ variant: 'destructive', title: 'Missing details', description: 'Please fill in all your contact details.' });
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dates: bookingDetails.dates,
                    houseboatId: bookingDetails.houseboatId,
                    houseboatName: bookingDetails.houseboatName,
                    clientDetails,
                    totalPrice: bookingDetails.totalPrice,
                    paymentOption,
                    numberOfGuests: bookingDetails.numberOfGuests,
                }),
            });

            const { url, error } = await response.json();
            if (error) throw new Error(error);

            if (url) {
                window.location.href = url;
            } else {
                throw new Error('No checkout URL received from server');
            }

        } catch (error: any) {
            console.error('Payment Error:', error);
            toast({
                variant: 'destructive',
                title: 'Payment Failed',
                description: error.message || 'Something went wrong. Please try again.'
            });
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Secure Your Reservation</DialogTitle>
                    <DialogDescription>
                        Complete your booking for <span className="font-bold text-slate-900">{bookingDetails.houseboatName}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Contact Details */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-900">Contact Details</h4>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs">Full Name</Label>
                            <Input
                                id="name"
                                value={clientDetails.name}
                                onChange={(e) => setClientDetails({ ...clientDetails, name: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={clientDetails.email}
                                    onChange={(e) => setClientDetails({ ...clientDetails, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-xs">Phone</Label>
                                <Input
                                    id="phone"
                                    value={clientDetails.phone}
                                    onChange={(e) => setClientDetails({ ...clientDetails, phone: e.target.value })}
                                    placeholder="+123 456 789"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Billing Details (New) */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-slate-900">Billing Details (Optional)</h4>
                        <div className="space-y-2">
                            <Label htmlFor="nif" className="text-xs">NIF (Tax ID)</Label>
                            <Input
                                id="nif"
                                value={clientDetails.nif || ''}
                                onChange={(e) => setClientDetails({ ...clientDetails, nif: e.target.value })}
                                placeholder="For invoice (optional)"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address" className="text-xs">Billing Address</Label>
                            <Input
                                id="address"
                                value={clientDetails.address || ''}
                                onChange={(e) => setClientDetails({ ...clientDetails, address: e.target.value })}
                                placeholder="Street, City, Zip (optional)"
                            />
                        </div>
                    </div>

                    {/* Payment Options */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-900 mb-2">Payment Option</h4>
                        <RadioGroup value={paymentOption} onValueChange={(v: any) => setPaymentOption(v)} className="grid grid-cols-1 gap-3">

                            <div className={`relative flex items-start space-x-3 rounded-xl border p-4 cursor-pointer transition-all ${paymentOption === 'deposit' ? 'border-green-600 bg-green-50/50 ring-1 ring-green-600' : 'border-slate-200 hover:border-green-200'}`}>
                                <RadioGroupItem value="deposit" id="deposit" className="mt-1" />
                                <Label htmlFor="deposit" className="grid gap-1 cursor-pointer w-full">
                                    <div className="font-bold text-slate-900">Pay 30% Deposit</div>
                                    <div className="text-xs text-slate-500 font-medium">Secure your dates now with a partial payment.</div>
                                    <div className="font-black text-green-700 mt-1">€{bookingDetails.depositAmount}</div>
                                </Label>
                                <div className="absolute top-2 right-2">
                                    <span className="bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Most Popular</span>
                                </div>
                            </div>

                            <div className={`flex items-start space-x-3 rounded-xl border p-4 cursor-pointer transition-all ${paymentOption === 'full' ? 'border-green-600 bg-green-50/50 ring-1 ring-green-600' : 'border-slate-200 hover:border-green-200'}`}>
                                <RadioGroupItem value="full" id="full" className="mt-1" />
                                <Label htmlFor="full" className="grid gap-1 cursor-pointer w-full">
                                    <div className="font-bold text-slate-900">Pay Full Amount</div>
                                    <div className="text-xs text-slate-500 font-medium">Pay the total amount upfront.</div>
                                    <div className="font-black text-slate-900 mt-1">€{bookingDetails.totalPrice}</div>
                                </Label>
                            </div>

                        </RadioGroup>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                        <ShieldCheck className="w-3 h-3 text-green-600" />
                        <span>Payments are secure and encrypted. processed by Stripe.</span>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handlePayment} disabled={isLoading} className="bg-[#010a1f] text-white font-bold">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                        {isLoading ? 'Processing...' : `Pay €${paymentOption === 'deposit' ? bookingDetails.depositAmount : bookingDetails.totalPrice}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
