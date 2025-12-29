'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
    Search,
    Filter,
    Download,
    Ship,
    Utensils,
    Calendar,
    Loader2,
    Pencil,
    Trash2,
    Eye,
    FileText,
    FileSpreadsheet,
    MoreHorizontal,
    ChevronDown,
    RefreshCw,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, MessageSquare, User, CalendarDays, DollarSign, Plus, Phone, Mail, Clock, History, Check, Anchor, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { differenceInCalendarDays, eachDayOfInterval, isFriday, isSaturday, getDay } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Booking = {
    id: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    start_time: string;
    end_time: string;
    status: string;
    price: number;
    source: string;
    houseboat_id?: string;
    restaurant_table_id?: string;
    daily_travel_id?: string;
    created_at: string;
    notes?: string;
    extras?: string[]; // IDs of selected extras
    discount?: number;
    initial_payment_amount?: number;
};

type Extra = {
    id: string;
    name: string;
    description?: string;
    price: number;
    price_type: 'per_stay' | 'per_day' | 'per_person';
    type?: string;
};

type Boat = {
    id: string;
    name: string;
    modelId?: string;
    model_id?: string;
};

type Price = {
    modelId?: string;
    model_id?: string;
    weekday: number;
    weekend: number;
};

type PricingBreakdown = {
    weekdayNights: number;
    weekendNights: number;
    weekdayPrice: number;
    weekendPrice: number;
    rentalTotal: number;
    extrasTotal: number;
    preparationFee: number;
    discountAmount: number;
    total: number;
    deposit: number;
    balanceDue: number;
};

const STATUS_OPTIONS = ['Pending', 'Contacted', 'Confirmed', 'CheckIn', 'Completed', 'Cancelled'];
const TYPE_OPTIONS = ['All', 'Houseboat', 'Restaurant', 'Daily Travel'];

const statusColors: Record<string, string> = {
    'Pending': 'bg-amber-100 text-amber-800',
    'Contacted': 'bg-blue-100 text-blue-800',
    'Confirmed': 'bg-emerald-100 text-emerald-800',
    'CheckIn': 'bg-purple-100 text-purple-800',
    'Completed': 'bg-slate-100 text-slate-800',
    'Cancelled': 'bg-red-100 text-red-800',
};

