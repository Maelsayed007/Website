'use client';

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSupabase } from '@/components/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
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
import { DateRange } from 'react-day-picker';
import { CreditCard, User, CalendarDays, DollarSign, Plus, Mail, Clock, History, Check, Anchor, X, Fuel, ArrowRight, Send, Calculator } from 'lucide-react';
import { Booking as PDFBooking, Boat as PDFBoat, WebsiteSettings } from '@/lib/types';
import { differenceInCalendarDays, eachDayOfInterval, isFriday, isSaturday } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { parsePaginationQuery } from '@/lib/pagination/query';
import { Pagination } from '@/components/ui/pagination';
import { DashboardPageHeader, DashboardStatCard } from '@/components/dashboard';
import {
    type Boat,
    type Booking,
    type Extra,
    type Price,
    type PricingBreakdown,
    type ReservationSortConfig,
    type Transaction,
    STATUS_OPTIONS,
    statusColors,
} from '@/features/dashboard/reservations/types';
import { fetchReservationStats, fetchReservationsPage } from '@/features/dashboard/reservations/query';

function ReservationsContent() {
    const router = useRouter();
    const pathname = usePathname();
    const { supabase } = useSupabase();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get('search') || '';
    const paginationQuery = useMemo(
        () =>
            parsePaginationQuery(Object.fromEntries(searchParams.entries()), {
                defaultPage: 1,
                defaultPageSize: 20,
                maxPageSize: 100,
                allowedPageSizes: [10, 20, 30, 50, 100],
            }),
        [searchParams]
    );

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [boatFilter, setBoatFilter] = useState<string>('all');
    const [serviceFilter, setServiceFilter] = useState<string>('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [currentPage, setCurrentPage] = useState(paginationQuery.page);
    const [itemsPerPage, setItemsPerPage] = useState(paginationQuery.pageSize);
    const [totalItems, setTotalItems] = useState(0);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
    });

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [extras, setExtras] = useState<Extra[]>([]);
    const [boats, setBoats] = useState<Boat[]>([]);
    const [prices, setPrices] = useState<Price[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [formData, setFormData] = useState<Partial<Booking>>({});
    const [activeTab] = useState('all'); // Change 'details' to 'all' or 'ar'
    const [isPaymentHubOpen, setIsPaymentHubOpen] = useState(false);
    const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
    const [paymentRecipientEmail, setPaymentRecipientEmail] = useState<string>('');
    const [isSendingLink, setIsSendingLink] = useState(false);
    const [paymentTransactions, setPaymentTransactions] = useState<Transaction[]>([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<ReservationSortConfig>(null);
    const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [bulkStatus, setBulkStatus] = useState('Confirmed');
    const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);
    const [modalActiveTab, setModalActiveTab] = useState('details');


    // Fetch transactions for the current booking (Informative View or Payment Hub)
    useEffect(() => {
        const fetchTransactions = async () => {
            const targetBooking = isPaymentHubOpen ? paymentBooking : (isEditDialogOpen ? selectedBooking : null);
            if (!targetBooking) return;

            setIsLoadingTransactions(true);
            try {
                // Fetch from all possible payment tables to ensure absolute history coverage
                const [transactionsRes, paymentsRes, restaurantRes] = await Promise.all([
                    supabase
                        .from('payment_transactions')
                        .select('*')
                        .eq('booking_id', targetBooking.id),
                    supabase
                        .from('payments')
                        .select('*')
                        .eq('booking_id', targetBooking.id)
                        .eq('status', 'succeeded'),
                    supabase
                        .from('restaurant_payments')
                        .select('*')
                        .eq('booking_id', targetBooking.id)
                ]);

                const manualTransactions = (transactionsRes.data || []).map(tx => ({
                    ...tx,
                    display_method: tx.method,
                    source_table: 'payment_transactions',
                    billing_name: tx.billing_name,
                    billing_nif: tx.billing_nif,
                    billing_address: tx.billing_address,
                    needs_invoice: tx.needs_invoice
                }));

                const stripePayments = (paymentsRes.data || []).map(p => ({
                    id: p.id,
                    booking_id: p.booking_id,
                    amount: p.amount,
                    method: 'Stripe',
                    display_method: 'Stripe',
                    status: 'completed',
                    reference: p.reference || p.stripe_payment_intent_id,
                    created_at: p.created_at,
                    type: 'payment',
                    source_table: 'payments'
                }));

                const linkPayments = (restaurantRes.data || []).map(p => ({
                    id: p.id,
                    booking_id: p.booking_id,
                    amount: p.amount,
                    method: p.method === 'stripe' ? 'Stripe' : (p.method === 'online' ? 'Digital Link' : p.method),
                    display_method: p.method === 'online' ? 'Digital Link' : p.method.charAt(0).toUpperCase() + p.method.slice(1),
                    status: 'completed',
                    reference: p.reference || 'Legacy Record',
                    created_at: p.created_at,
                    type: 'payment',
                    source_table: 'restaurant_payments'
                }));

                const combined = [...manualTransactions, ...stripePayments, ...linkPayments];
                const unique = combined.reduce((acc: Transaction[], curr) => {
                    const isDuplicate = acc.some(tx =>
                        (tx.reference && curr.reference && tx.reference === curr.reference) ||
                        (tx.id === curr.id)
                    );
                    if (!isDuplicate) acc.push(curr);
                    return acc;
                }, []);

                unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                // FALLBACK: If no transactions found but booking has amount_paid > 0, create a legacy entry
                if (unique.length === 0 && targetBooking.amount_paid && targetBooking.amount_paid > 0) {
                    unique.push({
                        id: `legacy-${targetBooking.id}`,
                        booking_id: targetBooking.id,
                        amount: targetBooking.amount_paid,
                        method: 'Legacy',
                        display_method: 'Legacy Payment',
                        status: 'completed',
                        reference: 'Recorded before transaction logging',
                        created_at: targetBooking.updated_at || targetBooking.created_at,
                        type: 'payment',
                        source_table: 'booking_fallback'
                    });
                }

                setPaymentTransactions(unique);
            } catch (error: any) {
                console.error('[PaymentHub] Error fetching transactions:', error);
            } finally {
                setIsLoadingTransactions(false);
            }
        };

        fetchTransactions();
    }, [paymentBooking, isPaymentHubOpen, isEditDialogOpen, selectedBooking, supabase]);
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

    // Handle Tab Changes
    useEffect(() => {
        if (activeTab === 'ar') {
            setSortConfig({ key: 'price', direction: 'desc' }); // Sort by price/due initially
        } else {
            setSortConfig(null); // Clear sort when not in AR tab, or set a default for 'all'
        }
    }, [activeTab]);

    // Get boat name for display
    const getBoatName = (houseboatId?: string) => {
        if (!houseboatId) return 'Unknown';
        const boat = boats.find(b => b.id === houseboatId);
        return boat?.name || 'Unknown Boat';
    };

    const handleEditClick = (booking: Booking) => {
        setSelectedBooking(booking);
        setFormData({ ...booking });
        setModalActiveTab('details');
        setIsEditDialogOpen(true);
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

    const fetchStats = useCallback(async () => {
        if (!supabase) return;
        try {
            const nextStats = await fetchReservationStats(supabase);
            setStats(nextStats);
        } catch {
            // Keep existing stats when lightweight counts fail.
        }
    }, [supabase]);

    const fetchBookings = useCallback(async () => {
        if (!supabase) return;

        setIsLoading(true);
        try {
            const { data, totalItems: nextTotalItems } = await fetchReservationsPage(supabase, {
                page: currentPage,
                pageSize: itemsPerPage,
                search: debouncedSearchQuery,
                status: statusFilter,
                boat: boatFilter,
                service: serviceFilter,
                paymentStatus: paymentStatusFilter,
                dateRange,
                sortConfig,
                activeTab: activeTab as 'all' | 'ar',
            });
            setBookings(data);
            setTotalItems(nextTotalItems);
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch reservations.' });
        } finally {
            setIsLoading(false);
        }
    }, [
        supabase,
        currentPage,
        itemsPerPage,
        debouncedSearchQuery,
        statusFilter,
        boatFilter,
        serviceFilter,
        paymentStatusFilter,
        dateRange,
        sortConfig,
        activeTab,
        toast,
    ]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    useEffect(() => {
        if (currentPage !== paginationQuery.page) {
            setCurrentPage(paginationQuery.page);
        }
        if (itemsPerPage !== paginationQuery.pageSize) {
            setItemsPerPage(paginationQuery.pageSize);
        }
    }, [currentPage, itemsPerPage, paginationQuery.page, paginationQuery.pageSize]);

    useEffect(() => {
        if (
            currentPage === paginationQuery.page &&
            itemsPerPage === paginationQuery.pageSize
        ) {
            return;
        }

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set('page', String(currentPage));
        nextParams.set('pageSize', String(itemsPerPage));
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    }, [
        currentPage,
        itemsPerPage,
        paginationQuery.page,
        paginationQuery.pageSize,
        pathname,
        router,
        searchParams,
    ]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, boatFilter, serviceFilter, paymentStatusFilter, dateRange]);



    const getBookingIcons = (b: Booking) => {
        const icons = [];
        if (b.houseboat_id) icons.push(<Ship key="stay" className="h-4 w-4 text-primary" />);
        if (b.daily_travel_id || b.daily_travel_package_id) icons.push(<Calendar key="cruise" className="h-4 w-4 text-foreground" />);
        if (b.restaurant_table_id) icons.push(<Utensils key="meal" className="h-4 w-4 text-foreground" />);

        // Fallback
        if (icons.length === 0) icons.push(<Calendar key="default" className="h-4 w-4" />);

        return icons;
    };

    const getBookingTypesLabel = (b: Booking) => {
        const types = [];
        if (b.houseboat_id) types.push('Stay');
        if (b.daily_travel_id || b.daily_travel_package_id) types.push('Cruise');
        if (b.restaurant_table_id) types.push('Meal');
        return types.join(' + ') || 'Other';
    };

    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const paginatedBookings = bookings;

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);



    const handleBulkDelete = async () => {
        if (!supabase || selectedIds.length === 0) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('bookings').delete().in('id', selectedIds);
            if (error) throw error;
            toast({ title: 'Success', description: `${selectedIds.length} reservations deleted.` });
            setBookings(prev => prev.filter(b => !selectedIds.includes(b.id)));
            setTotalItems(prev => Math.max(0, prev - selectedIds.length));
            fetchStats();
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
            fetchStats();
            setSelectedIds([]);
            setIsBulkStatusDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === paginatedBookings.length && paginatedBookings.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(paginatedBookings.map(b => b.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSort = (key: keyof Booking | 'type') => {
        if (key === 'type') return;
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (key: keyof Booking | 'type') => {
        if (sortConfig?.key === key) {
            return sortConfig.direction === 'asc' ? <ChevronDown className="h-3 w-3 rotate-180" /> : <ChevronDown className="h-3 w-3" />;
        }
        return null;
    };

    const handleDelete = async () => {
        if (!selectedBooking || !supabase) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('bookings').delete().eq('id', selectedBooking.id);
            if (error) throw error;
            toast({ title: 'Success', description: 'Reservation deleted.' });
            setBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
            fetchStats();
            setIsDeleteDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const exportToCSV = () => {
        const headers = ['Client Name', 'Email', 'Phone', 'Source', 'Status', 'Check-in', 'Check-out', 'Price'];
        const rows = paginatedBookings.map(b => [
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
        booking_type: b.houseboat_id ? 'overnight' : 'day_charter',
        initialPaymentAmount: b.initial_payment_amount,
        houseboatId: b.houseboat_id,
        restaurantTableId: b.restaurant_table_id,
        riverCruisePackageId: b.daily_travel_package_id,
        notes: b.notes,
    });

    const handleRegisterPayment = async () => {
        if (!paymentBooking || !supabase || !paymentAmount) return;
        setIsProcessing(true);
        try {
            const amount = parseFloat(paymentAmount);
            if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');

            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking_id: paymentBooking.id,
                    amount: amount,
                    method: paymentMethod.toLowerCase(),
                    notes: `Manual entry: ${paymentMethod}`
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to register payment');

            toast({ title: 'Payment Registered', description: `EUR ${amount} logged via ${paymentMethod}` });

            // Refresh local state by refetching bookings to get updated totals and status
            fetchBookings();
            fetchStats();
            setIsPaymentHubOpen(false);
            setPaymentAmount('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSendPaymentLink = async () => {
        if (!paymentBooking) return;
        setIsSendingLink(true);
        try {
            const response = await fetch('/api/payments/link/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: paymentBooking.id,
                    amount: parseFloat(paymentAmount),
                    email: paymentRecipientEmail || paymentBooking.client_email,
                    description: `Payment for Booking #${paymentBooking.id.slice(0, 8)}`
                })
            });

            if (!response.ok) throw new Error('Failed to generate link');
            toast({ title: 'Request Sent', description: `Payment link emailed to ${paymentRecipientEmail || paymentBooking.client_email}` });
            setIsPaymentHubOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSendingLink(false);
        }
    };

    const handleExportPDF = async (booking: Booking, type: 'checkin' | 'fuel') => {
        const { generateCheckinManifest, generateFuelManifest } = await import('@/lib/pdf-designs');

        // Fallback settings if fetch failed
        const settings: WebsiteSettings = websiteSettings || {
            company_name: 'Amieira Marina',
            logoUrl: '',
            email: 'info@amieiramarina.com',
            phone: '+351 266 611 101',
            address: 'Amieira Marina, 7220-134 Portel, Portugal',
            social_links: {},
            pdf_terms: '',
            pdf_details: ''
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
            <DashboardPageHeader
                title="Reservations Hub"
                description="Centralized operations for all bookings with one queue, one filter bar, and one execution table."
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                fetchBookings();
                                fetchStats();
                            }}
                            className="h-9 rounded-full px-4"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <DashboardStatCard label="Total Bookings" value={stats.total} icon={Calendar} />
                <DashboardStatCard label="Pending Requests" value={stats.pending} icon={Clock} tone="warning" />
                <DashboardStatCard label="Confirmed" value={stats.confirmed} icon={Check} tone="success" />
                <DashboardStatCard label="Completed" value={stats.completed} icon={History} />
            </div>


            {/* Bulk Action Bar */}
            {
                selectedIds.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
                        <div className="bg-card text-foreground px-5 py-3 rounded-2xl flex items-center gap-5 border border-border shadow-none">
                            <div className="flex items-center gap-2 border-r border-border pr-5">
                                <div className="bg-primary/15 text-primary w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">
                                    {selectedIds.length}
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">Selected</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-foreground hover:bg-muted gap-2 h-9 px-3 rounded-xl transition-all"
                                    onClick={() => setIsBulkStatusDialogOpen(true)}
                                >
                                    <Check className="h-4 w-4 text-primary" />
                                    Status
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground hover:text-foreground hover:bg-muted gap-2 h-9 px-3 rounded-xl transition-all"
                                        >
                                            <Download className="h-4 w-4 text-primary" />
                                            Print
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl border-border shadow-none bg-popover text-popover-foreground p-2">
                                        <DropdownMenuItem onClick={() => handleBulkExportPDF('checkin')} className="rounded-xl hover:bg-muted flex items-center gap-3 py-2.5 px-4 cursor-pointer">
                                            <FileText className="h-4 w-4 text-primary" />
                                            <span>Check-in Manifests</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleBulkExportPDF('fuel')} className="rounded-xl hover:bg-muted flex items-center gap-3 py-2.5 px-4 cursor-pointer border-t border-border">
                                            <Fuel className="h-4 w-4 text-orange-400" />
                                            <span>Fuel Usage Forms</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2 h-9 px-3 rounded-xl transition-all"
                                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-foreground h-9 w-9 p-0 rounded-xl"
                                    onClick={() => setSelectedIds([])}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Filters */}
            <div className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-3 md:p-4">
                <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex w-full flex-col items-center gap-3 sm:flex-row lg:w-auto">
                        <div className="relative w-full lg:w-[320px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search client, email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 rounded-full border-border bg-background pl-9 text-sm font-medium text-foreground placeholder:text-muted-foreground shadow-none"
                            />
                        </div>

                        {(statusFilter !== 'All' || boatFilter !== 'all' || serviceFilter !== 'all' || paymentStatusFilter !== 'all' || dateRange || searchQuery) && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setStatusFilter('All');
                                    setBoatFilter('all');
                                    setServiceFilter('all');
                                    setPaymentStatusFilter('all');
                                    setDateRange(undefined);
                                    setSearchQuery('');
                                }}
                                className="h-10 whitespace-nowrap rounded-full px-4 text-sm font-semibold"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Clear All
                            </Button>
                        )}
                    </div>

                    <div className="flex w-full flex-wrap items-center justify-end gap-2 xl:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant="outline"
                                    className={cn(
                                        "h-10 w-[240px] justify-start rounded-full border-border bg-background text-left font-semibold text-foreground shadow-none",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <Calendar className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
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
                                    numberOfMonths={1}
                                />
                            </PopoverContent>
                        </Popover>

                        <Select value={serviceFilter} onValueChange={setServiceFilter}>
                            <SelectTrigger className="h-10 w-[150px] rounded-full border-border bg-background font-semibold shadow-none">
                                <SelectValue placeholder="All Services" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border p-1">
                                <SelectItem value="all" className="rounded-lg">All Services</SelectItem>
                                <SelectItem value="stay" className="rounded-lg">Stay (Houseboat)</SelectItem>
                                <SelectItem value="cruise" className="rounded-lg">Cruise (Daily)</SelectItem>
                                <SelectItem value="meal" className="rounded-lg">Meal (Restaurant)</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                            <SelectTrigger className="h-10 w-[150px] rounded-full border-border bg-background font-semibold shadow-none">
                                <SelectValue placeholder="All Payments" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border p-1">
                                <SelectItem value="all" className="rounded-lg">All Payments</SelectItem>
                                <SelectItem value="paid" className="rounded-lg">Fully Paid</SelectItem>
                                <SelectItem value="partial" className="rounded-lg">Partially Paid</SelectItem>
                                <SelectItem value="unpaid" className="rounded-lg">Unpaid</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 w-[160px] rounded-full border-border bg-background font-semibold shadow-none">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border p-1">
                                <SelectItem value="All" className="rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4" />
                                        All Status
                                    </div>
                                </SelectItem>
                                {STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status} value={status} className="rounded-lg">
                                        <div className="flex items-center gap-2">
                                            {status === 'Pending' && <Clock className="h-4 w-4 text-amber-600" />}
                                            {status === 'Confirmed' && <Check className="h-4 w-4 text-emerald-600" />}
                                            {status === 'Completed' && <Anchor className="h-4 w-4 text-blue-600" />}
                                            {status === 'Cancelled' && <X className="h-4 w-4 text-red-600" />}
                                            {status === 'Maintenance' && <RefreshCw className="h-4 w-4 text-orange-600" />}
                                            {status}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="hidden h-8 w-px bg-border xl:block" />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="h-10 rounded-full px-5 gap-2 font-semibold shadow-none">
                                    <Download className="h-4 w-4 shrink-0" />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-border">
                                <DropdownMenuItem onClick={exportToCSV}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    Export CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBulkExportPDF('checkin')}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Check-in Manifests
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBulkExportPDF('fuel')}>
                                    <Fuel className="mr-2 h-4 w-4" />
                                    Fuel Manifests
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                    <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-none">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-5 text-left w-10">
                                            <Checkbox
                                                checked={selectedIds.length === paginatedBookings.length && paginatedBookings.length > 0}
                                                onCheckedChange={toggleSelectAll}
                                                className="rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
                                            />
                                        </th>
                                        <th className="px-6 py-5 text-left cursor-pointer transition-colors hover:text-foreground" onClick={() => handleSort('id')}>
                                            <div className="flex items-center gap-2">ID {renderSortIcon('id')}</div>
                                        </th>
                                        <th className="px-6 py-5 text-left cursor-pointer transition-colors hover:text-foreground" onClick={() => handleSort('client_name')}>
                                            <div className="flex items-center gap-2">Client {renderSortIcon('client_name')}</div>
                                        </th>
                                        <th className="px-6 py-5 text-left cursor-pointer transition-colors hover:text-foreground" onClick={() => handleSort('houseboat_id')}>
                                            <div className="flex items-center gap-2">Service {renderSortIcon('houseboat_id')}</div>
                                        </th>
                                        <th className="px-6 py-5 text-left cursor-pointer transition-colors hover:text-foreground" onClick={() => handleSort('start_time')}>
                                            <div className="flex items-center gap-2">Dates {renderSortIcon('start_time')}</div>
                                        </th>
                                        <th className="px-6 py-5 text-left cursor-pointer transition-colors hover:text-foreground" onClick={() => handleSort('status')}>
                                            <div className="flex items-center gap-2">Status {renderSortIcon('status')}</div>
                                        </th>
                                        <th className="px-6 py-5 text-left whitespace-nowrap cursor-pointer transition-colors hover:text-foreground" onClick={() => handleSort('price')}>
                                            <div className="flex items-center gap-2">Total {renderSortIcon('price')}</div>
                                        </th>
                                        <th className="px-6 py-5 text-left whitespace-nowrap cursor-pointer transition-colors hover:text-foreground" onClick={() => handleSort('amount_paid')}>
                                            <div className="flex items-center gap-2">Paid {renderSortIcon('amount_paid')}</div>
                                        </th>
                                        <th className="px-6 py-5 text-left whitespace-nowrap">
                                            <div className="flex items-center gap-2">Due</div>
                                        </th>
                                        <th className="px-6 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {paginatedBookings.map((booking) => {
                                        const isSelected = selectedIds.includes(booking.id);
                                        return (
                                            <tr
                                                key={booking.id}
                                                className={cn(
                                                    "border-b border-border/60 transition-colors",
                                                    isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                                                )}
                                            >
                                                <td className="py-2.5 px-4">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSelect(booking.id)}
                                                        className="rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
                                                    />
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    <p className="max-w-[100px] truncate text-sm font-semibold text-foreground">{booking.id.slice(0, 8)}</p>
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-foreground font-semibold text-xs shrink-0">
                                                            {booking.client_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-foreground">{booking.client_name}</p>
                                                            <p className="truncate text-xs tracking-tight text-muted-foreground">{booking.client_email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center -space-x-2">
                                                            {getBookingIcons(booking).map((icon, idx) => (
                                                                <div key={idx} className="rounded-lg border border-border bg-card p-1.5 text-foreground shadow-none">
                                                                    {icon}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">
                                                                {getBookingTypesLabel(booking)}
                                                            </span>
                                                            <span className="max-w-[140px] truncate text-sm font-semibold text-foreground">
                                                                {booking.houseboat_id ? getBoatName(booking.houseboat_id) : (booking.daily_travel_id ? 'Daily Cruise' : 'Restaurant Table')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    {booking.start_time && (
                                                        <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-foreground">
                                                            {format(parseISO(booking.start_time), 'MMM dd')}
                                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                            {booking.end_time && format(parseISO(booking.end_time), 'MMM dd')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-4 text-center">
                                                    <Badge className={cn('text-xs font-bold px-3 py-1 rounded-full border-none shadow-none', statusColors[booking.status] || 'bg-gray-100 text-gray-600')}>
                                                        {booking.status}
                                                    </Badge>
                                                </td>
                                                {/* Total Column */}
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-semibold text-foreground tracking-tight">
                                                        EUR {(booking.price || 0).toLocaleString()}
                                                    </span>
                                                </td>

                                                {/* Paid Column */}
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-semibold text-emerald-600 tracking-tight">
                                                        EUR {(booking.amount_paid || 0).toLocaleString()}
                                                    </span>
                                                </td>

                                                {/* Due Column */}
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-semibold tracking-tight text-red-600">
                                                        EUR {((booking.price || 0) - (booking.amount_paid || 0)).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full text-muted-foreground opacity-70 transition-all hover:bg-muted hover:text-foreground hover:opacity-100"
                                                            onClick={() => handleEditClick(booking)}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-full text-muted-foreground opacity-70 transition-all hover:bg-muted hover:text-foreground hover:opacity-100"
                                                                >
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="rounded-2xl border-border bg-popover p-2 shadow-none">
                                                                <DropdownMenuItem onClick={() => handleExportPDF(booking, 'checkin')} className="rounded-xl flex items-center gap-3 py-2.5 px-4 cursor-pointer hover:bg-muted">
                                                                    <FileText className="h-4 w-4 text-primary" />
                                                                    <span className="font-semibold text-foreground">Check-in PDF</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleExportPDF(booking, 'fuel')} className="rounded-xl flex items-center gap-3 py-2.5 px-4 cursor-pointer border-t border-border hover:bg-muted">
                                                                    <Fuel className="h-4 w-4 text-orange-500" />
                                                                    <span className="font-semibold text-foreground">Fuel PDF</span>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full text-muted-foreground opacity-70 transition-all hover:bg-muted hover:text-foreground hover:opacity-100"
                                                            onClick={() => {
                                                                setPaymentBooking(booking);
                                                                setPaymentAmount(((booking.price || 0) - (booking.amount_paid || 0)).toString());
                                                                setPaymentRecipientEmail(booking.client_email || '');
                                                                setIsPaymentHubOpen(true);
                                                            }}
                                                        >
                                                            <CreditCard className="h-3.5 w-3.5" />
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full text-muted-foreground opacity-70 transition-all hover:bg-muted hover:text-foreground hover:opacity-100"
                                                            onClick={() => handleEditClick(booking)}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full text-muted-foreground opacity-70 transition-all hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
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
                                    {paginatedBookings.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="py-20 text-center">
                                                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                                                    <Search className="h-8 w-8 text-muted-foreground/40" />
                                                </div>
                                                <h3 className="mb-1 text-lg font-semibold leading-none tracking-tight text-foreground">No reservations found</h3>
                                                <p className="text-sm text-muted-foreground">Try adjusting your filters or search keywords.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="border-t border-border bg-muted/40 px-4 py-4">
                            <Pagination
                                totalItems={totalItems}
                                currentPage={currentPage}
                                pageSize={itemsPerPage}
                                pageSizes={[10, 20, 30, 50, 100]}
                                className="border-border bg-card"
                            />
                        </div>

                    </Card>
                )
            }

            {/* Edit Reservation Dialog - Responsive Two-Panel Layout */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="w-full max-w-[95vw] lg:max-w-6xl max-h-[92vh] overflow-hidden p-0 gap-0 rounded-xl border border-border bg-card shadow-none">
                    {selectedBooking && (
                        <div className="flex h-full max-h-[92vh] flex-col bg-card">
                            {/* Static Header */}
                            <div className="shrink-0 border-b border-border bg-card px-6 pr-14 py-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                            {getBookingIcons(selectedBooking!)[0]}
                                        </div>
                                        <div className="min-w-0 flex flex-col pt-1">
                                            <div className="flex items-center gap-3">
                                                <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
                                                    {selectedBooking!.client_name}
                                                    <Badge variant="outline" className={cn('text-[10px] h-5 uppercase tracking-wider font-black px-2 rounded-md border-none', statusColors[selectedBooking!.status])}>
                                                        {selectedBooking!.status}
                                                    </Badge>
                                                </DialogTitle>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[14px] font-black text-emerald-600 tracking-[0.2em] uppercase">
                                                    {getBookingTypesLabel(selectedBooking!)}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-black/10" />
                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">ID: {selectedBooking!.id.slice(0, 8).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex flex-col items-end gap-1.5">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                            {formData.start_time && format(parseISO(formData.start_time), 'MMM dd')}
                                            {formData.end_time && ` - ${format(parseISO(formData.end_time), 'MMM dd, yyyy')}`}
                                        </div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            VIA {selectedBooking!.source?.toUpperCase() || 'WEBSITE'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                                {/* Left Side: Informative Panels */}
                                <div className="flex-1 flex flex-col min-w-0">
                                    <Tabs value={modalActiveTab} onValueChange={setModalActiveTab} className="flex-1 flex flex-col">
                                        <div className="shrink-0 border-b border-border bg-card px-6">
                                            <TabsList className="h-12 bg-transparent p-0 gap-8">
                                                {['details', 'payments', 'history'].map((tab) => (
                                                    <TabsTrigger
                                                        key={tab}
                                                        value={tab}
                                                        className="h-12 rounded-none border-b-2 border-transparent px-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                                                    >
                                                        {tab}
                                                    </TabsTrigger>
                                                ))}
                                            </TabsList>
                                        </div>

                                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                                            <TabsContent value="details" className="m-0 p-6 space-y-4">
                                                {/* Section: Client Details - Full Width */}
                                                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <User className="h-3 w-3" />
                                                        Client Details
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Full Name</span>
                                                            <span className="text-sm font-semibold text-foreground">{formData.client_name || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Email Address</span>
                                                            <span className="text-sm font-semibold text-foreground">{formData.client_email || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Phone Number</span>
                                                            <span className="text-sm font-semibold text-foreground">{formData.client_phone || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Section: Resource & Schedule - Side by Side */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Resource Information - Soft Amber */}
                                                    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                            <Anchor className="h-3 w-3" />
                                                            Assigned Resource
                                                        </h3>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Status</span>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <div className={cn('w-2 h-2 rounded-full', (statusColors as any)[formData.status || 'Status']?.split(' ')[0])} />
                                                                    <span className="text-sm font-semibold text-foreground">{formData.status}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Resource Name</span>
                                                                <span className="text-sm font-semibold text-foreground truncate">
                                                                    {formData.houseboat_id ? getBoatName(formData.houseboat_id) : (formData.restaurant_table_id ? `Table #${formData.restaurant_table_id}` : 'General Inquiry')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Reservation Schedule - Soft Emerald */}
                                                    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                            <CalendarDays className="h-3 w-3" />
                                                            Reservation Schedule
                                                        </h3>
                                                        <div className="flex items-center gap-6">
                                                            <div className="flex flex-col">
                                                                <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Check-in</span>
                                                                <div className="flex items-baseline gap-1.5">
                                                                    <span className="text-base font-semibold text-foreground">
                                                                        {formData.start_time ? format(parseISO(formData.start_time), 'dd MMM') : '-'}
                                                                    </span>
                                                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                                                        {formData.start_time ? format(parseISO(formData.start_time), 'yyyy') : ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                            <div className="flex flex-col">
                                                                <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Check-out</span>
                                                                <div className="flex items-baseline gap-1.5">
                                                                    <span className="text-base font-semibold text-foreground">
                                                                        {formData.end_time ? format(parseISO(formData.end_time), 'dd MMM') : '-'}
                                                                    </span>
                                                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                                                        {formData.end_time ? format(parseISO(formData.end_time), 'yyyy') : ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="ml-auto rounded-lg border border-border bg-muted px-2 py-1.5 text-[10px] font-semibold tracking-tight text-foreground">
                                                                {formData.start_time && formData.end_time ? `${differenceInCalendarDays(parseISO(formData.end_time), parseISO(formData.start_time))} Nights` : '0 Nights'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Section: Notes - Soft Slate */}
                                                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <FileText className="h-3 w-3" />
                                                        Internal Documentation
                                                    </h3>
                                                    <p className="text-sm leading-relaxed font-medium text-foreground">
                                                        {formData.notes || 'No internal notes provided for this reservation.'}
                                                    </p>
                                                </div>

                                                {/* Extras Section - Flatter Grid */}
                                                <div className="rounded-xl border border-border bg-card p-4">
                                                    <h3 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <Plus className="h-3 w-3" />
                                                        Selected Extras
                                                    </h3>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        {extras.filter(e => (formData.extras || []).includes(e.id)).map(extra => (
                                                            <div key={extra.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
                                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-xs font-semibold text-foreground">{extra.name}</p>
                                                                    <p className="text-[10px] font-medium text-muted-foreground">EUR {extra.price}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(!formData.extras || formData.extras.length === 0) && (
                                                            <div className="col-span-full py-4 text-center text-xs font-medium text-muted-foreground">
                                                                No additional extras selected
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="payments" className="m-0 p-8">
                                                <div className="flex items-center justify-between mb-8">
                                                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <CreditCard className="h-4 w-4" />
                                                        Transaction History
                                                    </h3>
                                                    <Badge variant="outline" className="bg-muted text-[10px] font-semibold uppercase tracking-widest px-3 py-1 border-border text-muted-foreground">
                                                        {paymentTransactions.length} Records
                                                    </Badge>
                                                </div>

                                                <div className="space-y-3">
                                                    {isLoadingTransactions ? (
                                                        <div className="space-y-4">
                                                            {[1, 2, 3].map(i => (
                                                                <Skeleton key={i} className="h-16 w-full rounded-xl" />
                                                            ))}
                                                        </div>
                                                    ) : paymentTransactions.length > 0 ? (
                                                        paymentTransactions.map((tx, i) => (
                                                            <div key={tx.id || i} className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all group-hover:bg-primary/10 group-hover:text-primary">
                                                                        <DollarSign className="h-5 w-5" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-xs font-semibold tracking-tight text-foreground">{tx.display_method || tx.method}</p>
                                                                            {tx.needs_invoice && <Badge className="h-4 border-none bg-amber-100 px-1.5 text-[8px] font-semibold text-amber-800">FATURA</Badge>}
                                                                        </div>
                                                                        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{format(parseISO(tx.created_at), 'dd MMM yyyy, HH:mm')}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-semibold text-foreground">EUR {tx.amount.toLocaleString()}</p>
                                                                    <p className="max-w-[120px] truncate text-[10px] font-medium tracking-tight text-muted-foreground">{tx.reference || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-20 text-center">
                                                            <CreditCard className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                                                            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">No transactions found</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="history" className="m-0 p-8 space-y-6">
                                                <h3 className="mb-6 text-sm font-semibold text-foreground">System Audit Log</h3>
                                                <div className="relative space-y-6 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-border">
                                                    {[
                                                        { icon: Mail, label: 'Confirmation Sent', date: selectedBooking.created_at, color: 'text-blue-500' },
                                                        { icon: Ship, label: 'Booking Initialized', date: selectedBooking.created_at, color: 'text-emerald-500' }
                                                    ].map((item, i) => (
                                                        <div key={i} className="flex gap-4 relative">
                                                            <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                                                                <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                                                                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{format(parseISO(item.date), 'MMMM dd, HH:mm')}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TabsContent>
                                        </div>
                                    </Tabs>
                                </div>

                                {/* Right Side: Financial Overview */}
                                <div className="custom-scrollbar flex w-full flex-col space-y-6 overflow-y-auto border-t border-border bg-muted/20 p-6 lg:w-[320px] lg:border-l lg:border-t-0">
                                    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <DollarSign className="h-3.5 w-3.5" />
                                            Financial Overview
                                        </h3>

                                        {pricingBreakdown ? (
                                            <div className="space-y-6">
                                                <div className="space-y-3 px-1">
                                                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                        <span>Rental Subtotal</span>
                                                        <span className="font-semibold text-foreground">EUR {pricingBreakdown.rentalTotal}</span>
                                                    </div>
                                                    {pricingBreakdown.extrasTotal > 0 && (
                                                        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                            <span>Extras</span>
                                                            <span className="font-semibold text-foreground">+EUR {pricingBreakdown.extrasTotal}</span>
                                                        </div>
                                                    )}
                                                    {(formData.discount || 0) > 0 && (
                                                        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                            <span>Discount ({formData.discount}%)</span>
                                                            <span className="font-semibold text-foreground">-EUR {((pricingBreakdown.rentalTotal + pricingBreakdown.extrasTotal) * ((formData.discount || 0) / 100)).toFixed(0)}</span>
                                                        </div>
                                                    )}
                                                    <div className="my-2 h-px bg-border" />
                                                    <div className="flex items-end justify-between pb-1">
                                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total Price</span>
                                                        <span className="text-2xl font-semibold text-foreground">EUR {(selectedBooking?.price || pricingBreakdown.total).toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4">
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount Paid</span>
                                                        <span className="text-sm font-semibold text-foreground">EUR {(selectedBooking?.amount_paid || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className={cn(
                                                        "flex items-center justify-between rounded-xl border border-border p-4",
                                                        (pricingBreakdown.total - (formData.initial_payment_amount || 0)) > 0 ? "bg-amber-50/40 dark:bg-amber-500/10" : "bg-emerald-50/40 dark:bg-emerald-500/10"
                                                    )}>
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Remaining</span>
                                                        <span className="text-lg font-semibold text-foreground">
                                                            EUR {Math.max(0, (selectedBooking?.price || pricingBreakdown.total) - (selectedBooking?.amount_paid || 0)).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="pt-4 space-y-2">
                                                    <p className="px-4 text-center text-[10px] font-medium italic text-muted-foreground">
                                                        All financial data is calculated automatically and is read-only in this view.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-12 text-center">
                                                <Calculator className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                                                <p className="text-xs font-medium text-muted-foreground">Financials Unavailable</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Single Close Action */}
                            <div className="shrink-0 border-t border-border bg-card px-6 py-4 flex items-center justify-center">
                                <Button
                                    onClick={() => setIsEditDialogOpen(false)}
                                    className="h-10 rounded-lg px-12 text-xs font-semibold uppercase tracking-widest"
                                >
                                    Close Details
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>

            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-2xl border border-border bg-card p-8 shadow-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-semibold text-foreground">Delete Reservation?</AlertDialogTitle>
                        <AlertDialogDescription className="mt-2 text-base text-muted-foreground">
                            This will permanently delete the booking for <span className="font-semibold text-foreground">{selectedBooking?.client_name}</span>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-3 border-t border-border pt-6">
                        <AlertDialogCancel disabled={isProcessing} className="h-12 rounded-xl border-border px-6 font-semibold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isProcessing} className="h-12 rounded-xl bg-destructive px-8 text-base font-semibold text-destructive-foreground hover:bg-destructive/90">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isPaymentHubOpen} onOpenChange={setIsPaymentHubOpen}>
                <DialogContent className="sm:max-w-[800px] overflow-hidden rounded-xl border border-border bg-card p-0 shadow-none">
                    <div className="flex flex-col md:flex-row">
                        {/* Left Column: Transaction History */}
                        <div className="md:w-[300px] border-r border-border bg-muted/30 flex flex-col p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Transaction History
                                </h3>
                                <span className="text-xs font-medium text-muted-foreground">
                                    {paymentTransactions.length} records
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 max-h-[320px]">
                                {isLoadingTransactions ? (
                                    <div className="space-y-2">
                                        {[1, 2].map(i => (
                                            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                                        ))}
                                    </div>
                                ) : paymentTransactions.length > 0 ? (
                                    paymentTransactions.map(tx => (
                                        <div key={tx.id} className={cn(
                                            "bg-card p-3 rounded-lg border transition-colors",
                                            tx.needs_invoice
                                                ? "border-amber-200 hover:border-amber-300 dark:border-amber-500/30"
                                                : "border-border hover:border-border/70"
                                        )}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">{tx.display_method || tx.method}</span>
                                                    {tx.needs_invoice && (
                                                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">FATURA</span>
                                                    )}
                                                </div>
                                                <span className="text-sm font-semibold text-foreground">EUR {tx.amount.toLocaleString()}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate mb-1">
                                                {tx.reference || 'Manual Payment'}
                                            </p>
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {format(parseISO(tx.created_at), 'dd MMM yyyy, HH:mm')}
                                            </div>

                                            {/* Billing Details for Accountant */}
                                            {tx.needs_invoice && tx.billing_nif && (
                                                <div className="mt-2 pt-2 border-t border-amber-100 space-y-1">
                                                    <div className="flex items-center gap-2 text-[10px]">
                                                        <span className="w-10 text-muted-foreground">NIF</span>
                                                        <span className="font-semibold text-foreground">{tx.billing_nif}</span>
                                                    </div>
                                                    {tx.billing_name && (
                                                        <div className="flex items-center gap-2 text-[10px]">
                                                            <span className="w-10 text-muted-foreground">Name</span>
                                                            <span className="text-muted-foreground">{tx.billing_name}</span>
                                                        </div>
                                                    )}
                                                    {tx.billing_address && (
                                                        <div className="flex items-center gap-2 text-[10px]">
                                                            <span className="w-10 text-muted-foreground">Addr</span>
                                                            <span className="text-muted-foreground truncate">{tx.billing_address}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))

                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-8">
                                        <History className="h-8 w-8 text-muted-foreground/50 mb-2" />
                                        <p className="text-xs text-muted-foreground">No transactions yet</p>
                                    </div>
                                )}
                            </div>

                            {/* Balance Summary */}
                            <div className="mt-4 pt-4 border-t border-border">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-muted-foreground">Total Paid</span>
                                    <span className="text-sm font-semibold text-foreground">EUR {(paymentBooking?.amount_paid || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Outstanding</span>
                                    <span className="text-lg font-semibold text-foreground">
                                        EUR {((paymentBooking?.price || 0) - (paymentBooking?.amount_paid || 0)).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Payment Actions */}
                        <div className="flex-1 flex flex-col">
                            <DialogHeader className="p-6 pb-4 border-b border-border">
                                <DialogTitle className="text-xl font-semibold text-foreground">
                                    Payment Hub
                                </DialogTitle>
                                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                                    Record payment or send request for <span className="font-semibold text-foreground">{paymentBooking?.client_name}</span>
                                </DialogDescription>
                            </DialogHeader>

                            <div className="p-6 flex-1">
                                <Tabs defaultValue="manual" className="w-full">
                                    <TabsList className="mb-6 grid h-10 w-full grid-cols-2 rounded-lg bg-muted p-1">
                                        <TabsTrigger
                                            value="manual"
                                            className="rounded-md text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground transition-all"
                                        >
                                            <Pencil className="h-3.5 w-3.5 mr-2" />
                                            Manual Entry
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="digital"
                                            className="rounded-md text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground transition-all"
                                        >
                                            <Send className="h-3.5 w-3.5 mr-2" />
                                            Payment Link
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="manual" className="mt-0 space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Amount Received</Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">EUR</span>
                                                    <Input
                                                        type="number"
                                                        value={paymentAmount}
                                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                                        className="h-11 rounded-lg border-border bg-background pl-11 font-semibold text-lg text-foreground shadow-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Payment Method</Label>
                                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                    <SelectTrigger className="h-11 rounded-lg border-border font-medium shadow-none">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-lg border-border">
                                                        <SelectItem value="Cash" className="font-medium">Cash</SelectItem>
                                                        <SelectItem value="Terminal / Card" className="font-medium">Card Terminal</SelectItem>
                                                        <SelectItem value="Bank Transfer" className="font-medium">Bank Transfer</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleRegisterPayment}
                                            disabled={isProcessing || !paymentAmount}
                                            className="h-12 w-full rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-none"
                                        >
                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                            Record Payment
                                        </Button>
                                    </TabsContent>

                                    <TabsContent value="digital" className="mt-0 space-y-5">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Recipient Email</Label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="email"
                                                        value={paymentRecipientEmail}
                                                        onChange={(e) => setPaymentRecipientEmail(e.target.value)}
                                                        placeholder="client@email.com"
                                                        className="h-11 rounded-lg border-border bg-background pl-10 font-medium text-foreground shadow-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Amount to Request</Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">EUR</span>
                                                    <Input
                                                        type="number"
                                                        value={paymentAmount}
                                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                                        className="h-11 rounded-lg border-border bg-background pl-11 font-semibold text-lg text-foreground shadow-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleSendPaymentLink}
                                            disabled={isSendingLink || !paymentAmount || !paymentRecipientEmail}
                                            className="h-12 w-full rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-none"
                                        >
                                            {isSendingLink ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                            Send Payment Link
                                        </Button>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>


            {/* Bulk Delete Dialog */}
            <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <AlertDialogContent className="rounded-2xl border border-border bg-card p-8 shadow-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-semibold text-foreground">Delete {selectedIds.length} Reservations?</AlertDialogTitle>
                        <AlertDialogDescription className="mt-2 text-base text-muted-foreground">
                            You are about to delete <span className="font-semibold text-foreground">{selectedIds.length}</span> selected reservations permanently. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-3 border-t border-border pt-6">
                        <AlertDialogCancel disabled={isProcessing} className="h-12 rounded-xl border-border px-6 font-semibold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} disabled={isProcessing} className="h-12 rounded-xl bg-destructive px-8 text-base font-semibold text-destructive-foreground hover:bg-destructive/90">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Permanently All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Status Dialog */}
            <Dialog open={isBulkStatusDialogOpen} onOpenChange={setIsBulkStatusDialogOpen}>
                <DialogContent className="max-w-sm rounded-2xl border border-border bg-card p-8 shadow-none">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-semibold text-foreground">Update Status</DialogTitle>
                        <DialogDescription className="mt-2 text-base text-muted-foreground">
                            Apply new status to {selectedIds.length} selected reservations.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        <Select value={bulkStatus} onValueChange={setBulkStatus}>
                            <SelectTrigger className="h-14 rounded-xl border border-border bg-background text-base font-semibold text-foreground">
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border border-border bg-popover text-sm font-medium shadow-none">
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
                    <DialogFooter className="mt-4 border-t border-border pt-4">
                        <Button variant="ghost" onClick={() => setIsBulkStatusDialogOpen(false)} className="h-12 rounded-xl font-semibold">Cancel</Button>
                        <Button onClick={handleBulkStatusUpdate} disabled={isProcessing} className="h-12 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90">
                            Update Reservations
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function ReservationsPage() {
    return (
        <Suspense fallback={<div className="p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>}>
            <ReservationsContent />
        </Suspense>
    );
}


