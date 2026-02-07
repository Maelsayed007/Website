'use client';

import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, X, Trash2, Info, Plus, Banknote, CreditCard, Receipt, Trash, LayoutList, User, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Booking, Boat, HouseboatModel, PaymentTransaction } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { calculateHouseboatPrice, PriceBreakdown } from '@/lib/pricing';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

interface BookingSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (booking: Partial<Booking>) => Promise<void>;
    onDelete?: () => void;
    booking?: Booking | null;
    boats: Boat[];
    models: HouseboatModel[];
    prices: any[];
    tariffs: any[];
    availableExtras: any[];
    preselectedBoatId?: string;
    preselectedDate?: Date;
    preselectedSlot?: 'AM' | 'PM';
    preselectedEndDate?: Date;
    preselectedEndSlot?: 'AM' | 'PM';
}

export default function BookingSidebar({
    isOpen,
    onClose,
    onSave,
    onDelete,
    booking,
    boats,
    models,
    prices,
    tariffs,
    availableExtras,
    preselectedBoatId,
    preselectedDate,
    preselectedSlot,
    preselectedEndDate,
    preselectedEndSlot
}: BookingSidebarProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
    const [formData, setFormData] = useState({
        houseboatId: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        numberOfGuests: 2,
        checkInDate: undefined as Date | undefined,
        checkInSlot: 'PM' as 'AM' | 'PM',
        checkOutDate: undefined as Date | undefined,
        checkOutSlot: 'AM' as 'AM' | 'PM',
        status: 'Pending' as 'Pending' | 'Confirmed' | 'Maintenance' | 'Cancelled',
        source: 'manual' as 'manual' | 'website' | 'nicols' | 'amieira' | 'diaria' | 'ancorado',
        notes: '',
        price: 0,
        discount: 0,
        selectedExtras: [] as { id: string; quantity: number }[]
    });

    // Payments State
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
    const [isLoadingPayments, setIsLoadingPayments] = useState(false);
    const [activeTab, setActiveTab] = useState<'booking' | 'client' | 'payments'>('booking');
    const [isAddingPayment, setIsAddingPayment] = useState(false);
    const [paymentFormData, setPaymentFormData] = useState({
        amount: '',
        method: 'cash' as 'cash' | 'card' | 'transfer' | 'stripe' | 'other',
        ref: '',
        date: new Date().toISOString().split('T')[0]
    });

    const lastInitializedKey = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            lastInitializedKey.current = null;
            return;
        }

        const currentKey = booking ? `edit-${booking.id}` : `new-${preselectedBoatId}-${preselectedDate?.toISOString()}`;
        if (lastInitializedKey.current === currentKey) return;
        lastInitializedKey.current = currentKey;

        if (booking) {
            const checkIn = parseISO(booking.startTime);
            const checkOut = parseISO(booking.endTime);
            setFormData({
                houseboatId: booking.houseboatId || '',
                clientName: booking.clientName,
                clientEmail: booking.clientEmail || '',
                clientPhone: booking.clientPhone || '',
                numberOfGuests: booking.numberOfGuests || 2,
                checkInDate: checkIn,
                checkInSlot: checkIn.getHours() < 12 ? 'AM' : 'PM',
                checkOutDate: checkOut,
                checkOutSlot: checkOut.getHours() < 12 ? 'AM' : 'PM',
                status: booking.status as any,
                source: booking.source as any,
                notes: booking.notes || '',
                price: booking.price || 0,
                discount: booking.discount || 0,
                selectedExtras: Array.isArray((booking as any).selectedExtras || (booking as any).extras)
                    ? ((booking as any).selectedExtras || (booking as any).extras).map((e: any) => typeof e === 'string' ? { id: e, quantity: 1 } : e)
                    : []
            });
        } else {
            setFormData({
                houseboatId: preselectedBoatId || '',
                clientName: '',
                clientEmail: '',
                clientPhone: '',
                numberOfGuests: 2,
                checkInDate: preselectedDate,
                checkInSlot: preselectedSlot || 'PM',
                checkOutDate: preselectedEndDate || undefined,
                checkOutSlot: preselectedEndSlot || 'AM',
                status: 'Pending',
                source: 'manual',
                notes: '',
                price: 0,
                discount: 0,
                selectedExtras: []
            });
        }
    }, [booking, preselectedBoatId, preselectedDate, preselectedSlot, preselectedEndDate, preselectedEndSlot, isOpen]);

    // Fetch Payments
    const fetchPayments = async () => {
        if (!booking?.id) return;
        setIsLoadingPayments(true);
        try {
            const response = await fetch(`/api/payments?bookingId=${booking.id}`);
            if (!response.ok) throw new Error('Failed to fetch payments');
            const data = await response.json();
            setTransactions(data.transactions);
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setIsLoadingPayments(false);
        }
    };

    useEffect(() => {
        if (isOpen && booking?.id && activeTab === 'payments') {
            fetchPayments();
        }
    }, [booking?.id, isOpen, activeTab]);

    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const handleAddPayment = async () => {
        if (!booking?.id || !paymentFormData.amount || isProcessingPayment) return;

        setIsProcessingPayment(true);
        try {
            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: booking.id,
                    ...paymentFormData
                })
            });

            if (!response.ok) throw new Error('Failed to add payment');

            toast({ title: 'Success', description: 'Payment added successfully' });
            setIsAddingPayment(false);
            setPaymentFormData({
                amount: '',
                method: 'cash',
                ref: '',
                date: new Date().toISOString().split('T')[0]
            });
            await fetchPayments();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add payment' });
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleDeletePayment = async (id: string) => {
        if (!confirm('Are you sure you want to delete this payment?')) return;

        try {
            const response = await fetch(`/api/payments?id=${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete payment');
            toast({ title: 'Success', description: 'Payment deleted' });
            fetchPayments();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete payment' });
        }
    };

    const totalPaid = transactions
        .filter(t => t.status === 'paid')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    const balanceDue = (formData.price || 0) - totalPaid;

    // Live Price Calculation
    useEffect(() => {
        const calculateTotal = () => {
            if (!formData.checkInDate || !formData.checkOutDate || !formData.houseboatId) {
                setBreakdown(null);
                return;
            }

            const boat = boats.find(b => b.id === formData.houseboatId);
            const modelId = boat?.model_id;
            const pricing = prices.find(p => p.model_id === modelId) || { weekday_price: 150, weekend_price: 150 };

            const baseBreakdown = calculateHouseboatPrice(
                formData.checkInDate,
                formData.checkOutDate,
                { weekday: pricing.weekday_price, weekend: pricing.weekend_price }
            );

            // Find Tariff
            const checkInMD = format(formData.checkInDate, 'MM-dd');
            const tariffRecord = tariffs.find(t => {
                return (t.periods || []).some((p: any) => {
                    const start = p.start;
                    const end = p.end;
                    if (start <= end) {
                        return checkInMD >= start && checkInMD <= end;
                    } else {
                        return checkInMD >= start || checkInMD <= end;
                    }
                });
            });
            const tariffName = tariffRecord?.name;

            // Calculate Extras
            let extrasTotal = 0;
            const nights = Math.max(1, Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

            (formData.selectedExtras || []).forEach(item => {
                const extra = availableExtras.find(e => e.id === item.id);
                if (extra) {
                    const quantity = item.quantity || 1;
                    if (extra.price_type === 'per_day') {
                        extrasTotal += extra.price * nights * quantity;
                    } else {
                        extrasTotal += extra.price * quantity;
                    }
                }
            });

            const totalPostExtras = baseBreakdown.total + extrasTotal;
            const finalTotal = totalPostExtras - (formData.discount || 0);

            setBreakdown(prev => {
                if (prev?.total === finalTotal && (prev as any).extrasTotal === extrasTotal && (prev as any).discount === formData.discount && (prev as any).tariffName === tariffName) return prev;
                return {
                    ...baseBreakdown,
                    total: finalTotal,
                    deposit: Math.ceil(finalTotal * 0.30),
                    extrasTotal,
                    discount: formData.discount || 0,
                    tariffName
                };
            });

            setFormData(prev => {
                // Determine if we should auto-update the price
                // 1. If it's a new booking, always auto-update
                // 2. If it's an existing booking, only update if Dates or Houseboat changed
                const isNew = !booking;
                const originalCheckIn = booking ? parseISO(booking.startTime) : null;
                const originalCheckOut = booking ? parseISO(booking.endTime) : null;

                const datesChanged = booking && (
                    formData.checkInDate?.toISOString() !== originalCheckIn?.toISOString() ||
                    formData.checkOutDate?.toISOString() !== originalCheckOut?.toISOString()
                );
                const boatChanged = booking && formData.houseboatId !== booking.houseboatId;

                if (isNew || datesChanged || boatChanged) {
                    if (prev.price === finalTotal) return prev;
                    return { ...prev, price: finalTotal };
                }

                return prev;
            });
        };

        calculateTotal();
    }, [formData.checkInDate, formData.checkOutDate, formData.houseboatId, formData.selectedExtras, formData.discount, prices, availableExtras, boats, tariffs]);


    const handleSubmit = async () => {
        if (!formData.houseboatId || !formData.clientName || !formData.checkInDate || !formData.checkOutDate) {
            return;
        }

        setIsSubmitting(true);
        try {
            // Validation: One contact method required for non-maintenance bookings
            if (formData.status !== 'Maintenance' && !formData.clientEmail && !formData.clientPhone) {
                toast({
                    variant: 'destructive',
                    title: 'Contact Required',
                    description: 'At least an email or phone number is required to save a reservation.'
                });
                setIsSubmitting(false);
                return;
            }

            const checkInTime = new Date(formData.checkInDate);
            checkInTime.setHours(formData.checkInSlot === 'AM' ? 10 : 15, 0, 0, 0);

            const checkOutTime = new Date(formData.checkOutDate);
            checkOutTime.setHours(formData.checkOutSlot === 'AM' ? 10 : 15, 0, 0, 0);

            // Auto-confirm if paid (or if Nicols)
            let finalStatus = formData.status;

            // If it has any payment, it should be confirmed
            if (totalPaid > 0 && finalStatus === 'Pending') {
                finalStatus = 'Confirmed';
                console.log('Payment detected - auto-confirming');
            }

            // Prevent confirming without payment (unless Nicols)
            if (finalStatus === 'Confirmed' && totalPaid <= 0 && formData.source !== 'nicols') {
                finalStatus = 'Pending';
                console.log('No payment (excluding Nicols) - staying/reverting to Pending');
            }

            // Nicols is always confirmed
            if (formData.source === 'nicols' && finalStatus !== 'Cancelled' && finalStatus !== 'Maintenance') {
                finalStatus = 'Confirmed';
            }


            const bookingData: Partial<Booking> = {
                ...(booking?.id && { id: booking.id }),
                houseboatId: formData.houseboatId,
                clientName: formData.clientName,
                clientEmail: formData.clientEmail,
                clientPhone: formData.clientPhone,
                numberOfGuests: formData.numberOfGuests,
                startTime: checkInTime.toISOString(),
                endTime: checkOutTime.toISOString(),
                status: finalStatus,
                source: formData.source,
                notes: formData.notes,
                price: formData.price,
                discount: formData.discount
            };

            // Map selectedExtras to objects for the interface
            const extrasWithData = (formData.selectedExtras || []).map(item => {
                const extra = availableExtras.find(e => e.id === item.id);
                return {
                    id: item.id,
                    name: extra?.name || 'Extra',
                    price: extra?.price || 0,
                    quantity: item.quantity
                };
            });

            (bookingData as any).selectedExtras = formData.selectedExtras; // For the API
            bookingData.extras = extrasWithData; // For the interface / frontend

            await onSave(bookingData);
        } catch (error) {
            console.error('Error saving booking:', error);
        } finally {
            setIsSubmitting(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="w-[440px] bg-background border-l flex flex-col h-full animate-in slide-in-from-right duration-300">
            <div className="px-5 py-4 border-b flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
                <div>
                    <h2 className="font-bold text-xl tracking-tight text-slate-900">{booking ? 'Edit Reservation' : 'New Reservation'}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400 font-bold tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                            {booking ? `Ref: #${booking.id.slice(0, 8)}` : 'Manual Entry'}
                        </span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100 transition-colors">
                    <X className="h-5 w-5 text-slate-500" />
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="flex-1 flex flex-col min-h-0">
                <div className="px-6 py-4 border-b bg-slate-50/30">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-100/80 p-1.5 rounded-xl h-11">
                        <TabsTrigger
                            value="booking"
                            className="flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm transition-all duration-200"
                        >
                            <LayoutList className="h-3.5 w-3.5" />
                            Booking
                        </TabsTrigger>
                        <TabsTrigger
                            value="client"
                            className="flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm transition-all duration-200"
                        >
                            <User className="h-3.5 w-3.5" />
                            Client
                        </TabsTrigger>
                        <TabsTrigger
                            value="payments"
                            className="flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm transition-all duration-200"
                        >
                            <CreditCard className="h-3.5 w-3.5" />
                            Finances
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                    <TabsContent value="booking" className="p-6 space-y-6 m-0 focus-visible:ring-0">
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-3 space-y-2">
                                    <Label className="text-xs font-bold tracking-tight opacity-70">Fleet Unit</Label>
                                    <Select value={formData.houseboatId} onValueChange={(val) => setFormData(prev => ({ ...prev, houseboatId: val }))}>
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Select a boat" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {boats.map(boat => {
                                                const model = models.find(m => m.id === boat.model_id);
                                                return (
                                                    <SelectItem key={boat.id} value={boat.id}>
                                                        {boat.name} ({model?.name || 'Houseboat'})
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold tracking-tight opacity-70">Guests</Label>
                                    <Input
                                        className="h-10 text-center font-bold px-0"
                                        type="number"
                                        min={1}
                                        value={formData.numberOfGuests}
                                        onChange={(e) => setFormData(prev => ({ ...prev, numberOfGuests: parseInt(e.target.value) || 2 }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold tracking-tight opacity-70">Check-in Date *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 px-3", !formData.checkInDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {formData.checkInDate ? format(formData.checkInDate, 'dd/MM/yyyy') : 'Pick a date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={formData.checkInDate} onSelect={(date) => setFormData(prev => ({ ...prev, checkInDate: date }))} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold tracking-tight opacity-70">Slot</Label>
                                    <Select value={formData.checkInSlot} onValueChange={(val: 'AM' | 'PM') => setFormData(prev => ({ ...prev, checkInSlot: val }))}>
                                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AM">10:00 AM</SelectItem>
                                            <SelectItem value="PM">3:00 PM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold tracking-tight opacity-70">Check-out Date *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 px-3", !formData.checkOutDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {formData.checkOutDate ? format(formData.checkOutDate, 'dd/MM/yyyy') : 'Pick a date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={formData.checkOutDate} onSelect={(date) => setFormData(prev => ({ ...prev, checkOutDate: date }))} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold tracking-tight opacity-70">Slot</Label>
                                    <Select value={formData.checkOutSlot} onValueChange={(val: 'AM' | 'PM') => setFormData(prev => ({ ...prev, checkOutSlot: val }))}>
                                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AM">10:00 AM</SelectItem>
                                            <SelectItem value="PM">3:00 PM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>


                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-2">
                                        <Plus className="w-3 h-3" />
                                        Extras & Add-ons
                                    </Label>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableExtras.map(extra => {
                                        const selection = (formData.selectedExtras || []).find(s => s.id === extra.id);
                                        const qty = selection?.quantity || 0;
                                        const isSelected = qty > 0;

                                        return (
                                            <div
                                                key={extra.id}
                                                className={cn(
                                                    "group relative flex flex-col p-2.5 rounded-xl border transition-all duration-200",
                                                    isSelected
                                                        ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                                                        : "border-slate-100 bg-white hover:border-emerald-200"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[10px] font-bold text-slate-800 leading-tight">{extra.name}</span>
                                                    <span className="text-[9px] font-bold text-emerald-700">€{extra.price}</span>
                                                </div>

                                                <div className="flex items-center justify-between mt-auto">
                                                    <span className="text-[8px] text-slate-400 uppercase font-bold">
                                                        {extra.price_type === 'per_day' ? 'per day' : 'per stay'}
                                                    </span>

                                                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                                        <button
                                                            type="button"
                                                            className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white transition-colors disabled:opacity-30"
                                                            disabled={qty === 0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    selectedExtras: qty <= 1
                                                                        ? prev.selectedExtras.filter(s => s.id !== extra.id)
                                                                        : prev.selectedExtras.map(s => s.id === extra.id ? { ...s, quantity: s.quantity - 1 } : s)
                                                                }));
                                                            }}
                                                        >
                                                            <Minus className="w-2.5 h-2.5" />
                                                        </button>
                                                        <span className="w-6 text-center text-[10px] font-black text-slate-900">
                                                            {qty}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    selectedExtras: !selection
                                                                        ? [...(prev.selectedExtras || []), { id: extra.id, quantity: 1 }]
                                                                        : prev.selectedExtras.map(s => s.id === extra.id ? { ...s, quantity: s.quantity + 1 } : s)
                                                                }));
                                                            }}
                                                        >
                                                            <Plus className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {breakdown && (
                                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-[10px] tracking-tight uppercase">
                                            <Info className="h-3 w-3" /> Price Breakdown
                                        </div>
                                        {(breakdown as any).tariffName && (
                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-tighter">
                                                {(breakdown as any).tariffName}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        {breakdown.weekdayNights > 0 && (
                                            <div className="flex justify-between items-center text-slate-600">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold">{breakdown.weekdayNights} Weekdays</span>
                                                    <span className="text-[10px] opacity-60 font-medium whitespace-nowrap">@ €{breakdown.weekdayPrice}/night</span>
                                                </div>
                                                <span className="font-bold text-slate-800">€{(breakdown.weekdayNights * breakdown.weekdayPrice).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {breakdown.weekendNights > 0 && (
                                            <div className="flex justify-between items-center text-slate-600">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold">{breakdown.weekendNights} Weekend Days</span>
                                                    <span className="text-[10px] opacity-60 font-medium whitespace-nowrap">@ €{breakdown.weekendPrice}/night</span>
                                                </div>
                                                <span className="font-bold text-slate-800">€{(breakdown.weekendNights * breakdown.weekendPrice).toLocaleString()}</span>
                                            </div>
                                        )}

                                        {formData.selectedExtras.length > 0 && (
                                            <div className="flex justify-between items-center text-emerald-700 italic pt-1 border-t border-emerald-100/50">
                                                <span>Extras & Add-ons</span>
                                                <span className="font-bold">+€{((breakdown as any).extrasTotal || 0).toLocaleString()}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center text-slate-600">
                                            <span>Preparation Fee</span>
                                            <span className="font-bold text-slate-800">€{breakdown.preparationFee}</span>
                                        </div>

                                        {(breakdown as any).discount > 0 && (
                                            <div className="flex justify-between items-center text-rose-600 font-bold pt-1 border-t border-rose-100/50">
                                                <span>Staff Discount</span>
                                                <span>-€{(breakdown as any).discount.toLocaleString()}</span>
                                            </div>
                                        )}

                                        <div className="pt-2 border-t border-emerald-200">
                                            <div className="flex justify-between items-center font-black text-emerald-900 text-sm">
                                                <span className="uppercase tracking-tight">Total Value</span>
                                                <span className="text-base text-emerald-700">€{breakdown.total.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="client" className="p-6 space-y-6 m-0 focus-visible:ring-0">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold tracking-tight opacity-70">
                                    {formData.status === 'Maintenance' ? 'Subject / Reason *' : 'Client Name *'}
                                </Label>
                                <Input
                                    className="h-10"
                                    value={formData.clientName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                                    placeholder={formData.status === 'Maintenance' ? 'Internal maintenance note' : 'Full Name'}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold tracking-tight opacity-70">
                                        Email {formData.status !== 'Maintenance' && '*'}
                                    </Label>
                                    <Input
                                        className="h-10"
                                        type="email"
                                        value={formData.clientEmail}
                                        onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold tracking-tight opacity-70">
                                        Phone {formData.status !== 'Maintenance' && '*'}
                                    </Label>
                                    <Input
                                        className="h-10"
                                        value={formData.clientPhone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                                        placeholder="+351..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold tracking-tight opacity-70">Source</Label>
                                <Select
                                    value={formData.source}
                                    onValueChange={(val: any) => setFormData(prev => ({ ...prev, source: val }))}
                                    disabled={formData.status === 'Maintenance'}
                                >
                                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manual">Manual / Office</SelectItem>
                                        <SelectItem value="website">Website</SelectItem>
                                        <SelectItem value="nicols">Nicols</SelectItem>
                                        <SelectItem value="diaria">Diária</SelectItem>
                                        <SelectItem value="ancorado">Ancorado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold tracking-tight opacity-70">Internal Notes</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Add any specific details about this client or booking..."
                                    rows={8}
                                    className="resize-none"
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="payments" className="p-6 space-y-6 m-0 focus-visible:ring-0">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</Label>
                                    <Select value={formData.status} onValueChange={(val: any) => setFormData(prev => ({ ...prev, status: val }))}>
                                        <SelectTrigger className="h-10 bg-white border-slate-200 rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Confirmed">Confirmed</SelectItem>
                                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Staff Discount (€)</Label>
                                    <Input
                                        className="h-10 bg-white border-rose-100 focus:border-rose-200 focus:ring-rose-50 rounded-xl font-bold text-rose-600 transition-all duration-200"
                                        type="number"
                                        min={0}
                                        value={formData.discount}
                                        onChange={(e) => {
                                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                                            setFormData(prev => ({ ...prev, discount: val }));
                                        }}
                                    />
                                </div>
                                <div className="col-span-2 space-y-1.5 pt-1">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manual Price Override (€)</Label>
                                    <Input
                                        className="h-10 bg-white border-slate-200 focus:border-emerald-200 focus:ring-emerald-50 rounded-xl font-bold text-slate-900"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={formData.price}
                                        onChange={(e) => {
                                            const newPrice = Math.max(0, parseFloat(e.target.value) || 0);
                                            setFormData(prev => ({ ...prev, price: newPrice }));
                                            if (!booking) setBreakdown(null);
                                        }}
                                    />
                                    <p className="text-[9px] text-slate-400 italic">Caution: Manual override will disable automatic pricing.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 relative overflow-hidden">
                                    <p className="text-[10px] font-bold text-slate-400 tracking-tight mb-1 uppercase">
                                        Total Price
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-slate-900">€{formData.price.toLocaleString()}</span>
                                    </div>
                                    <div className="absolute top-0 right-0 p-2 opacity-5">
                                        <Receipt className="h-6 w-6 text-slate-900" />
                                    </div>
                                </div>
                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 relative overflow-hidden">
                                    <p className="text-[10px] font-bold text-emerald-600 tracking-tight mb-1 uppercase">
                                        Paid Amount
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-emerald-700">€{totalPaid.toLocaleString()}</span>
                                    </div>
                                    <div className="absolute top-0 right-0 p-2 opacity-5">
                                        <Banknote className="h-6 w-6 text-emerald-700" />
                                    </div>
                                </div>
                            </div>

                            <div className={cn(
                                "p-4 rounded-xl border flex items-center justify-between transition-all",
                                balanceDue <= 0
                                    ? "bg-emerald-600 border-emerald-500 text-white"
                                    : "bg-amber-50/50 border-amber-100"
                            )}>
                                <div>
                                    <p className={cn(
                                        "text-[10px] font-bold tracking-tight mb-0.5 uppercase",
                                        balanceDue <= 0 ? "text-emerald-100/80" : "text-amber-600"
                                    )}>
                                        {balanceDue <= 0 ? 'Payment Status' : 'Pending Balance'}
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                        <span className={cn(
                                            "text-lg font-bold tracking-tight",
                                            balanceDue <= 0 ? "text-white" : "text-amber-900"
                                        )}>
                                            {balanceDue <= 0 ? 'Fully Paid' : `€${balanceDue.toLocaleString()}`}
                                        </span>
                                    </div>
                                </div>
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center",
                                    balanceDue <= 0 ? "bg-white/20" : "bg-amber-100 text-amber-600"
                                )}>
                                    {balanceDue <= 0 ? <CreditCard className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                                </div>
                            </div>
                        </div>

                        {/* Transactions section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-0.5">
                                <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                    Transaction History
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 rounded-full text-[11px] font-bold tracking-tight gap-1.5 text-primary hover:bg-primary/5 px-3"
                                    onClick={() => setIsAddingPayment(!isAddingPayment)}
                                >
                                    <Plus className="h-3.5 w-3.5" /> {isAddingPayment ? 'Close' : 'Add Payment'}
                                </Button>
                            </div>

                            {isAddingPayment && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold tracking-tight opacity-70">Amount (€)</Label>
                                            <Input
                                                className="h-10 bg-white"
                                                type="number"
                                                value={paymentFormData.amount}
                                                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold tracking-tight opacity-70">Method</Label>
                                            <Select value={paymentFormData.method} onValueChange={(val: any) => setPaymentFormData({ ...paymentFormData, method: val })}>
                                                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cash">Cash</SelectItem>
                                                    <SelectItem value="card">Card</SelectItem>
                                                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold tracking-tight opacity-70">Date</Label>
                                            <Input
                                                className="h-10 bg-white"
                                                type="date"
                                                value={paymentFormData.date}
                                                onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold tracking-tight opacity-70">Reference</Label>
                                            <Input
                                                className="h-10 bg-white"
                                                placeholder="Receipt #..."
                                                value={paymentFormData.ref}
                                                onChange={(e) => setPaymentFormData({ ...paymentFormData, ref: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        className="h-10 w-full font-bold text-[11px] tracking-wider rounded-full shadow-sm"
                                        onClick={handleAddPayment}
                                        disabled={isProcessingPayment || !paymentFormData.amount}
                                    >
                                        {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Process Payment
                                    </Button>
                                </div>
                            )}

                            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {isLoadingPayments ? (
                                    <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-400">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span className="text-[10px] font-bold">Loading records...</span>
                                    </div>
                                ) : transactions.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-100 flex flex-col items-center justify-center">
                                        <Receipt className="h-6 w-6 text-slate-200 mb-2" />
                                        <p className="text-[10px] font-bold text-slate-400">No transaction records found</p>
                                    </div>
                                ) : (
                                    transactions.map(tx => (
                                        <div key={tx.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-8 w-8 rounded-lg flex items-center justify-center",
                                                    tx.method === 'stripe' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                                )}>
                                                    {tx.method === 'stripe' ? <CreditCard className="h-4 w-4" /> :
                                                        tx.method === 'card' ? <CreditCard className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 leading-none mb-1">€{tx.amount.toLocaleString()}</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                                            {tx.method === 'stripe' ? 'Website' : tx.method}
                                                        </span>
                                                        <span className="text-[9px] text-slate-300">•</span>
                                                        <span className="text-[9px] text-slate-500 font-medium">{format(parseISO(tx.created_at), 'dd MMM yyyy')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {tx.ref && (
                                                    <span className="text-[8px] font-mono font-bold bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-slate-400">{tx.ref}</span>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-red-500 hover:bg-red-50"
                                                    onClick={() => handleDeletePayment(tx.id)}
                                                >
                                                    <Trash className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </div >
            </Tabs >

            <div className="p-6 border-t bg-slate-50/50">
                <div className="flex gap-3">
                    <Button
                        className="flex-1 h-12 font-bold text-sm tracking-tight rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !formData.houseboatId || !formData.clientName || !formData.checkInDate || !formData.checkOutDate}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {activeTab === 'booking' ? (booking ? 'Update Reservation' : 'Create Reservation') : 'Save Changes'}
                    </Button>
                    {booking && onDelete && (
                        <Button
                            variant="outline"
                            className="h-12 px-6 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold text-xs tracking-tight rounded-full transition-all flex items-center gap-2"
                            onClick={onDelete}
                        >
                            <Trash2 className="h-4 w-4" /> Delete
                        </Button>
                    )}
                </div>
            </div>
        </div >
    );
}