export default function ReservationsPage() {
    const { supabase } = useSupabase();
    const { toast } = useToast();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [extras, setExtras] = useState<Extra[]>([]);
    const [boats, setBoats] = useState<Boat[]>([]);
    const [prices, setPrices] = useState<Price[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [formData, setFormData] = useState<Partial<Booking>>({});
    const [activeTab, setActiveTab] = useState('details');

    // Calculate pricing breakdown based on formData
    const pricingBreakdown = useMemo((): PricingBreakdown | null => {
        if (!formData.start_time || !formData.end_time || !formData.houseboat_id) return null;

        try {
            const start = parseISO(formData.start_time);
            const end = parseISO(formData.end_time);
            const nights = differenceInCalendarDays(end, start);
            if (nights <= 0) return null;

            // Find boat and its pricing
            const boat = boats.find(b => b.id === formData.houseboat_id);
            const modelId = boat?.modelId || boat?.model_id;
            const price = prices.find(p => p.modelId === modelId || p.model_id === modelId);

            const weekdayPrice = price?.weekday || 150;
            const weekendPrice = price?.weekend || 200;

            // Calculate weekday/weekend nights
            const days = eachDayOfInterval({ start, end });
            if (days.length > 0) days.pop(); // Remove checkout day

            let weekdayNights = 0;
            let weekendNights = 0;
            days.forEach(day => {
                if (isFriday(day) || isSaturday(day)) {
                    weekendNights++;
                } else {
                    weekdayNights++;
                }
            });

            const rentalTotal = (weekdayNights * weekdayPrice) + (weekendNights * weekendPrice);

            // Calculate extras total
            const selectedExtras = formData.extras || [];
            let extrasTotal = 0;
            selectedExtras.forEach(extraId => {
                const extra = extras.find(e => e.id === extraId);
                if (extra) {
                    if (extra.price_type === 'per_day') {
                        extrasTotal += extra.price * nights;
                    } else {
                        extrasTotal += extra.price;
                    }
                }
            });

            const preparationFee = 76; // Fixed preparation fee matching houseboat-detail.tsx
            const subtotal = rentalTotal + extrasTotal + preparationFee;
            const discountPercent = formData.discount || 0;
            const discountAmount = subtotal * (discountPercent / 100);
            const total = subtotal - discountAmount;
            const deposit = Math.ceil(total * 0.3);
            const paid = formData.initial_payment_amount || 0;
            const balanceDue = total - paid;

            return {
                weekdayNights,
                weekendNights,
                weekdayPrice,
                weekendPrice,
                rentalTotal,
                extrasTotal,
                preparationFee,
                discountAmount,
                total,
                deposit,
                balanceDue
            };
        } catch {
            return null;
        }
    }, [formData, boats, prices, extras]);

    // Get boat name for display
    const getBoatName = (houseboatId?: string) => {
        if (!houseboatId) return 'Unknown';
        const boat = boats.find(b => b.id === houseboatId);
        return boat?.name || 'Unknown Boat';
    };

    const handleEditClick = (booking: Booking) => {
        setSelectedBooking(booking);
        setFormData({ ...booking });
        setActiveTab('details');
        setIsEditDialogOpen(true);
    };

    const toggleExtra = (extraId: string) => {
        const currentExtras = formData.extras || [];
        if (currentExtras.includes(extraId)) {
            setFormData({ ...formData, extras: currentExtras.filter(id => id !== extraId) });
        } else {
            setFormData({ ...formData, extras: [...currentExtras, extraId] });
        }
    };

    // ... (useEffect for extras)

    // ... (getExtraNames)

    // ... (fetchBookings)

    // ... (useEffect for fetchBookings)

    // ... (getBookingType)

    // ... (getBookingIcon)

    // ... (filteredBookings)

    const handleSaveChanges = async () => {
        if (!selectedBooking || !supabase) return;
        setIsProcessing(true);
        try {
            // Remove fields that shouldn't be updated or formatted incorrectly
            const { id, created_at, ...updates } = formData;

            const { error } = await supabase
                .from('bookings')
                .update(updates)
                .eq('id', selectedBooking.id);

            if (error) throw error;
            toast({ title: 'Success', description: 'Booking updated successfully.' });

            // Update local state
            setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, ...updates } : b));
            setIsEditDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!supabase) return;

            // Fetch extras
            const { data: extrasData } = await supabase.from('extras').select('*');
            if (extrasData) setExtras(extrasData);

            // Fetch boats
            const { data: boatsData } = await supabase.from('boats').select('id, name, model_id');
            if (boatsData) setBoats(boatsData.map(b => ({ ...b, modelId: b.model_id })));

            // Fetch prices
            const { data: pricesData } = await supabase.from('houseboat_prices').select('model_id, weekday_price, weekend_price');
            if (pricesData) setPrices(pricesData.map(p => ({
                model_id: p.model_id,
                modelId: p.model_id,
                weekday: p.weekday_price || 150,
                weekend: p.weekend_price || 200
            })));
        };
        fetchData();
    }, [supabase]);

    const getExtraNames = (ids: string[]) => {
        if (!ids || !Array.isArray(ids)) return 'None';
        return ids.map(id => extras.find(e => e.id === id)?.name).filter(Boolean).join(', ') || 'None';
    };

    const fetchBookings = async () => {
        if (!supabase) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBookings(data || []);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch reservations.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [supabase]);

    const getBookingType = (b: Booking) => {
        if (b.houseboat_id) return 'Houseboat';
        if (b.restaurant_table_id) return 'Restaurant';
        return 'Daily Travel';
    };

    const getBookingIcon = (b: Booking) => {
        if (b.houseboat_id) return <Ship className="h-4 w-4" />;
        if (b.restaurant_table_id) return <Utensils className="h-4 w-4" />;
        return <Calendar className="h-4 w-4" />;
    };

    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            const matchesSearch = !searchQuery ||
                b.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.client_email?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'All' || b.status === statusFilter;

            const type = getBookingType(b);
            const matchesType = typeFilter === 'All' || type === typeFilter;

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [bookings, searchQuery, statusFilter, typeFilter]);



    const handleDelete = async () => {
        if (!selectedBooking || !supabase) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('bookings').delete().eq('id', selectedBooking.id);
            if (error) throw error;
            toast({ title: 'Success', description: 'Reservation deleted.' });
            setBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
            setIsDeleteDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const exportToCSV = () => {
        const headers = ['Client Name', 'Email', 'Phone', 'Type', 'Status', 'Check-in', 'Check-out', 'Price'];
        const rows = filteredBookings.map(b => [
            b.client_name,
            b.client_email,
            b.client_phone,
            getBookingType(b),
            b.status,
            b.start_time ? format(parseISO(b.start_time), 'yyyy-MM-dd') : '',
            b.end_time ? format(parseISO(b.end_time), 'yyyy-MM-dd') : '',
            b.price?.toString() || '0'
        ]);

        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reservations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        toast({ title: 'Exported', description: 'CSV file downloaded.' });
    };

    const stats = useMemo(() => ({
        total: bookings.length,
        pending: bookings.filter(b => b.status === 'Pending').length,
        confirmed: bookings.filter(b => b.status === 'Confirmed').length,
        revenue: bookings.filter(b => b.status !== 'Cancelled').reduce((sum, b) => sum + (b.price || 0), 0),
    }), [bookings]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reservations"
                description="Manage all bookings across houseboats, restaurant, and travel packages"
            />

            {/* Stats - Refined with shadows */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="shadow-sm border-stone-200">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-xs text-muted-foreground">Total Bookings</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-stone-200">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                        <p className="text-xs text-muted-foreground">Pending</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-stone-200">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold text-emerald-600">{stats.confirmed}</p>
                        <p className="text-xs text-muted-foreground">Confirmed</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-stone-200">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold">€{stats.revenue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total Revenue</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters - Refined */}
            <Card className="p-4 shadow-sm border-stone-200">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* ... (Search & Filters remain same but ensure consistent styling) ... */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white"
                        />
                    </div>
                    {/* ... (Selects) ... */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px] bg-white">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[140px] bg-white">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={fetchBookings} className="bg-white">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 bg-white">
                                <Download className="h-4 w-4" /> Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={exportToCSV}>
                                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export CSV
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </Card>

            {/* Table - Compact & Refined */}
            {isLoading ? (
                <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : (
                <Card className="overflow-hidden border-stone-200 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-stone-100/80 border-b border-stone-200">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Client</th>
                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Type</th>
                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Dates</th>
                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Price</th>
                                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {filteredBookings.map((booking, idx) => (
                                    <tr key={booking.id} className={cn("hover:bg-blue-50/50 transition-colors group", idx % 2 === 0 ? "bg-white" : "bg-stone-50/30")}>
                                        <td className="py-2.5 px-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-foreground">{booking.client_name}</span>
                                                <span className="text-xs text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity">
                                                    ({booking.client_email})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                {getBookingIcon(booking)}
                                                <span>{getBookingType(booking)}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground">
                                            {booking.start_time && (
                                                <span className="text-xs">
                                                    {format(parseISO(booking.start_time), 'MMM d')}
                                                    {booking.end_time && ` - ${format(parseISO(booking.end_time), 'MMM d')}`}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-4 whitespace-nowrap">
                                            <Badge className={cn('text-[10px] font-medium border-0 px-2 py-0.5 rounded-full shadow-none', statusColors[booking.status] || 'bg-slate-100')}>
                                                {booking.status}
                                            </Badge>
                                        </td>
                                        <td className="py-2.5 px-4 whitespace-nowrap font-semibold text-foreground">€{booking.price || 0}</td>
                                        <td className="py-2.5 px-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1 text-muted-foreground">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 hover:text-foreground"
                                                    onClick={() => handleEditClick(booking)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-400 hover:text-red-600 h-7 w-7"
                                                    onClick={() => {
                                                        setSelectedBooking(booking);
                                                        setIsDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredBookings.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-muted-foreground bg-white">
                                            <p className="text-lg font-semibold mb-1">No reservations found</p>
                                            <p className="text-sm">Try adjusting your filters or search.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Edit Reservation Dialog - Responsive Two-Panel Layout */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="w-full max-w-[95vw] lg:max-w-7xl max-h-[95vh] overflow-hidden p-0 gap-0">
                    {selectedBooking && (
                        <div className="flex flex-col h-full max-h-[95vh]">
                            {/* Compact Header */}
                            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white px-4 py-4 lg:px-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Anchor className="h-5 w-5 text-blue-300" />
                                        </div>
                                        <div className="min-w-0">
                                            <DialogTitle className="text-base lg:text-lg font-semibold text-white truncate">
                                                {selectedBooking.client_name}
                                            </DialogTitle>
                                            <DialogDescription className="text-blue-200 text-xs lg:text-sm truncate">
                                                {getBoatName(selectedBooking.houseboat_id)}
                                            </DialogDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs text-slate-300 flex items-center gap-1.5">
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            {formData.start_time && format(parseISO(formData.start_time), 'MMM d')}
                                            {formData.end_time && ` → ${format(parseISO(formData.end_time), 'MMM d')}`}
                                        </div>
                                        <Badge className={cn('text-xs font-semibold px-2 py-1', statusColors[selectedBooking.status])}>
                                            {selectedBooking.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content - Responsive Two-Column */}
                            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                                {/* Left Panel - Form (scrollable) */}
                                <div className="flex-1 flex flex-col min-w-0 lg:border-r border-slate-200">
                                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                                        <div className="border-b bg-slate-50/80 px-3 lg:px-4 flex-shrink-0">
                                            <TabsList className="h-10 bg-transparent p-0 gap-0 w-full justify-start overflow-x-auto">
                                                <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 lg:px-4 text-xs lg:text-sm gap-1.5 flex-shrink-0">
                                                    <User className="h-3.5 w-3.5" />
                                                    Details
                                                </TabsTrigger>
                                                <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 lg:px-4 text-xs lg:text-sm gap-1.5 flex-shrink-0">
                                                    <CreditCard className="h-3.5 w-3.5" />
                                                    Payments
                                                </TabsTrigger>
                                                <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 lg:px-4 text-xs lg:text-sm gap-1.5 flex-shrink-0">
                                                    <History className="h-3.5 w-3.5" />
                                                    History
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4 lg:p-5">
                                            {/* Details Tab */}
                                            <TabsContent value="details" className="mt-0 space-y-4 lg:space-y-5">
                                                {/* Status */}
                                                <div className="flex flex-wrap items-center gap-3 p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                                                    <Label className="text-sm font-medium">Status</Label>
                                                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                                        <SelectTrigger className="w-[140px] lg:w-[160px] bg-white h-8 lg:h-9 text-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {STATUS_OPTIONS.map(s => (
                                                                <SelectItem key={s} value={s}>
                                                                    <span className="flex items-center gap-2">
                                                                        <span className={cn('w-2 h-2 rounded-full', statusColors[s]?.split(' ')[0])}></span>
                                                                        {s}
                                                                    </span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Client Info */}
                                                <div>
                                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                        <User className="h-3.5 w-3.5 text-blue-500" />
                                                        Client Information
                                                    </h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Name</Label>
                                                            <Input value={formData.client_name || ''} onChange={e => setFormData({ ...formData, client_name: e.target.value })} className="h-8 lg:h-9 bg-white text-sm" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Email</Label>
                                                            <Input type="email" value={formData.client_email || ''} onChange={e => setFormData({ ...formData, client_email: e.target.value })} className="h-8 lg:h-9 bg-white text-sm" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Phone</Label>
                                                            <Input value={formData.client_phone || ''} onChange={e => setFormData({ ...formData, client_phone: e.target.value })} className="h-8 lg:h-9 bg-white text-sm" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Source</Label>
                                                            <Input value={selectedBooking.source || 'Website'} disabled className="h-8 lg:h-9 bg-slate-50 text-sm" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Booking Dates - READ ONLY */}
                                                <div>
                                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                        <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
                                                        Booking Dates
                                                        <span className="text-[10px] text-amber-600 font-normal ml-auto bg-amber-50 px-2 py-0.5 rounded">(Change via Houseboat Calendar)</span>
                                                    </h3>
                                                    <div className="w-full h-10 lg:h-11 flex items-center px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                                                        <CalendarDays className="mr-2 h-4 w-4 text-slate-400" />
                                                        {formData.start_time && formData.end_time ? (
                                                            <span className="text-sm">
                                                                {format(parseISO(formData.start_time), 'EEE, MMM d')} → {format(parseISO(formData.end_time), 'EEE, MMM d, yyyy')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">No dates set</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Extras Selection */}
                                                <div>
                                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                        <Plus className="h-3.5 w-3.5 text-blue-500" />
                                                        Extras & Add-ons
                                                    </h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {extras.filter(e => e.type === 'houseboat' || !e.type).map(extra => (
                                                            <div
                                                                key={extra.id}
                                                                onClick={() => toggleExtra(extra.id)}
                                                                className={cn(
                                                                    "flex items-center gap-2 p-2 lg:p-3 rounded-lg border cursor-pointer transition-all",
                                                                    (formData.extras || []).includes(extra.id)
                                                                        ? "bg-blue-50 border-blue-300 shadow-sm"
                                                                        : "bg-white border-slate-200 hover:border-slate-300"
                                                                )}
                                                            >
                                                                <Checkbox checked={(formData.extras || []).includes(extra.id)} className="pointer-events-none" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs lg:text-sm font-medium truncate">{extra.name}</p>
                                                                    <p className="text-[10px] lg:text-xs text-muted-foreground">
                                                                        €{extra.price} / {extra.price_type === 'per_day' ? 'day' : 'stay'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Notes */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Admin Notes</Label>
                                                    <Textarea placeholder="Internal notes..." value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="min-h-[50px] lg:min-h-[60px] bg-white resize-none text-sm" />
                                                </div>
                                            </TabsContent>

                                            {/* Payments Tab */}
                                            <TabsContent value="payments" className="mt-0 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-semibold">Payment History</h3>
                                                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => toast({ title: 'Coming Soon', description: 'Payment tracking will be available soon.' })}>
                                                        <Plus className="h-3.5 w-3.5" />
                                                        Add Payment
                                                    </Button>
                                                </div>
                                                <div className="border rounded-lg overflow-hidden">
                                                    <div className="bg-slate-50 px-3 py-2 border-b grid grid-cols-4 text-[10px] lg:text-xs font-medium text-muted-foreground">
                                                        <span>Date</span>
                                                        <span>Method</span>
                                                        <span>Amount</span>
                                                        <span>Status</span>
                                                    </div>
                                                    <div className="p-6 text-center text-muted-foreground">
                                                        <CreditCard className="h-6 w-6 mx-auto mb-2 opacity-30" />
                                                        <p className="text-xs">No payments yet</p>
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            {/* History Tab */}
                                            <TabsContent value="history" className="mt-0 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-semibold">Contact History</h3>
                                                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => toast({ title: 'Coming Soon', description: 'Contact history tracking will be available soon.' })}>
                                                        <Plus className="h-3.5 w-3.5" />
                                                        Add Entry
                                                    </Button>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex gap-2 p-2 lg:p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                        <div className="w-7 h-7 lg:w-8 lg:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <Mail className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-blue-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between text-xs lg:text-sm">
                                                                <span className="font-medium">Confirmation Sent</span>
                                                                <span className="text-[10px] lg:text-xs text-muted-foreground">{format(parseISO(selectedBooking.created_at), 'MMM d')}</span>
                                                            </div>
                                                            <p className="text-[10px] lg:text-xs text-muted-foreground truncate">Email sent to {selectedBooking.client_email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 p-2 lg:p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                        <div className="w-7 h-7 lg:w-8 lg:h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <Clock className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-emerald-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between text-xs lg:text-sm">
                                                                <span className="font-medium">Booking Created</span>
                                                                <span className="text-[10px] lg:text-xs text-muted-foreground">{format(parseISO(selectedBooking.created_at), 'MMM d')}</span>
                                                            </div>
                                                            <p className="text-[10px] lg:text-xs text-muted-foreground">Via {selectedBooking.source || 'Website'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TabsContent>
                                        </div>
                                    </Tabs>
                                </div>

                                {/* Right Panel - Price Breakdown (Separate, Scrollable, 2-col) */}
                                <div className="w-full lg:w-[340px] xl:w-[380px] bg-gradient-to-b from-slate-50 to-white flex flex-col border-t lg:border-t-0 max-h-[40vh] lg:max-h-none">
                                    {/* Price Panel Header */}
                                    <div className="p-3 lg:p-4 border-b bg-white flex items-center justify-between flex-shrink-0">
                                        <h3 className="text-sm font-semibold flex items-center gap-2">
                                            <DollarSign className="h-4 w-4 text-emerald-600" />
                                            Price Breakdown
                                        </h3>
                                        {pricingBreakdown && (
                                            <span className="text-lg lg:text-xl font-bold text-emerald-600">€{pricingBreakdown.total.toFixed(0)}</span>
                                        )}
                                    </div>

                                    {/* Scrollable Pricing Content */}
                                    <div className="flex-1 overflow-y-auto p-3 lg:p-4">
                                        {pricingBreakdown ? (
                                            <div className="space-y-3">
                                                {/* 2-Column Price Grid */}
                                                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                                    {/* Weekday */}
                                                    {pricingBreakdown.weekdayNights > 0 && (
                                                        <div className="grid grid-cols-2 gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0">
                                                            <span className="text-xs text-muted-foreground">{pricingBreakdown.weekdayNights} × €{pricingBreakdown.weekdayPrice} weekday</span>
                                                            <span className="text-xs text-right font-medium">€{pricingBreakdown.weekdayNights * pricingBreakdown.weekdayPrice}</span>
                                                        </div>
                                                    )}
                                                    {/* Weekend */}
                                                    {pricingBreakdown.weekendNights > 0 && (
                                                        <div className="grid grid-cols-2 gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0">
                                                            <span className="text-xs text-muted-foreground">{pricingBreakdown.weekendNights} × €{pricingBreakdown.weekendPrice} weekend</span>
                                                            <span className="text-xs text-right font-medium">€{pricingBreakdown.weekendNights * pricingBreakdown.weekendPrice}</span>
                                                        </div>
                                                    )}
                                                    {/* Prep & Taxes */}
                                                    <div className="grid grid-cols-2 gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0">
                                                        <span className="text-xs text-muted-foreground">Prep & Taxes</span>
                                                        <span className="text-xs text-right font-medium">€{pricingBreakdown.preparationFee}</span>
                                                    </div>
                                                    {/* Extras */}
                                                    {pricingBreakdown.extrasTotal > 0 && (formData.extras || []).map(extraId => {
                                                        const extra = extras.find(e => e.id === extraId);
                                                        if (!extra) return null;
                                                        const nights = pricingBreakdown.weekdayNights + pricingBreakdown.weekendNights;
                                                        const extraPrice = extra.price_type === 'per_day' ? extra.price * nights : extra.price;
                                                        return (
                                                            <div key={extraId} className="grid grid-cols-2 gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0">
                                                                <span className="text-xs text-emerald-600 truncate">{extra.name}</span>
                                                                <span className="text-xs text-right font-medium text-emerald-600">+€{extraPrice}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    {/* Rental Total */}
                                                    <div className="grid grid-cols-2 gap-2 px-3 py-2 bg-slate-50">
                                                        <span className="text-xs font-semibold">Rental Total</span>
                                                        <span className="text-xs text-right font-bold">€{pricingBreakdown.rentalTotal}</span>
                                                    </div>
                                                </div>

                                                {/* Discount */}
                                                <div className="bg-white rounded-lg border border-slate-200 p-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Discount</span>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={formData.discount || 0}
                                                            onChange={e => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                                                            className="h-7 w-16 text-center text-xs"
                                                        />
                                                        <span className="text-xs text-muted-foreground">%</span>
                                                        {pricingBreakdown.discountAmount > 0 && (
                                                            <span className="text-xs text-emerald-600 ml-auto font-medium">-€{pricingBreakdown.discountAmount.toFixed(0)}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Total Card */}
                                                <div className="bg-[#0B1120] rounded-lg p-3 lg:p-4 text-white">
                                                    <div className="grid grid-cols-2 gap-2 items-center">
                                                        <span className="font-semibold text-sm">Total Amount</span>
                                                        <span className="text-xl lg:text-2xl font-bold text-right">€{pricingBreakdown.total.toFixed(0)}</span>
                                                    </div>
                                                </div>

                                                {/* Amount Paid */}
                                                <div className="bg-white rounded-lg border border-slate-200 p-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-medium text-slate-700">Amount Paid</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-sm text-slate-500">€</span>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                value={formData.initial_payment_amount || 0}
                                                                onChange={e => setFormData({ ...formData, initial_payment_amount: parseFloat(e.target.value) || 0 })}
                                                                className="h-8 w-24 text-right text-sm font-semibold"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Amount Due */}
                                                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg p-3 lg:p-4 text-white">
                                                    <div className="grid grid-cols-2 gap-2 items-center">
                                                        <span className="font-semibold text-sm">Amount Due</span>
                                                        <span className="text-xl lg:text-2xl font-bold text-right">
                                                            €{Math.max(0, pricingBreakdown.total - (formData.initial_payment_amount || 0)).toFixed(0)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Apply Button */}
                                                <Button
                                                    variant="outline"
                                                    className="w-full gap-2 h-9 text-sm"
                                                    onClick={() => setFormData({ ...formData, price: pricingBreakdown.total })}
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                    Apply to Booking
                                                </Button>

                                                {/* Manual Override */}
                                                <div className="pt-2 border-t border-dashed border-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs text-muted-foreground flex-shrink-0">Override Price</Label>
                                                        <Input
                                                            type="number"
                                                            value={formData.price || 0}
                                                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                                            className="h-8 font-semibold text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                                <p className="text-xs">Select dates to see pricing</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t bg-white p-3 lg:p-4 flex flex-col sm:flex-row justify-end gap-2 flex-shrink-0">
                                <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="h-9 text-sm">
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveChanges} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 gap-2 h-9 text-sm">
                                    {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="z-[100]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Reservation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the booking for {selectedBooking?.client_name}. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
