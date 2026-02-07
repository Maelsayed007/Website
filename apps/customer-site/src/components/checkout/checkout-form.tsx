'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, ShieldCheck, CreditCard, Clock, User, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface CheckoutFormProps {
    clientDetails: { name: string; email: string; phone: string };
    setClientDetails: (details: { name: string; email: string; phone: string }) => void;
    checkInTime: string;
    setCheckInTime: (time: string) => void;
    extras: any[];
    selectedExtras: string[];
    onToggleExtra: (id: string) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

export function CheckoutForm({
    clientDetails,
    setClientDetails,
    checkInTime,
    setCheckInTime,
    extras,
    selectedExtras,
    onToggleExtra,
    onSubmit,
    isSubmitting
}: CheckoutFormProps) {
    const { toast } = useToast();
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const hasError = (field: keyof typeof clientDetails) => {
        if (!touched[field]) return false;
        return !clientDetails[field];
    };

    // Generate time slots: 09:30 to 16:00, 30 min intervals
    const timeSlots = [];
    let startHour = 9;
    let startMinute = 30;
    const endHour = 16;
    const endMinute = 0;

    while (startHour < endHour || (startHour === endHour && startMinute <= endMinute)) {
        const h = startHour.toString().padStart(2, '0');
        const m = startMinute.toString().padStart(2, '0');
        timeSlots.push(`${h}:${m}`);

        startMinute += 30;
        if (startMinute >= 60) {
            startHour++;
            startMinute = 0;
        }
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
            {/* 1. Personal Details */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 relative overflow-hidden">
                <h3 className="font-display text-3xl text-[#18230F] mb-8 flex items-center gap-4">
                    <span className="w-10 h-10 rounded-full bg-[#18230F] text-white flex items-center justify-center text-lg font-bold shrink-0">1</span>
                    Your Details
                </h3>

                <div className="grid md:grid-cols-3 gap-6 relative z-10">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</Label>
                        <Input
                            value={clientDetails.name}
                            onChange={(e) => setClientDetails({ ...clientDetails, name: e.target.value })}
                            onBlur={() => handleBlur('name')}
                            className={cn("h-11 bg-gray-50 border-gray-100 focus:bg-white transition-all text-base", hasError('name') && "border-red-300 bg-red-50")}
                            placeholder="e.g. John Doe"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</Label>
                        <Input
                            type="email"
                            value={clientDetails.email}
                            onChange={(e) => setClientDetails({ ...clientDetails, email: e.target.value })}
                            onBlur={() => handleBlur('email')}
                            className={cn("h-11 bg-gray-50 border-gray-100 focus:bg-white transition-all text-base", hasError('email') && "border-red-300 bg-red-50")}
                            placeholder="john@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Phone Number</Label>
                        <Input
                            type="tel"
                            value={clientDetails.phone}
                            onChange={(e) => setClientDetails({ ...clientDetails, phone: e.target.value })}
                            onBlur={() => handleBlur('phone')}
                            className={cn("h-11 bg-gray-50 border-gray-100 focus:bg-white transition-all text-base", hasError('phone') && "border-red-300 bg-red-50")}
                            placeholder="+351..."
                        />
                    </div>
                </div>
            </div>

            {/* 2. Check-in / Checkout Time */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 relative overflow-hidden">
                <h3 className="font-display text-3xl text-[#18230F] mb-8 flex items-center gap-4">
                    <span className="w-10 h-10 rounded-full bg-[#18230F] text-white flex items-center justify-center text-lg font-bold shrink-0">2</span>
                    Arrival & Departure
                </h3>

                <div className="grid md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Arrival Time</Label>
                        <Select value={checkInTime} onValueChange={setCheckInTime}>
                            <SelectTrigger className="h-11 bg-gray-50 border-gray-100 text-base">
                                <SelectValue placeholder="Select arrival time" />
                            </SelectTrigger>
                            <SelectContent>
                                {timeSlots.map(time => (
                                    <SelectItem key={time} value={time}>
                                        {time}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Checkout Time</Label>
                        <div className="h-11 px-3 flex items-center bg-gray-50 border border-gray-100 rounded-md text-gray-500 text-base">
                            {checkInTime || "--:--"}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Extras */}
            {extras.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                    <h3 className="font-display text-3xl text-[#18230F] mb-8 flex items-center gap-4">
                        <span className="w-10 h-10 rounded-full bg-[#18230F] text-white flex items-center justify-center text-lg font-bold shrink-0">3</span>
                        Enhance Your Stay
                    </h3>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {extras.map(extra => {
                            const isSelected = selectedExtras.includes(extra.id);
                            return (
                                <div
                                    key={extra.id}
                                    onClick={() => onToggleExtra(extra.id)}
                                    className={cn(
                                        "cursor-pointer group relative p-4 rounded-xl border transition-all duration-200 flex items-start gap-4",
                                        isSelected ? "border-emerald-500 bg-emerald-50/30" : "border-gray-100 bg-white hover:border-emerald-200"
                                    )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 mt-0.5",
                                        isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                                    )}>
                                        {isSelected && <Plus className="w-3 h-3 text-white" />}
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-[#18230F] text-sm leading-tight">{extra.name}</h4>
                                        </div>
                                        <p className="font-bold text-emerald-700 text-sm mt-1">
                                            €{extra.price} <span className="text-emerald-700/60 text-xs font-normal">/ {extra.price_type === 'per_day' ? 'day' : 'stay'}</span>
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 4. Payment Method */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-full bg-[#18230F] text-white flex items-center justify-center font-bold text-lg shrink-0">4</div>
                    <h2 className="text-3xl font-display text-[#18230F]">Payment Method</h2>
                </div>

                <div className="space-y-4">
                    <Button
                        onClick={onSubmit}
                        disabled={isSubmitting || !clientDetails.name || !clientDetails.email || !clientDetails.phone}
                        className="w-full h-16 bg-[#72C166] hover:bg-[#63B058] text-[#18230F] font-display text-3xl rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-sm"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-6 w-6 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="h-6 w-6" />
                                Ready to Pay
                            </>
                        )}
                    </Button>

                    <div className="flex flex-col items-center gap-2">
                        <p className="text-center text-xs text-gray-400 font-bold uppercase tracking-wider">
                            + Many more payment options available via Stripe
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium opacity-60">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Secure SSL payment processing</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
