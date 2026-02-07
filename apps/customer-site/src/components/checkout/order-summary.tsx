'use client';

import { HouseboatModel } from '@/lib/types';
import { format } from 'date-fns';
import {
    Calendar, Users, BedDouble,
    Check, MapPin, Anchor, Info,
    X, Wallet, CalendarCheck
} from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

interface OrderSummaryProps {
    boat: HouseboatModel;
    dates: { from: Date; to: Date };
    guests: number;
    priceBreakdown: any;
    extras: any[];
    loading?: boolean;
    checkInTime?: string;
}

export function OrderSummary({
    boat,
    dates,
    guests,
    priceBreakdown,
    extras,
    loading,
    checkInTime
}: OrderSummaryProps) {
    if (loading) return (
        <div className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 h-full animate-pulse">
            <div className="h-64 bg-gray-100 rounded-2xl mb-6" />
            <div className="space-y-4">
                <div className="h-8 bg-gray-100 rounded-lg w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
                <div className="h-24 bg-gray-100 rounded-xl" />
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 h-full relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
                <CalendarCheck className="w-5 h-5 text-[#18230F]" />
                <h2 className="font-display text-2xl text-[#18230F]">Reservation Details</h2>
            </div>

            {/* Boat Info */}
            <div className="flex gap-4 items-center mb-5">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                    {boat.imageUrls?.[0] ? (
                        <Image
                            src={boat.imageUrls[0]}
                            alt={boat.name}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
                            <Anchor className="w-6 h-6 text-emerald-300" />
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="font-display text-2xl text-[#18230F] leading-tight">{boat.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
                        <Users className="w-4 h-4" /> {boat.optimalCapacity} Guests Capacity
                    </p>
                </div>
            </div>

            {/* Dates & Guests */}
            <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium text-sm">Arrival - Departure</span>
                    <span className="font-bold text-[#18230F] text-sm">{format(dates.from, 'MMM dd')} - {format(dates.to, 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Stay Duration</span>
                    <span className="font-bold text-[#18230F]">{priceBreakdown.weekdayNights + priceBreakdown.weekendNights} Nights Stay</span>
                </div>
                <div className="flex justify-between items-center text-sm text-[#18230F]">
                    <span className="text-gray-500 font-medium">Guest Count</span>
                    <span className="font-bold">{guests} Travelers Booked</span>
                </div>
                {checkInTime && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Entry & Departure</span>
                        <span className="font-bold text-[#18230F]">{checkInTime} — {checkInTime}</span>
                    </div>
                )}
            </div>

            {/* Dashed Separator 1 with Cutouts */}
            <div className="my-6 relative z-0">
                <div className="border-t-2 border-dashed border-gray-100 w-full" />
                <div className="absolute -left-9 -top-3 w-6 h-6 rounded-full bg-gray-50 border border-gray-100" />
                <div className="absolute -right-9 -top-3 w-6 h-6 rounded-full bg-gray-50 border border-gray-100" />
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2.5 mb-6">
                {priceBreakdown.weekdayNights > 0 && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">{priceBreakdown.weekdayNights} Weeknight{priceBreakdown.weekdayNights > 1 ? 's' : ''}</span>
                        <span className="font-bold text-[#18230F]">€{(priceBreakdown.weekdayNights * priceBreakdown.weekdayPrice).toLocaleString()}</span>
                    </div>
                )}
                {priceBreakdown.weekendNights > 0 && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">{priceBreakdown.weekendNights} Weekend Night{priceBreakdown.weekendNights > 1 ? 's' : ''}</span>
                        <span className="font-bold text-[#18230F]">€{(priceBreakdown.weekendNights * priceBreakdown.weekendPrice).toLocaleString()}</span>
                    </div>
                )}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Preparation Fee</span>
                    <span className="font-bold text-[#18230F]">€{priceBreakdown.preparationFee}</span>
                </div>

                {extras.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-gray-50">
                        {extras.map(extra => (
                            <div key={extra.id} className="flex justify-between items-center text-sm text-emerald-700">
                                <span className="flex items-center gap-1 font-medium">
                                    <Check className="w-3.5 h-3.5" />
                                    {extra.name} {extra.quantity && extra.quantity > 1 && `x${extra.quantity}`}
                                </span>
                                <span className="font-bold">€{(extra.price * (extra.quantity || 1)).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Dashed Separator 2 with Cutouts */}
            <div className="my-6 relative z-0">
                <div className="border-t-2 border-dashed border-gray-100 w-full" />
                <div className="absolute -left-9 -top-3 w-6 h-6 rounded-full bg-gray-50 border border-gray-100" />
                <div className="absolute -right-9 -top-3 w-6 h-6 rounded-full bg-gray-50 border border-gray-100" />
            </div>

            <div className="flex justify-between items-end mb-4">
                <span className="font-bold text-sm text-[#18230F]">Total Amount</span>
                <div className="text-right">
                    <span className="block font-bold text-3xl text-[#18230F]">€{priceBreakdown.total.toLocaleString()}</span>
                </div>
            </div>

            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs leading-relaxed flex gap-3 border border-emerald-100/50">
                <div className="mt-0.5"><Info className="w-5 h-5" /></div>
                <p className="font-medium">
                    Deposit Due Today: <strong className="font-bold text-emerald-900 text-sm">€{Math.ceil(priceBreakdown.total * 0.3).toLocaleString()}</strong> (30%)
                </p>
            </div>
        </div>
    );
}
