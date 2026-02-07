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
    Globe,
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
import { DateRange } from 'react-day-picker';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, MessageSquare, User, CalendarDays, DollarSign, Plus, Phone, Mail, Clock, History, Check, Anchor, ChevronLeft, ChevronRight, X, Fuel, ArrowRight } from 'lucide-react';
import { generateCheckinManifest, generateFuelManifest } from '@/lib/pdf-designs';
import { Booking as PDFBooking, Boat as PDFBoat, WebsiteSettings } from '@/lib/types';
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

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Maintenance'];

const statusColors: Record<string, string> = {
    'Pending': 'bg-amber-100 text-[#854d0e]',
    'Contacted': 'bg-[#34C759]/20 text-[#18230F]',
    'Confirmed': 'bg-[#34C759] text-[#18230F]',
    'CheckIn': 'bg-purple-100 text-[#581c87]',
    'Completed': 'bg-slate-200 text-[#18230F]',
    'Cancelled': 'bg-red-100 text-[#991b1b]',
    'Maintenance': 'bg-orange-500 text-white',
};

export default function ReservationsPage() {
    const { supabase } = useSupabase();
    const { toast } = useToast();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [boatFilter, setBoatFilter] = useState('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [extras, setExtras] = useState<Extra[]>([]);
    const [boats, setBoats] = useState<Boat[]>([]);
    const [prices, setPrices] = useState<Price[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [formData, setFormData] = useState<Partial<Booking>>({});
    const [activeTab, setActiveTab] = useState('details');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Booking | 'type'; direction: 'asc' | 'desc' } | null>(null);
    const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [bulkStatus, setBulkStatus] = useState('Confirmed');
    const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);

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

            // Fetch website settings
            try {
                const { data: settingsData, error: settingsError } = await supabase.from('website_settings').select('*').limit(1).single();
                if (settingsData) {
                    setWebsiteSettings(settingsData);
                } else if (!settingsError) {
                    // Provide defaults if table is empty
                    setWebsiteSettings({
                        company_name: 'Amieira Marina',
                        logoUrl: '',
                        email: 'info@amieiramarina.com',
                        phone: '+351 266 611 101',
                        address: 'Amieira Marina, 7220-134 Portel, Portugal',
                        social_links: {},
                        pdf_terms: '',
                        pdf_details: ''
                    } as any);
                }
            } catch (e) {
                console.error("Error fetching settings:", e);
            }
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
                .not('houseboat_id', 'is', null)
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

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, boatFilter, dateRange]);



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
        let result = bookings.filter(b => {
            const matchesSearch = !searchQuery ||
                b.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.client_email?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
            const matchesBoat = boatFilter === 'all' || b.houseboat_id === boatFilter;

            let matchesDate = true;
            if (dateRange?.from) {
                const bookingDate = parseISO(b.start_time);
                matchesDate = bookingDate >= dateRange.from &&
                    (!dateRange.to || bookingDate <= dateRange.to);
            }

            return matchesSearch && matchesStatus && matchesBoat && matchesDate;
        });

        // Add sorting
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                let aValue: any = sortConfig.key === 'type' ? getBookingType(a) : a[sortConfig.key as keyof Booking];
                let bValue: any = sortConfig.key === 'type' ? getBookingType(b) : b[sortConfig.key as keyof Booking];

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [bookings, searchQuery, statusFilter, boatFilter, dateRange, sortConfig]);



    const handleBulkDelete = async () => {
        if (!supabase || selectedIds.length === 0) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('bookings').delete().in('id', selectedIds);
            if (error) throw error;
            toast({ title: 'Success', description: `${selectedIds.length} reservations deleted.` });
            setBookings(prev => prev.filter(b => !selectedIds.includes(b.id)));
            setSelectedIds([]);
            setIsBulkDeleteDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkStatusUpdate = async () => {
        if (!supabase || selectedIds.length === 0) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: bulkStatus })
                .in('id', selectedIds);

            if (error) throw error;
            toast({ title: 'Success', description: `${selectedIds.length} reservations updated to ${bulkStatus}.` });

            setBookings(prev => prev.map(b =>
                selectedIds.includes(b.id) ? { ...b, status: bulkStatus } : b
            ));
            setSelectedIds([]);
            setIsBulkStatusDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredBookings.length && filteredBookings.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredBookings.map(b => b.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSort = (key: keyof Booking | 'type') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

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
        const headers = ['Client Name', 'Email', 'Phone', 'Source', 'Status', 'Check-in', 'Check-out', 'Price'];
        const rows = filteredBookings.map(b => [
            b.client_name,
            b.client_email,
            b.client_phone,
            b.source || 'Direct',
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

    const transformToPDFBooking = (b: Booking): PDFBooking => ({
        id: b.id,
        clientName: b.client_name,
        clientEmail: b.client_email,
        clientPhone: b.client_phone,
        startTime: b.start_time,
        endTime: b.end_time,
        status: b.status as any,
        source: b.source,
        price: b.price,
        discount: b.discount,
        initialPaymentAmount: b.initial_payment_amount,
        houseboatId: b.houseboat_id,
        notes: b.notes,
    });

    const handleExportPDF = async (booking: Booking, type: 'checkin' | 'fuel') => {
        // Fallback settings if fetch failed
        const settings: WebsiteSettings = websiteSettings || {
            company_name: 'Amieira Marina',
            logoUrl: '',
            email: 'info@amieiramarina.com',
            phone: '+351 266 611 101',
            address: 'Amieira Marina, 7220-134 Portel, Portugal',
            social_links: {},
            pdf_terms: (websiteSettings as any)?.pdf_terms_and_conditions || '',
            pdf_details: (websiteSettings as any)?.pdf_other_details || ''
        } as any;

        // Ensure PDF design keys are mapped correctly if loaded from DB
        if (websiteSettings) {
            (settings as any).pdf_terms = (websiteSettings as any).pdf_terms_and_conditions || '';
            (settings as any).pdf_details = (websiteSettings as any).pdf_other_details || '';
        }

        const pdfBooking = transformToPDFBooking(booking);
        const boat = boats.find(b => b.id === booking.houseboat_id);
        const pdfBoat: PDFBoat | undefined = boat ? {
            id: boat.id,
            name: boat.name,
            model_id: boat.modelId,
            modelName: boat.name.split(' ')[0] // Fallback if model name unknown
        } : undefined;

        if (type === 'checkin') {
            // Calculate extras total if booking has extras
            const bookingExtras = booking.extras || [];
            const extrasTotal = bookingExtras.reduce((sum: number, extraId: string) => {
                const extra = extras.find((e: Extra) => e.id === extraId);
                return sum + (extra?.price || 0);
            }, 0);
            await generateCheckinManifest(pdfBooking, pdfBoat, settings, extrasTotal);
        } else {
            await generateFuelManifest(pdfBooking, pdfBoat, settings);
        }
        toast({ title: 'PDF Generated', description: `${type === 'checkin' ? 'Check-in' : 'Fuel'} manifest exported.` });
    };

    const handleBulkExportPDF = (type: 'checkin' | 'fuel') => {
        const selectedBookings = bookings.filter(b => selectedIds.includes(b.id));
        if (selectedBookings.length === 0) return;

        selectedBookings.forEach(b => handleExportPDF(b, type));
        toast({ title: 'Bulk Export Complete', description: `Exported ${selectedBookings.length} ${type} PDFs.` });
    };

    return (
        <div className="space-y-6 relative pb-20">
            <PageHeader
                title="Houseboat Reservations"
                description="Manage houseboat rental bookings, monitor status, and handle check-ins."
            />

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-[#18230F] text-white px-6 py-3 rounded-2xl flex items-center gap-6 border border-white/10 backdrop-blur-xl">
                        <div className="flex items-center gap-2 border-r border-white/20 pr-6">
                            <div className="bg-[#34C759] text-[#18230F] w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">
                                {selectedIds.length}
                            </div>
                            <span className="text-sm font-medium text-white/80">Selected</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white/80 hover:text-white hover:bg-white/10 gap-2 h-9 px-3 rounded-xl transition-all"
                                onClick={() => setIsBulkStatusDialogOpen(true)}
                            >
                                <Check className="h-4 w-4 text-[#34C759]" />
                                Status
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white/80 hover:text-white hover:bg-white/10 gap-2 h-9 px-3 rounded-xl transition-all"
                                    >
                                        <Download className="h-4 w-4 text-[#34C759]" />
                                        Print
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-2xl border-[#18230F]/10 shadow-2xl bg-[#18230F] text-white p-2">
                                    <DropdownMenuItem onClick={() => handleBulkExportPDF('checkin')} className="rounded-xl hover:bg-white/10 flex items-center gap-3 py-2.5 px-4 cursor-pointer">
                                        <FileText className="h-4 w-4 text-[#34C759]" />
                                        <span>Check-in Manifests</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkExportPDF('fuel')} className="rounded-xl hover:bg-white/10 flex items-center gap-3 py-2.5 px-4 cursor-pointer border-t border-white/5">
                                        <Fuel className="h-4 w-4 text-orange-400" />
                                        <span>Fuel Usage Forms</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white/80 hover:text-red-400 hover:bg-red-500/10 gap-2 h-9 px-3 rounded-xl transition-all"
                                onClick={() => setIsBulkDeleteDialogOpen(true)}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white/40 hover:text-white h-9 w-9 p-0 rounded-xl"
                                onClick={() => setSelectedIds([])}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats - Premium Redesign */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="relative overflow-hidden border-none bg-[#F1F8F1] transition-all duration-300 rounded-2xl shadow-none">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-black text-[#18230F]">{stats.total}</p>
                                <p className="text-xs font-bold text-[#18230F] uppercase tracking-wider">Total Bookings</p>
                            </div>
                            <div className="p-2.5 bg-white/50 rounded-xl">
                                <Calendar className="h-5 w-5 text-[#18230F]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-none bg-[#F1F8F1] transition-all duration-300 rounded-2xl shadow-none">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
                                <p className="text-xs font-bold text-[#18230F] uppercase tracking-wider">Pending Requests</p>
                            </div>
                            <div className="p-2.5 bg-white/50 rounded-xl">
                                <Clock className="h-5 w-5 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-none bg-[#F1F8F1] transition-all duration-300 rounded-2xl shadow-none">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-black text-[#34C759]">{stats.confirmed}</p>
                                <p className="text-xs font-bold text-[#18230F] uppercase tracking-wider">Confirmed</p>
                            </div>
                            <div className="p-2.5 bg-white/50 rounded-xl">
                                <Check className="h-5 w-5 text-[#34C759]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-none bg-[#18230F] text-white transition-all duration-300 rounded-2xl shadow-none">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-black text-white">€{stats.revenue.toLocaleString()}</p>
                                <p className="text-xs font-bold text-white uppercase tracking-wider">Total Revenue</p>
                            </div>
                            <div className="p-2.5 bg-white/10 rounded-xl">
                                <DollarSign className="h-5 w-5 text-[#34C759]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters - Premium Unified Style - Split Aligned & Flat - Transparent Container */}
            <div className="mb-6 px-1">
                <div className="flex flex-col xl:flex-row items-center justify-between gap-2 w-full">
                    {/* Search - More Prominent */}
                    <div className="relative w-full lg:w-[450px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#854d0e]/60" />
                        <Input
                            placeholder="Search client, email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 bg-amber-100 border-[#18230F]/5 focus:bg-white focus:border-[#34C759]/30 rounded-full text-sm font-bold text-[#854d0e] placeholder:text-[#854d0e]/50 transition-all shadow-none ring-0"
                        />
                    </div>

                    {/* Filter Group - Right Aligned */}
                    <div className="flex flex-wrap items-center justify-end gap-2 w-full xl:w-auto">

                        {/* Date Range Picker */}
                        <div className="grid gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant="outline"
                                        className={cn(
                                            "w-[240px] justify-start text-left font-bold h-10 rounded-full border-[#18230F]/5 bg-amber-100 text-[#854d0e] hover:border-[#34C759]/30 hover:bg-emerald-50 transition-all shadow-none",
                                            !dateRange && "text-[#854d0e]/50",
                                            dateRange && "bg-[#34C759]/10 border-[#34C759]/20"
                                        )}
                                    >
                                        <Calendar className="mr-2 h-4 w-4 shrink-0 text-[#854d0e]/60" />
                                        <span className="truncate">
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, "LLL dd, y")} -{" "}
                                                        {format(dateRange.to, "LLL dd, y")}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, "LLL dd, y")
                                                )
                                            ) : (
                                                "Pick a date range"
                                            )}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Houseboat Filter */}
                        <Select value={boatFilter} onValueChange={setBoatFilter}>
                            <SelectTrigger className={cn(
                                "w-[180px] h-10 rounded-full border-[#18230F]/5 bg-amber-100 text-[#854d0e] hover:border-[#34C759]/30 hover:bg-emerald-50 transition-all font-bold shadow-none [&>span]:flex [&>span]:items-center [&>span]:gap-2",
                                boatFilter !== 'all' && "bg-[#34C759]/10 border-[#34C759]/20"
                            )}>
                                <SelectValue placeholder="All Boats" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-[#18230F]/10 p-1">
                                <SelectItem value="all" className="font-bold text-[#854d0e] focus:bg-[#82cc91]/20 focus:text-[#854d0e] hover:bg-[#82cc91]/20 hover:text-[#854d0e] rounded-lg transition-colors cursor-pointer data-[state=checked]:bg-[#82cc91]/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 flex justify-center">
                                            <Ship className="h-4 w-4 opacity-70" />
                                        </div>
                                        All Houseboats
                                    </div>
                                </SelectItem>
                                {boats.map((boat) => (
                                    <SelectItem key={boat.id} value={boat.id} className="font-bold text-[#854d0e] focus:bg-[#82cc91]/20 focus:text-[#854d0e] hover:bg-[#82cc91]/20 hover:text-[#854d0e] rounded-lg transition-colors cursor-pointer data-[state=checked]:bg-[#82cc91]/20">
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 flex justify-center">
                                                <Ship className="h-4 w-4 text-[#34C759]" />
                                            </div>
                                            {boat.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className={cn(
                                "w-[160px] h-10 rounded-full border-[#18230F]/5 bg-amber-100 text-[#854d0e] hover:border-[#34C759]/30 hover:bg-emerald-50 transition-all font-bold shadow-none [&>span]:flex [&>span]:items-center [&>span]:gap-2",
                                statusFilter !== 'All' && "bg-[#34C759]/10 border-[#34C759]/20"
                            )}>
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-[#18230F]/10 p-1">
                                <SelectItem value="All" className="font-bold text-[#854d0e] focus:bg-[#82cc91]/20 focus:text-[#854d0e] hover:bg-[#82cc91]/20 hover:text-[#854d0e] rounded-lg transition-colors cursor-pointer data-[state=checked]:bg-[#82cc91]/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 flex justify-center">
                                            <Filter className="h-4 w-4 opacity-70" />
                                        </div>
                                        All Status
                                    </div>
                                </SelectItem>
                                {STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status} value={status} className="font-bold text-[#854d0e] focus:bg-[#82cc91]/20 focus:text-[#854d0e] hover:bg-[#82cc91]/20 hover:text-[#854d0e] rounded-lg transition-colors cursor-pointer data-[state=checked]:bg-[#82cc91]/20">
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 flex justify-center">
                                                {status === 'Pending' && <Clock className="h-4 w-4 text-amber-600" />}
                                                {status === 'Confirmed' && <Check className="h-4 w-4 text-green-600" />}
                                                {status === 'Completed' && <Anchor className="h-4 w-4 text-blue-600" />}
                                                {status === 'Cancelled' && <X className="h-4 w-4 text-red-600" />}
                                                {status === 'Maintenance' && <RefreshCw className="h-4 w-4 text-orange-600" />}
                                            </div>
                                            {status}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Reset Button */}
                        {(statusFilter !== 'All' || boatFilter !== 'all' || dateRange || searchQuery) && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setStatusFilter('All');
                                    setBoatFilter('all');
                                    setDateRange(undefined);
                                    setSearchQuery('');
                                }}
                                className="h-10 px-4 text-[#18230F]/60 hover:text-red-500 hover:bg-red-50/50 rounded-full transition-all font-semibold shadow-none"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Clear All
                            </Button>
                        )}

                        <div className="h-8 w-px bg-slate-200 mx-1 hidden xl:block" />

                        {/* Export Button - Accent Color & Capsule */}
                        <div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-10 rounded-full px-6 gap-2 bg-[#70C167] text-[#18230F] border-none hover:bg-[#62ad5a] transition-all font-black shadow-none ring-0">
                                        <Download className="h-4 w-4 shrink-0" />
                                        Export
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                    <DropdownMenuItem onClick={exportToCSV}>
                                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                                        Export CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkExportPDF('checkin')}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Check-in Manifests
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkExportPDF('fuel')}>
                                        <Fuel className="h-4 w-4 mr-2" />
                                        Fuel Manifests
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table - Premium Redesign */}
            {
                isLoading ? (
                    <div className="grid grid-cols-1 gap-2">
                        {[...Array(6)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-2xl shadow-none" />
                        ))}
                    </div>
                ) : (
                    <Card className="overflow-hidden border border-[#18230F]/10 bg-white rounded-2xl shadow-none">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-[#34C759]/5 border-b border-[#18230F]/10">
                                        <th className="py-2.5 px-4 text-left w-10">
                                            <Checkbox
                                                checked={selectedIds.length === filteredBookings.length && filteredBookings.length > 0}
                                                onCheckedChange={toggleSelectAll}
                                                className="rounded-md border-slate-300 data-[state=checked]:bg-[#18230F] data-[state=checked]:border-[#18230F] data-[state=checked]:text-white"
                                            />
                                        </th>
                                        <th className="py-2.5 px-4 text-left">
                                            <div
                                                className="flex items-center gap-1 text-[11px] uppercase tracking-wider font-bold text-[#18230F]/60 cursor-pointer hover:text-[#18230F] transition-colors"
                                                onClick={() => handleSort('client_name')}
                                            >
                                                Client
                                                <ChevronDown className={cn("h-3 w-3 transition-transform", sortConfig?.key === 'client_name' && sortConfig?.direction === 'desc' && "rotate-180")} />
                                            </div>
                                        </th>
                                        <th className="py-2.5 px-4 text-left">
                                            <div
                                                className="flex items-center gap-1 text-[11px] uppercase tracking-wider font-bold text-[#18230F]/60 cursor-pointer hover:text-[#18230F] transition-colors"
                                                onClick={() => handleSort('houseboat_id')}
                                            >
                                                Houseboat
                                                <ChevronDown className={cn("h-3 w-3 transition-transform", sortConfig?.key === 'houseboat_id' && sortConfig?.direction === 'desc' && "rotate-180")} />
                                            </div>
                                        </th>
                                        <th className="py-2.5 px-4 text-center">
                                            <div
                                                className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider font-bold text-[#18230F]/60 cursor-pointer hover:text-[#18230F] transition-colors"
                                                onClick={() => handleSort('source')}
                                            >
                                                Source
                                                <ChevronDown className={cn("h-3 w-3 transition-transform", sortConfig?.key === 'source' && sortConfig?.direction === 'desc' && "rotate-180")} />
                                            </div>
                                        </th>
                                        <th className="py-2.5 px-4 text-center">
                                            <div
                                                className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider font-bold text-[#18230F]/60 cursor-pointer hover:text-[#18230F] transition-colors"
                                                onClick={() => handleSort('start_time')}
                                            >
                                                Dates
                                                <ChevronDown className={cn("h-3 w-3 transition-transform", sortConfig?.key === 'start_time' && sortConfig?.direction === 'desc' && "rotate-180")} />
                                            </div>
                                        </th>
                                        <th className="py-2.5 px-4 text-center">
                                            <div
                                                className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider font-bold text-[#18230F]/60 cursor-pointer hover:text-[#18230F] transition-colors"
                                                onClick={() => handleSort('status')}
                                            >
                                                Status
                                                <ChevronDown className={cn("h-3 w-3 transition-transform", sortConfig?.key === 'status' && sortConfig?.direction === 'desc' && "rotate-180")} />
                                            </div>
                                        </th>
                                        <th className="py-2.5 px-4 text-center">
                                            <div
                                                className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider font-bold text-[#18230F]/60 cursor-pointer hover:text-[#18230F] transition-colors"
                                                onClick={() => handleSort('price')}
                                            >
                                                Total
                                                <ChevronDown className={cn("h-3 w-3 transition-transform", sortConfig?.key === 'price' && sortConfig?.direction === 'desc' && "rotate-180")} />
                                            </div>
                                        </th>
                                        <th className="py-2.5 px-4 text-center text-[11px] uppercase tracking-wider font-bold text-[#18230F]/60">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#18230F]/5">
                                    {filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((booking) => {
                                        const isSelected = selectedIds.includes(booking.id);
                                        return (
                                            <tr
                                                key={booking.id}
                                                className={cn(
                                                    "border-b border-[#18230F]/5 transition-colors",
                                                    isSelected ? "bg-[#34C759]/5" : "hover:bg-[#34C759]/5"
                                                )}
                                            >
                                                <td className="py-2.5 px-4">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSelect(booking.id)}
                                                        className="rounded-md border-slate-300 data-[state=checked]:bg-[#18230F] data-[state=checked]:border-[#18230F] data-[state=checked]:text-white"
                                                    />
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-xl bg-[#34C759]/10 flex items-center justify-center text-[#18230F] font-bold text-xs shrink-0">
                                                            {booking.client_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-[#18230F] text-sm truncate">{booking.client_name}</p>
                                                            <p className="text-xs text-[#18230F]/60 truncate tracking-tight">{booking.client_email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-[#34C759]/10 p-1.5 rounded-lg text-[#18230F]">
                                                            <Ship className="h-4 w-4 text-[#34C759]" />
                                                        </div>
                                                        <span className="text-sm font-semibold text-[#18230F] truncate max-w-[140px]">
                                                            {getBoatName(booking.houseboat_id)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="bg-[#34C759]/10 p-1.5 rounded-lg text-[#18230F]">
                                                            <Globe className="h-4 w-4 text-[#34C759]" />
                                                        </div>
                                                        <span className="text-sm font-medium text-[#18230F] capitalize">{booking.source || 'Direct'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    {booking.start_time && (
                                                        <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-[#18230F]">
                                                            {format(parseISO(booking.start_time), 'MMM dd')}
                                                            <ArrowRight className="h-3 w-3 text-[#18230F]/40" />
                                                            {booking.end_time && format(parseISO(booking.end_time), 'MMM dd')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-4 text-center">
                                                    <Badge className={cn('text-xs font-bold px-3 py-1 rounded-full border-none shadow-none', statusColors[booking.status] || 'bg-gray-100 text-gray-600')}>
                                                        {booking.status}
                                                    </Badge>
                                                </td>
                                                <td className="py-2.5 px-4 text-center">
                                                    <p className="font-bold text-[#18230F] text-sm">€{(booking.price || 0).toLocaleString()}</p>
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-full hover:bg-white text-[#18230F] hover:text-[#34C759] transition-all opacity-40 hover:opacity-100"
                                                                >
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="rounded-2xl border-[#18230F]/10 shadow-2xl bg-white p-2">
                                                                <DropdownMenuItem onClick={() => handleExportPDF(booking, 'checkin')} className="rounded-xl hover:bg-[#34C759]/10 flex items-center gap-3 py-2.5 px-4 cursor-pointer">
                                                                    <FileText className="h-4 w-4 text-[#34C759]" />
                                                                    <span className="font-bold text-[#18230F]">Check-in PDF</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleExportPDF(booking, 'fuel')} className="rounded-xl hover:bg-[#34C759]/10 flex items-center gap-3 py-2.5 px-4 cursor-pointer border-t border-[#18230F]/5">
                                                                    <Fuel className="h-4 w-4 text-orange-500" />
                                                                    <span className="font-bold text-[#18230F]">Fuel PDF</span>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full hover:bg-white text-[#18230F] hover:text-[#34C759] transition-all opacity-40 hover:opacity-100"
                                                            onClick={() => handleEditClick(booking)}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full hover:bg-red-50 text-[#18230F] hover:text-red-600 transition-all opacity-40 hover:opacity-100"
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
                                        );
                                    })}
                                    {filteredBookings.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-20 text-center bg-white rounded-b-3xl">
                                                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-4">
                                                    <Search className="h-8 w-8 text-[#18230F]/10" />
                                                </div>
                                                <h3 className="text-lg font-black text-[#18230F] mb-1 leading-none tracking-tight">No reservations found</h3>
                                                <p className="text-sm text-[#18230F] font-bold">Try adjusting your filters or search keywords.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="flex items-center justify-between px-4 py-4 border-t border-[#18230F]/10 bg-slate-50/50">
                            <div className="flex items-center gap-2 text-sm text-[#18230F]/60">
                                <span>Rows per page</span>
                                <Select
                                    value={itemsPerPage.toString()}
                                    onValueChange={(v) => {
                                        setItemsPerPage(Number(v));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[70px] bg-white border border-[#18230F]/10">
                                        <SelectValue placeholder={itemsPerPage} />
                                    </SelectTrigger>
                                    <SelectContent side="top">
                                        {[10, 20, 30, 50, 100].map(size => (
                                            <SelectItem key={size} value={size.toString()}>
                                                {size}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-4 text-sm font-medium text-[#18230F]">
                                <span>
                                    {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length}
                                </span>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        <span className="px-2 text-xs text-[#18230F]/40">
                                            {currentPage} of {Math.ceil(filteredBookings.length / itemsPerPage)} pages
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredBookings.length / itemsPerPage), p + 1))}
                                        disabled={currentPage >= Math.ceil(filteredBookings.length / itemsPerPage)}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                    </Card>
                )
            }

            {/* Edit Reservation Dialog - Responsive Two-Panel Layout */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="w-full max-w-[95vw] lg:max-w-7xl max-h-[95vh] overflow-hidden p-0 gap-0 shadow-none">
                    {selectedBooking && (
                        <div className="flex flex-col h-full max-h-[95vh]">
                            {/* Compact Header */}
                            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 text-white px-4 py-4 lg:px-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Anchor className="h-5 w-5 text-emerald-300" />
                                        </div>
                                        <div className="min-w-0">
                                            <DialogTitle className="text-base lg:text-lg font-semibold text-white truncate">
                                                {selectedBooking.client_name}
                                            </DialogTitle>
                                            <DialogDescription className="text-emerald-200 text-xs lg:text-sm truncate">
                                                {getBoatName(selectedBooking.houseboat_id)}
                                            </DialogDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs text-[#18230F]/40 flex items-center gap-1.5">
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            {formData.start_time && format(parseISO(formData.start_time), 'MMM d')}
                                            {formData.end_time && ` → ${format(parseISO(formData.end_time), 'MMM d')}`}
                                        </div>
                                        <Badge className={cn('text-xs font-semibold px-2 py-1 rounded-full border-none shadow-none', statusColors[selectedBooking.status])}>
                                            {selectedBooking.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content - Responsive Two-Column */}
                            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                                {/* Left Panel - Form (scrollable) */}
                                <div className="flex-1 flex flex-col min-w-0 lg:border-r border-[#18230F]/10">
                                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                                        <div className="border-b bg-[#F1F8F1]/80 px-3 lg:px-4 flex-shrink-0">
                                            <TabsList className="h-10 bg-transparent p-0 gap-0 w-full justify-start overflow-x-auto">
                                                <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 lg:px-4 text-xs lg:text-sm gap-1.5 flex-shrink-0 text-[#18230F]">
                                                    <User className="h-3.5 w-3.5" />
                                                    Details
                                                </TabsTrigger>
                                                <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 lg:px-4 text-xs lg:text-sm gap-1.5 flex-shrink-0 text-[#18230F]">
                                                    <CreditCard className="h-3.5 w-3.5" />
                                                    Payments
                                                </TabsTrigger>
                                                <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 lg:px-4 text-xs lg:text-sm gap-1.5 flex-shrink-0 text-[#18230F]">
                                                    <History className="h-3.5 w-3.5" />
                                                    History
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4 lg:p-5">
                                            {/* Details Tab */}
                                            <TabsContent value="details" className="mt-0 space-y-4 lg:space-y-5">
                                                {/* Status */}
                                                <div className="flex flex-wrap items-center gap-3 p-3 bg-emerald-50/60 rounded-lg border border-emerald-100">
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
                                                    <h3 className="text-xs font-bold text-[#18230F] mb-3 flex items-center gap-2">
                                                        <User className="h-3.5 w-3.5 text-emerald-500" />
                                                        Client Information
                                                    </h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-[#18230F]">Name</Label>
                                                            <Input value={formData.client_name || ''} onChange={e => setFormData({ ...formData, client_name: e.target.value })} className="h-8 lg:h-9 bg-white text-sm text-[#18230F]" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-[#18230F]">Email</Label>
                                                            <Input type="email" value={formData.client_email || ''} onChange={e => setFormData({ ...formData, client_email: e.target.value })} className="h-8 lg:h-9 bg-white text-sm text-[#18230F]" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-[#18230F]">Phone</Label>
                                                            <Input value={formData.client_phone || ''} onChange={e => setFormData({ ...formData, client_phone: e.target.value })} className="h-8 lg:h-9 bg-white text-sm text-[#18230F]" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-[#18230F]">Source</Label>
                                                            <Input value={selectedBooking.source || 'Website'} disabled className="h-8 lg:h-9 bg-[#F1F8F1] text-sm text-[#18230F]" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Booking Dates - READ ONLY */}
                                                <div>
                                                    <h3 className="text-xs font-bold text-[#18230F] mb-3 flex items-center gap-2">
                                                        <CalendarDays className="h-3.5 w-3.5 text-emerald-500" />
                                                        Booking Dates
                                                        <span className="text-[10px] text-amber-600 font-normal ml-auto bg-amber-50 px-2 py-0.5 rounded">(Change via Houseboat Calendar)</span>
                                                    </h3>
                                                    <div className="w-full h-10 lg:h-11 flex items-center px-3 rounded-lg border border-[#18230F]/10 bg-[#F1F8F1] text-[#18230F]">
                                                        <CalendarDays className="mr-2 h-4 w-4 text-[#18230F]" />
                                                        {formData.start_time && formData.end_time ? (
                                                            <span className="text-sm">
                                                                {format(parseISO(formData.start_time), 'EEE, MMM d')} → {format(parseISO(formData.end_time), 'EEE, MMM d, yyyy')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[#18230F] text-sm">No dates set</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Extras Selection */}
                                                <div>
                                                    <h3 className="text-xs font-bold text-[#18230F] mb-3 flex items-center gap-2">
                                                        <Plus className="h-3.5 w-3.5 text-emerald-500" />
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
                                                                        ? "bg-blue-50 border-blue-300"
                                                                        : "bg-white border-[#18230F]/10 hover:border-slate-300"
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
                                                    <Label className="text-xs text-[#18230F]">Admin Notes</Label>
                                                    <Textarea placeholder="Internal notes..." value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="min-h-[50px] lg:min-h-[60px] bg-white resize-none text-sm text-[#18230F]" />
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
                                                    <div className="bg-[#F1F8F1] px-3 py-2 border-b grid grid-cols-4 text-[10px] lg:text-xs font-medium text-[#18230F]">
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
                                                    <div className="flex gap-2 p-2 lg:p-3 bg-[#F1F8F1] rounded-lg border border-[#18230F]/10">
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
                                                    <div className="flex gap-2 p-2 lg:p-3 bg-[#F1F8F1] rounded-lg border border-[#18230F]/10">
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
                                            <span className="text-lg lg:text-xl font-bold text-[#34C759]">€{pricingBreakdown.total.toFixed(0)}</span>
                                        )}
                                    </div>

                                    {/* Scrollable Pricing Content */}
                                    <div className="flex-1 overflow-y-auto p-3 lg:p-4">
                                        {pricingBreakdown ? (
                                            <div className="space-y-3">
                                                {/* 2-Column Price Grid */}
                                                <div className="bg-white rounded-lg border border-[#18230F]/10 overflow-hidden">
                                                    {/* Weekday */}
                                                    {pricingBreakdown.weekdayNights > 0 && (
                                                        <div className="grid grid-cols-2 gap-2 px-3 py-2 border-b border-[#18230F]/10 last:border-b-0">
                                                            <span className="text-xs text-[#18230F]">{pricingBreakdown.weekdayNights} × €{pricingBreakdown.weekdayPrice} weekday</span>
                                                            <span className="text-xs text-right font-medium text-[#18230F]">€{pricingBreakdown.weekdayNights * pricingBreakdown.weekdayPrice}</span>
                                                        </div>
                                                    )}
                                                    {/* Weekend */}
                                                    {pricingBreakdown.weekendNights > 0 && (
                                                        <div className="grid grid-cols-2 gap-2 px-3 py-2 border-b border-[#18230F]/10 last:border-b-0">
                                                            <span className="text-xs text-[#18230F]">{pricingBreakdown.weekendNights} × €{pricingBreakdown.weekendPrice} weekend</span>
                                                            <span className="text-xs text-right font-medium text-[#18230F]">€{pricingBreakdown.weekendNights * pricingBreakdown.weekendPrice}</span>
                                                        </div>
                                                    )}
                                                    {/* Prep & Taxes */}
                                                    <div className="grid grid-cols-2 gap-2 px-3 py-2 border-b border-[#18230F]/10 last:border-b-0">
                                                        <span className="text-xs text-[#18230F]">Prep & Taxes</span>
                                                        <span className="text-xs text-right font-medium text-[#18230F]">€{pricingBreakdown.preparationFee}</span>
                                                    </div>
                                                    {/* Extras */}
                                                    {pricingBreakdown.extrasTotal > 0 && (formData.extras || []).map(extraId => {
                                                        const extra = extras.find(e => e.id === extraId);
                                                        if (!extra) return null;
                                                        const nights = pricingBreakdown.weekdayNights + pricingBreakdown.weekendNights;
                                                        const extraPrice = extra.price_type === 'per_day' ? extra.price * nights : extra.price;
                                                        return (
                                                            <div key={extraId} className="grid grid-cols-2 gap-2 px-3 py-2 border-b border-[#18230F]/10 last:border-b-0">
                                                                <span className="text-xs text-emerald-600 truncate">{extra.name}</span>
                                                                <span className="text-xs text-right font-medium text-emerald-600">+€{extraPrice}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    {/* Rental Total */}
                                                    <div className="grid grid-cols-2 gap-2 px-3 py-2 bg-[#F1F8F1]">
                                                        <span className="text-xs font-semibold">Rental Total</span>
                                                        <span className="text-xs text-right font-bold">€{pricingBreakdown.rentalTotal}</span>
                                                    </div>
                                                </div>

                                                {/* Discount */}
                                                <div className="bg-white rounded-lg border border-[#18230F]/10 p-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-[#18230F]">Discount</span>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={formData.discount || 0}
                                                            onChange={e => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                                                            className="h-7 w-16 text-center text-xs text-[#18230F]"
                                                        />
                                                        <span className="text-xs text-[#18230F]">%</span>
                                                        {pricingBreakdown.discountAmount > 0 && (
                                                            <span className="text-xs text-emerald-600 ml-auto font-medium">-€{pricingBreakdown.discountAmount.toFixed(0)}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Total Card */}
                                                <div className="bg-[#18230F] rounded-lg p-3 lg:p-4 text-white">
                                                    <div className="grid grid-cols-2 gap-2 items-center">
                                                        <span className="font-semibold text-sm">Total Amount</span>
                                                        <span className="text-xl lg:text-2xl font-bold text-right text-[#34C759]">€{pricingBreakdown.total.toFixed(0)}</span>
                                                    </div>
                                                </div>

                                                {/* Amount Paid */}
                                                <div className="bg-white rounded-lg border border-[#18230F]/10 p-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-medium text-[#18230F]">Amount Paid</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-sm text-[#18230F]/60">€</span>
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
                                                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg p-3 lg:p-4 text-[#18230F]">
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
                                                <div className="pt-2 border-t border-dashed border-[#18230F]/10">
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs text-[#18230F] flex-shrink-0">Override Price</Label>
                                                        <Input
                                                            type="number"
                                                            value={formData.price || 0}
                                                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                                            className="h-8 font-semibold text-sm text-[#18230F]"
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
                                <Button onClick={handleSaveChanges} disabled={isProcessing} className="bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-bold gap-2 h-9 text-sm">
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
                <AlertDialogContent className="rounded-3xl border border-[#18230F]/10 shadow-2xl bg-white p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black text-[#18230F]">Delete Reservation?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#18230F]/60 font-bold text-base mt-2">
                            This will permanently delete the booking for <span className="text-[#18230F] font-black">{selectedBooking?.client_name}</span>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 pt-6 border-t border-[#18230F]/5 mt-4">
                        <AlertDialogCancel disabled={isProcessing} className="rounded-xl border-[#18230F]/10 h-12 px-6 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isProcessing} className="bg-red-600 hover:bg-red-700 rounded-xl text-white font-black text-base px-8 h-12">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Dialog */}
            <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <AlertDialogContent className="rounded-3xl border border-[#18230F]/10 shadow-2xl bg-white p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black text-[#18230F]">Delete {selectedIds.length} Reservations?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#18230F]/60 font-bold text-base mt-2">
                            You are about to delete <span className="text-[#18230F] font-black">{selectedIds.length}</span> selected reservations permanently. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 pt-6 border-t border-[#18230F]/5 mt-4">
                        <AlertDialogCancel disabled={isProcessing} className="rounded-xl border-[#18230F]/10 h-12 px-6 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} disabled={isProcessing} className="bg-red-600 hover:bg-red-700 rounded-xl text-white font-black text-base px-8 h-12">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Permanently All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Status Dialog */}
            <Dialog open={isBulkStatusDialogOpen} onOpenChange={setIsBulkStatusDialogOpen}>
                <DialogContent className="rounded-3xl border border-[#18230F]/10 shadow-2xl max-w-sm p-8 bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-[#18230F]">Update Status</DialogTitle>
                        <DialogDescription className="text-[#18230F]/60 font-bold text-base mt-2">
                            Apply new status to {selectedIds.length} selected reservations.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        <Select value={bulkStatus} onValueChange={setBulkStatus}>
                            <SelectTrigger className="h-14 rounded-xl bg-[#F1F8F1] border border-[#18230F]/10 font-bold text-[#18230F] text-base">
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border border-[#18230F]/10 shadow-xl font-bold text-sm bg-white">
                                {STATUS_OPTIONS.map(s => (
                                    <SelectItem key={s} value={s} className="py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-3 w-3 rounded-full", statusColors[s]?.split(' ')[0] || 'bg-slate-300')} />
                                            {s}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="mt-4 pt-4 border-t border-[#18230F]/5">
                        <Button variant="ghost" onClick={() => setIsBulkStatusDialogOpen(false)} className="rounded-xl font-bold h-12">Cancel</Button>
                        <Button onClick={handleBulkStatusUpdate} disabled={isProcessing} className="bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-black text-base px-8 h-12 rounded-xl">
                            Update Reservations
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
