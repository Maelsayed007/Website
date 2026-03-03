'use client';

import { HouseboatModel } from '@/lib/types';
import { format } from 'date-fns';
import {
    Calendar,
    Users,
    Check,
    Anchor,
    Info,
    CalendarCheck,
} from 'lucide-react';
import Image from 'next/image';

interface OrderSummaryProps {
    boat: HouseboatModel;
    dates: { from: Date; to: Date };
    guests: number;
    priceBreakdown: any;
    extras: any[];
    loading?: boolean;
    checkInTime?: string;
    bookingType: 'overnight' | 'day_charter';
    mode?: 'houseboat' | 'combo' | 'river-cruise';
    offer?: any;
    riverCruisePackage?: any;
    locale: string;
}

function formatEur(value: number) {
    return `EUR ${Math.round(Number(value || 0)).toLocaleString()}`;
}

export function OrderSummary({
    boat,
    dates,
    guests,
    priceBreakdown,
    extras,
    loading,
    checkInTime,
    bookingType,
    mode = 'houseboat',
    offer,
    riverCruisePackage,
    locale,
}: OrderSummaryProps) {
    const getTranslated = (obj: any, field: string, fallback: string) => {
        if (!obj?.translations?.[locale]?.[field]) return fallback;
        return obj.translations[locale][field];
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 h-full animate-pulse">
                <div className="h-64 bg-gray-100 rounded-2xl mb-6" />
                <div className="space-y-4">
                    <div className="h-8 bg-gray-100 rounded-lg w-3/4" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                    <div className="h-24 bg-gray-100 rounded-xl" />
                </div>
            </div>
        );
    }

    const imageUrl = mode === 'river-cruise'
        ? (riverCruisePackage?.photo_url || '/river-cruise-hero.jpg')
        : (mode === 'combo' && offer
            ? (offer.image_url || '/river-cruise-hero.jpg')
            : boat?.imageUrls?.[0]);

    const title = mode === 'river-cruise'
        ? getTranslated(riverCruisePackage, 'name', riverCruisePackage?.name || '')
        : (mode === 'combo' && offer
            ? getTranslated(offer, 'title', offer.title)
            : getTranslated(boat, 'name', boat?.name || ''));

    const deposit = Number(priceBreakdown?.deposit || Math.ceil(Number(priceBreakdown?.total || 0) * 0.3));
    const recurringDiscountAmount = Number(priceBreakdown?.recurringDiscountAmount || 0);
    const recurringDiscountPercent = Number(priceBreakdown?.recurringDiscountPercent || 0);

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 h-full relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
                <CalendarCheck className="w-5 h-5 text-[#18230F]" />
                <h2 className="font-display text-2xl text-[#18230F]">Reservation Details</h2>
            </div>

            <div className="flex gap-4 items-center mb-5">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                    {imageUrl ? (
                        <Image src={imageUrl} alt={title || 'Image'} fill className="object-cover" />
                    ) : (
                        <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
                            <Anchor className="w-6 h-6 text-emerald-300" />
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="font-display text-xl md:text-2xl text-[#18230F] leading-tight">{title}</h3>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
                        {mode === 'combo' || mode === 'river-cruise' ? (
                            <><Calendar className="w-4 h-4" /> Limited availability</>
                        ) : (
                            <><Users className="w-4 h-4" /> {boat?.optimalCapacity} guests capacity</>
                        )}
                    </p>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium text-sm">Date</span>
                    <span className="font-bold text-[#18230F] text-sm">
                        {(mode === 'combo' || mode === 'river-cruise')
                            ? format(dates.from, 'MMM dd, yyyy')
                            : `${format(dates.from, 'MMM dd')} - ${format(dates.to, 'MMM dd, yyyy')}`}
                    </span>
                </div>
                {mode === 'houseboat' && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Stay duration</span>
                        <span className="font-bold text-[#18230F]">
                            {(priceBreakdown.weekdayNights || 0) + (priceBreakdown.weekendNights || 0)} nights
                        </span>
                    </div>
                )}
                <div className="flex justify-between items-center text-sm text-[#18230F]">
                    <span className="text-gray-500 font-medium">Guest count</span>
                    <span className="font-bold">{guests} travelers</span>
                </div>
                {checkInTime && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Start time</span>
                        <span className="font-bold text-[#18230F]">
                            {checkInTime} to {
                                bookingType === 'day_charter'
                                    ? '17:00'
                                    : (mode === 'combo' || mode === 'river-cruise')
                                        ? (mode === 'river-cruise' && riverCruisePackage?.duration_hours
                                            ? `+${riverCruisePackage.duration_hours}h`
                                            : 'End of tour')
                                        : '11:00'
                            }
                        </span>
                    </div>
                )}
            </div>

            <div className="my-6 relative z-0">
                <div className="border-t-2 border-dashed border-gray-100 w-full" />
                <div className="absolute -left-9 -top-3 w-6 h-6 rounded-full bg-gray-50 border border-gray-100" />
                <div className="absolute -right-9 -top-3 w-6 h-6 rounded-full bg-gray-50 border border-gray-100" />
            </div>

            <div className="space-y-2.5 mb-6">
                {(mode === 'combo' || mode === 'river-cruise') ? (
                    <>
                        {priceBreakdown.adults > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">{priceBreakdown.adults} adult{priceBreakdown.adults > 1 ? 's' : ''}</span>
                                <span className="font-bold text-[#18230F]">
                                    {priceBreakdown.perPersonBreakdown
                                        ? formatEur(priceBreakdown.perPersonBreakdown.adults.count * priceBreakdown.perPersonBreakdown.adults.price)
                                        : ''}
                                </span>
                            </div>
                        )}
                        {priceBreakdown.children > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">{priceBreakdown.children} child{priceBreakdown.children > 1 ? 'ren' : ''}</span>
                                <span className="font-bold text-[#18230F]">
                                    {priceBreakdown.perPersonBreakdown
                                        ? formatEur(priceBreakdown.perPersonBreakdown.children.count * priceBreakdown.perPersonBreakdown.children.price)
                                        : ''}
                                </span>
                            </div>
                        )}
                        {priceBreakdown.seniors > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">{priceBreakdown.seniors} senior{priceBreakdown.seniors > 1 ? 's' : ''}</span>
                                <span className="font-bold text-[#18230F]">
                                    {priceBreakdown.perPersonBreakdown
                                        ? formatEur(priceBreakdown.perPersonBreakdown.seniors.count * priceBreakdown.perPersonBreakdown.seniors.price)
                                        : ''}
                                </span>
                            </div>
                        )}

                        {mode === 'river-cruise' && priceBreakdown.menuSelections?.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-gray-50 mt-2">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Menus</p>
                                {priceBreakdown.menuSelections.map((sel: any, i: number) => {
                                    const menu = priceBreakdown.allMenus?.find((m: any) => m.id === sel.menuId);
                                    if (!menu) return null;
                                    return (
                                        <div key={i} className="flex justify-between items-center text-sm text-stone-600">
                                            <span className="flex items-center gap-1 font-medium">
                                                <Info className="w-3 h-3 text-stone-400" />
                                                {sel.quantity}x {getTranslated(menu, 'name', menu.name)}
                                            </span>
                                            <span className="font-bold text-[#18230F]">
                                                {formatEur(sel.quantity * menu.price_adult)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {priceBreakdown.weekdayNights > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">{priceBreakdown.weekdayNights} weeknight{priceBreakdown.weekdayNights > 1 ? 's' : ''}</span>
                                <span className="font-bold text-[#18230F]">
                                    {formatEur(priceBreakdown.weekdayNights * (priceBreakdown.weekdayPrice || 0))}
                                </span>
                            </div>
                        )}
                        {priceBreakdown.weekendNights > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">{priceBreakdown.weekendNights} weekend night{priceBreakdown.weekendNights > 1 ? 's' : ''}</span>
                                <span className="font-bold text-[#18230F]">
                                    {formatEur(priceBreakdown.weekendNights * (priceBreakdown.weekendPrice || 0))}
                                </span>
                            </div>
                        )}
                        {recurringDiscountAmount > 0 && (
                            <div className="flex justify-between items-center text-sm text-emerald-700">
                                <span className="font-medium">Recurring offer ({recurringDiscountPercent}% off)</span>
                                <span className="font-bold">- {formatEur(recurringDiscountAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Preparation fee</span>
                            <span className="font-bold text-[#18230F]">{formatEur(priceBreakdown.preparationFee || 0)}</span>
                        </div>
                    </>
                )}

                {extras.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-gray-50">
                        {extras.map((extra) => (
                            <div key={extra.id} className="flex justify-between items-center text-sm text-emerald-700">
                                <span className="flex items-center gap-1 font-medium">
                                    <Check className="w-3.5 h-3.5" />
                                    {getTranslated(extra, 'name', extra.name)} {extra.quantity && extra.quantity > 1 && `x${extra.quantity}`}
                                </span>
                                <span className="font-bold">{formatEur(extra.price * (extra.quantity || 1))}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="my-6 relative z-0">
                <div className="border-t-2 border-dashed border-gray-100 w-full" />
                <div className="absolute -left-9 -top-3 w-6 h-6 rounded-full bg-gray-50 border border-gray-100" />
                <div className="absolute -right-9 -top-3 w-6 h-6 rounded-full bg-gray-50 border border-gray-100" />
            </div>

            <div className="flex justify-between items-end mb-4">
                <span className="font-bold text-sm text-[#18230F]">Total amount</span>
                <div className="text-right">
                    <span className="block font-bold text-3xl text-[#18230F]">
                        {formatEur(priceBreakdown.total || 0)}
                    </span>
                </div>
            </div>

            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs leading-relaxed flex gap-3 border border-emerald-100/50">
                <div className="mt-0.5"><Info className="w-5 h-5" /></div>
                <p className="font-medium">
                    Deposit due today: <strong className="font-bold text-emerald-900 text-sm">{formatEur(deposit)}</strong> (30%)
                </p>
            </div>
        </div>
    );
}

