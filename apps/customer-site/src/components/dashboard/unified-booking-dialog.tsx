'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import {
    Ship,
    Utensils,
    CalendarDays,
    User,
    Plus,
    Search,
    Check,
    X,
    Loader2,
    ArrowRight,
    MapPin,
    Users
} from 'lucide-react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';

interface UnifiedBookingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    preFilledOfferId?: string;
}

type Client = {
    id: string;
    name: string;
    email: string;
    phone: string;
};

type Boat = {
    id: string;
    name: string;
    model_id: string;
};

type Package = {
    id: string;
    name: string;
};

type Table = {
    id: string;
    table_number: string;
    capacity: number;
};

export function UnifiedBookingDialog({ open, onOpenChange, onSuccess, preFilledOfferId }: UnifiedBookingDialogProps) {
    const { supabase } = useSupabase();
    const { toast } = useToast();
    const [step, setStep] = useState<'services' | 'details' | 'summary'>('services');
    const [isProcessing, setIsProcessing] = useState(false);

    // Selected Services
    const [selectedServices, setSelectedServices] = useState<{
        stay: boolean;
        cruise: boolean;
        meal: boolean;
    }>({ stay: false, cruise: false, meal: false });

    // Client State
    const [clientSearch, setClientSearch] = useState('');
    const [searchedClients, setSearchedClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
    const [showNewClientForm, setShowNewClientForm] = useState(false);

    // Common State
    const [bookingDate, setBookingDate] = useState<Date | undefined>(new Date());
    const [guests, setGuests] = useState('2');

    // Stay Specific
    const [stayDates, setStayDates] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: new Date(),
        to: new Date(new Date().setDate(new Date().getDate() + 2))
    });
    const [selectedBoatId, setSelectedBoatId] = useState<string>('');

    // Cruise Specific
    const [selectedPackageId, setSelectedPackageId] = useState<string>('');
    const [selectedVesselId, setSelectedVesselId] = useState<string>('');

    // Meal Specific
    const [mealTime, setMealTime] = useState('19:30');
    const [selectedTableId, setSelectedTableId] = useState<string>('');

    // Data Store
    const [boats, setBoats] = useState<Boat[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [tables, setTables] = useState<Table[]>([]);

    useEffect(() => {
        if (open) {
            fetchInitialData();
            if (preFilledOfferId) {
                fetchOfferDetails(preFilledOfferId);
            }
        } else {
            // Reset on close
            setSelectedServices({ stay: false, cruise: false, meal: false });
            setSelectedClient(null);
            setStep('services');
        }
    }, [open, preFilledOfferId]);

    const fetchOfferDetails = async (id: string) => {
        if (!supabase) return;
        const { data: offer } = await supabase
            .from('special_offers')
            .select('*')
            .eq('id', id)
            .single();

        if (offer) {
            const isStay = offer.category === 'houseboat' || offer.category === 'combo';
            const isCruise = offer.category === 'cruise' || offer.category === 'package' || offer.category === 'service' || (offer.category === 'combo' && offer.linked_package_id);
            const isMeal = offer.category === 'restaurant' || offer.category === 'combo' || offer.category === 'event';

            setSelectedServices({
                stay: isStay,
                cruise: !!isCruise,
                meal: isMeal
            });

            if (offer.linked_package_id) {
                setSelectedPackageId(offer.linked_package_id);
            }

            // Move to details step if we have a specific offer
            setStep('details');
        }
    };

    const fetchInitialData = async () => {
        if (!supabase) return;
        const [boatsRes, packagesRes, tablesRes] = await Promise.all([
            supabase.from('boats').select('id, name, model_id'),
            supabase.from('daily_travel_packages').select('id, name'),
            supabase.from('restaurant_tables').select('id, table_number, capacity')
        ]);

        if (boatsRes.data) setBoats(boatsRes.data);
        if (packagesRes.data) setPackages(packagesRes.data);
        if (tablesRes.data) setTables(tablesRes.data);
    };

    // Client Search logic
    useEffect(() => {
        if (!supabase || clientSearch.length < 2) {
            setSearchedClients([]);
            return;
        }
        const search = async () => {
            const { data } = await supabase.from('clients')
                .select('*')
                .or(`name.ilike.%${clientSearch}%,email.ilike.%${clientSearch}%`)
                .limit(5);
            if (data) setSearchedClients(data);
        };
        search();
    }, [supabase, clientSearch]);

    const handleSaveBooking = async () => {
        if (!supabase) return;
        setIsProcessing(true);

        try {
            const clientName = selectedClient ? selectedClient.name : newClient.name;
            const clientEmail = selectedClient ? selectedClient.email : newClient.email;
            const clientPhone = selectedClient ? selectedClient.phone : newClient.phone;

            if (!clientName) throw new Error('Client name is required');

            // Construct the single booking record
            // For now, we store them in the 'bookings' table which has columns for all
            const bookingData: any = {
                client_name: clientName,
                client_email: clientEmail,
                client_phone: clientPhone,
                status: 'Confirmed',
                source: 'Staff Manual',
                number_of_guests: parseInt(guests),
            };

            if (selectedServices.stay) {
                bookingData.houseboat_id = selectedBoatId;
                bookingData.start_time = stayDates.from?.toISOString();
                bookingData.end_time = stayDates.to?.toISOString();
                bookingData.booking_type = 'overnight';
            } else if (selectedServices.cruise) {
                bookingData.daily_travel_package_id = selectedPackageId;
                bookingData.daily_boat_id = selectedVesselId;
                bookingData.start_time = bookingDate?.toISOString();
                // Minimal end time for cruise or set specifically
                bookingData.booking_type = 'day_charter';
            } else if (selectedServices.meal) {
                bookingData.restaurant_table_id = selectedTableId;
                const mealDateTime = new Date(bookingDate || new Date());
                const [h, m] = mealTime.split(':');
                mealDateTime.setHours(parseInt(h), parseInt(m));
                bookingData.start_time = mealDateTime.toISOString();
                bookingData.booking_type = 'restaurant';
            }

            // If it's a combo, we might need a way to flag it or just let the presence of multiple IDs speak for itself
            // The current DB schema allows one houseboat_id, one restaurant_table_id, etc. per row.

            const { error } = await supabase.from('bookings').insert(bookingData);
            if (error) throw error;

            toast({ title: 'Success', description: 'Unified booking created successfully.' });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>New Unified Reservation</DialogTitle>
                    <DialogDescription>
                        Create a booking for any service or a combination (Package).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Step Tracker */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className={cn("h-2 flex-1 rounded-full", step === 'services' ? "bg-emerald-600" : "bg-emerald-100")} />
                        <div className={cn("h-2 flex-1 rounded-full", step === 'details' ? "bg-emerald-600" : "bg-emerald-100")} />
                        <div className={cn("h-2 flex-1 rounded-full", step === 'summary' ? "bg-emerald-600" : "bg-emerald-100")} />
                    </div>

                    {step === 'services' && (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <Label>What are we booking today?</Label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div
                                        className={cn(
                                            "relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-emerald-500",
                                            selectedServices.stay ? "border-emerald-500 bg-emerald-50" : "border-slate-100"
                                        )}
                                        onClick={() => setSelectedServices({ ...selectedServices, stay: !selectedServices.stay })}
                                    >
                                        <Ship className={cn("h-8 w-8 mb-2", selectedServices.stay ? "text-emerald-600" : "text-slate-400")} />
                                        <p className="font-bold text-sm">Houseboat Stay</p>
                                        <p className="text-xs text-slate-500">Overnight rental</p>
                                        <Checkbox checked={selectedServices.stay} className="absolute top-4 right-4" />
                                    </div>

                                    <div
                                        className={cn(
                                            "relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-emerald-500",
                                            selectedServices.cruise ? "border-emerald-500 bg-emerald-50" : "border-slate-100"
                                        )}
                                        onClick={() => setSelectedServices({ ...selectedServices, cruise: !selectedServices.cruise })}
                                    >
                                        <CalendarDays className={cn("h-8 w-8 mb-2", selectedServices.cruise ? "text-emerald-600" : "text-slate-400")} />
                                        <p className="font-bold text-sm">Daily Cruise</p>
                                        <p className="text-xs text-slate-500">Day trip or tour</p>
                                        <Checkbox checked={selectedServices.cruise} className="absolute top-4 right-4" />
                                    </div>

                                    <div
                                        className={cn(
                                            "relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-emerald-500",
                                            selectedServices.meal ? "border-emerald-500 bg-emerald-50" : "border-slate-100"
                                        )}
                                        onClick={() => setSelectedServices({ ...selectedServices, meal: !selectedServices.meal })}
                                    >
                                        <Utensils className={cn("h-8 w-8 mb-2", selectedServices.meal ? "text-emerald-600" : "text-slate-400")} />
                                        <p className="font-bold text-sm">Restaurant</p>
                                        <p className="text-xs text-slate-500">Table reservation</p>
                                        <Checkbox checked={selectedServices.meal} className="absolute top-4 right-4" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <Label>Client Info</Label>
                                {!showNewClientForm ? (
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                placeholder="Search by name or email..."
                                                className="pl-9"
                                                value={clientSearch}
                                                onChange={(e) => setClientSearch(e.target.value)}
                                            />
                                        </div>
                                        {searchedClients.length > 0 && (
                                            <div className="border rounded-lg overflow-hidden">
                                                {searchedClients.map(c => (
                                                    <div
                                                        key={c.id}
                                                        className={cn(
                                                            "p-3 cursor-pointer hover:bg-slate-50 flex items-center justify-between",
                                                            selectedClient?.id === c.id && "bg-emerald-50"
                                                        )}
                                                        onClick={() => {
                                                            setSelectedClient(c);
                                                            setClientSearch('');
                                                            setSearchedClients([]);
                                                        }}
                                                    >
                                                        <div>
                                                            <p className="font-bold text-sm">{c.name}</p>
                                                            <p className="text-xs text-slate-500">{c.email}</p>
                                                        </div>
                                                        {selectedClient?.id === c.id && <Check className="h-4 w-4 text-emerald-600" />}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {selectedClient && (
                                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-sm text-emerald-900">{selectedClient.name}</p>
                                                    <p className="text-xs text-emerald-700">{selectedClient.email} • {selectedClient.phone}</p>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                        <Button variant="outline" className="w-full" onClick={() => setShowNewClientForm(true)}>
                                            <Plus className="h-4 w-4 mr-2" /> New Client
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-bold">New Client Details</p>
                                            <Button variant="ghost" size="sm" onClick={() => setShowNewClientForm(false)}>Cancel</Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Full Name</Label>
                                                <Input
                                                    value={newClient.name}
                                                    onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Email</Label>
                                                <Input
                                                    value={newClient.email}
                                                    onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                                                    placeholder="john@example.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Phone Number</Label>
                                            <Input
                                                value={newClient.phone}
                                                onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                                                placeholder="+351 912 345 678"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'details' && (
                        <div className="space-y-6">
                            {/* Stay Details */}
                            {selectedServices.stay && (
                                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Ship className="h-5 w-5 text-blue-600" />
                                        <h3 className="font-bold text-blue-900">Stay Details</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Houseboat</Label>
                                            <Select value={selectedBoatId} onValueChange={setSelectedBoatId}>
                                                <SelectTrigger className="bg-white">
                                                    <SelectValue placeholder="Select boat" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {boats.map(b => (
                                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Dates</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-white">
                                                        <CalendarDays className="mr-2 h-4 w-4" />
                                                        {stayDates.from ? format(stayDates.from, "PP") : "Start"} - {stayDates.to ? format(stayDates.to, "PP") : "End"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="range"
                                                        selected={{ from: stayDates.from, to: stayDates.to }}
                                                        onSelect={(range: any) => setStayDates(range || { from: undefined, to: undefined })}
                                                        numberOfMonths={2}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cruise Details */}
                            {selectedServices.cruise && (
                                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CalendarDays className="h-5 w-5 text-emerald-600" />
                                        <h3 className="font-bold text-emerald-900">Cruise Details</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Package</Label>
                                            <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                                                <SelectTrigger className="bg-white">
                                                    <SelectValue placeholder="Select package" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {packages.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Date</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-white">
                                                        <CalendarDays className="mr-2 h-4 w-4" />
                                                        {bookingDate ? format(bookingDate, "PPP") : "Pick a date"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={bookingDate}
                                                        onSelect={setBookingDate}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Restaurant Details */}
                            {selectedServices.meal && (
                                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Utensils className="h-5 w-5 text-amber-600" />
                                        <h3 className="font-bold text-amber-900">Restaurant Details</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Table</Label>
                                            <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                                                <SelectTrigger className="bg-white">
                                                    <SelectValue placeholder="Select table" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tables.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>Table {t.table_number}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Time</Label>
                                            <Input
                                                type="time"
                                                value={mealTime}
                                                onChange={e => setMealTime(e.target.value)}
                                                className="bg-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Date</Label>
                                            {!selectedServices.cruise && (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-white">
                                                            <CalendarDays className="mr-2 h-4 w-4" />
                                                            {bookingDate ? format(bookingDate, "PPP") : "Pick a date"}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={bookingDate}
                                                            onSelect={setBookingDate}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                            {selectedServices.cruise && (
                                                <div className="h-10 flex items-center text-sm text-slate-500 bg-white/50 px-3 rounded-md border border-dashed">
                                                    Same as Cruise ({bookingDate ? format(bookingDate, "MMM d") : "-"})
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4 pt-4 border-t">
                                <div className="flex-1 space-y-2">
                                    <Label>Total Guests</Label>
                                    <div className="flex items-center gap-3">
                                        <Users className="h-4 w-4 text-slate-400" />
                                        <Input
                                            type="number"
                                            value={guests}
                                            onChange={e => setGuests(e.target.value)}
                                            className="w-24"
                                            min="1"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'summary' && (
                        <div className="space-y-6">
                            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4">
                                <h3 className="text-xl font-black">Booking Summary</h3>
                                <div className="space-y-2 border-b border-white/10 pb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-white/60 uppercase tracking-widest text-[10px] font-black">Client</span>
                                        <span className="font-bold">{selectedClient?.name || newClient.name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-white/60 uppercase tracking-widest text-[10px] font-black">Guests</span>
                                        <span className="font-bold">{guests} Adults</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {selectedServices.stay && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                                <Ship className="h-4 w-4 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold">Houseboat Stay</p>
                                                <p className="text-xs text-white/60">
                                                    {getBoatName(selectedBoatId)} • {stayDates.from ? format(stayDates.from, 'MMM d') : '-'} to {stayDates.to ? format(stayDates.to, 'MMM d') : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {selectedServices.cruise && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                                <CalendarDays className="h-4 w-4 text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold">Daily Cruise</p>
                                                <p className="text-xs text-white/60">
                                                    {packages.find(p => p.id === selectedPackageId)?.name} • {bookingDate ? format(bookingDate, 'MMM d') : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {selectedServices.meal && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                                <Utensils className="h-4 w-4 text-amber-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold">Dinner Reservation</p>
                                                <p className="text-xs text-white/60">
                                                    Table {tables.find(t => t.id === selectedTableId)?.table_number} • {mealTime}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                    <span className="text-xl font-black">Total Price</span>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-emerald-400">€0.00</span>
                                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Manual Adjustment Available after Save</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    {step !== 'services' && (
                        <Button variant="outline" onClick={() => setStep(step === 'details' ? 'services' : 'details')}>
                            Back
                        </Button>
                    )}
                    <div className="flex-1" />
                    {step !== 'summary' ? (
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={!selectedClient && !newClient.name}
                            onClick={() => {
                                if (step === 'services') {
                                    if (Object.values(selectedServices).every(v => !v)) {
                                        toast({ variant: 'destructive', title: 'Selection Required', description: 'Please select at least one service.' });
                                        return;
                                    }
                                    setStep('details');
                                } else {
                                    setStep('summary');
                                }
                            }}
                        >
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={handleSaveBooking}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                            Confirm & Save Booking
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    function getBoatName(id: string) {
        return boats.find(b => b.id === id)?.name || 'Unknown Boat';
    }
}
