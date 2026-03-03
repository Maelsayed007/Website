'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
    Search,
    Filter,
    Download,
    CreditCard,
    Clock,
    ExternalLink,
    History as HistoryIcon,
    ChevronDown,
    Receipt,
    Check,
    Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { ClientHistoryDialog } from '@/components/client-history-dialog';

type TransactionWithBooking = {
    id: string;
    booking_id: string;
    amount: number;
    method: string;
    display_method?: string;
    status: string;
    created_at: string;
    reference?: string;
    billing_name?: string;
    billing_nif?: string;
    billing_address?: string;
    needs_invoice?: boolean;
    invoice_status?: 'pending' | 'issued' | 'ignored';
    invoice_ref?: string;
    accountant_notes?: string;
    source_table?: string;
    booking: {
        id: string;
        client_name: string;
        client_email: string;
        billing_name?: string;
        billing_nif?: string;
        billing_address?: string;
    } | null;
};

export default function PaymentsDashboard() {
    const { supabase } = useSupabase();
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<TransactionWithBooking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'invoice' | 'invoice-pending' | 'invoice-issued' | 'regular'>('all');
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [selectedClientForHistory, setSelectedClientForHistory] = useState<{ email?: string; name?: string; bookingId?: string }>({});

    // Invoice Dialog states
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
    const [selectedTransactionForInvoice, setSelectedTransactionForInvoice] = useState<TransactionWithBooking | null>(null);
    const [invoiceRefInput, setInvoiceRefInput] = useState('');
    const [accountantNotesInput, setAccountantNotesInput] = useState('');
    const [isSavingInvoice, setIsSavingInvoice] = useState(false);

    // Fetch data
    useEffect(() => {
        const fetchPayments = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch from payment_transactions (The new standard)
                const { data: txData, error: txError } = await supabase
                    .from('payment_transactions')
                    .select(`
                        *,
                        booking:bookings (
                            id,
                            client_name,
                            client_email,
                            billing_name,
                            billing_nif,
                            billing_address
                        )
                    `)
                    .order('created_at', { ascending: false });

                if (txError) throw txError;
                console.log(`[Payments] Found ${txData?.length || 0} transaction records`);
                if (txData && txData.length > 0) {
                    console.log('[Payments] First tx record:', txData[0]);
                }

                // 2. Fetch from legacy 'payments' table
                const { data: pData } = await supabase
                    .from('payments')
                    .select(`
                        *,
                        booking:bookings (
                            id,
                            client_name,
                            client_email,
                            billing_name,
                            billing_nif,
                            billing_address
                        )
                    `)
                    .order('created_at', { ascending: false });

                // 3. Fetch from legacy 'restaurant_payments' table
                const { data: rpData } = await supabase
                    .from('restaurant_payments')
                    .select(`
                        *,
                        booking:bookings (
                            id,
                            client_name,
                            client_email,
                            billing_name,
                            billing_nif,
                            billing_address
                        )
                    `)
                    .order('created_at', { ascending: false });

                // 4. Fetch bookings with amount_paid > 0 for fallback
                const { data: bData } = await supabase
                    .from('bookings')
                    .select('id, client_name, client_email, amount_paid, updated_at, created_at, billing_name, billing_nif, billing_address, source')
                    .gt('amount_paid', 0);

                // Map and combine
                const mappedTx = (txData || []).map(tx => ({
                    ...tx,
                    display_method: tx.method,
                    billing_name: tx.billing_name || tx.booking?.billing_name || tx.booking?.client_name,
                    billing_nif: tx.billing_nif || tx.booking?.billing_nif,
                    billing_address: tx.billing_address || tx.booking?.billing_address,
                    needs_invoice: tx.needs_invoice || !!(tx.booking?.billing_nif),
                    invoice_status: tx.invoice_status || (!!(tx.booking?.billing_nif) ? 'pending' : 'ignored'),
                    invoice_ref: tx.invoice_ref || '',
                    accountant_notes: tx.accountant_notes || '',
                    source_table: 'payment_transactions'
                }));

                const mappedP = (pData || []).map(p => {
                    const isStripe = p.method === 'stripe' || !!p.stripe_payment_intent_id;
                    let methodLabel = p.metadata?.details || p.method || (isStripe ? 'Card / Online' : 'Manual');
                    if (methodLabel === 'stripe') methodLabel = 'Card / Online';
                    if (methodLabel === 'cash') methodLabel = 'CASH';
                    if (methodLabel === 'card') methodLabel = 'TPA / Card';

                    return {
                        id: p.id,
                        booking_id: p.booking_id,
                        amount: p.amount,
                        method: methodLabel,
                        display_method: methodLabel,
                        status: 'completed',
                        reference: p.reference || p.stripe_payment_intent_id,
                        created_at: p.created_at,
                        billing_name: p.booking?.billing_name || p.booking?.client_name,
                        billing_nif: p.booking?.billing_nif,
                        billing_address: p.booking?.billing_address,
                        needs_invoice: !!(p.booking?.billing_nif),
                        invoice_status: !!(p.booking?.billing_nif) ? 'pending' : 'ignored',
                        invoice_ref: '',
                        source_table: 'payments',
                        booking: p.booking
                    };
                });

                const mappedRP = (rpData || []).map(p => {
                    let methodLabel = p.method || 'Restaurant';
                    if (methodLabel === 'cash') methodLabel = 'CASH';
                    if (methodLabel === 'card') methodLabel = 'TPA / Card';

                    return {
                        id: p.id,
                        booking_id: p.booking_id,
                        amount: p.amount,
                        method: methodLabel,
                        display_method: methodLabel,
                        status: 'completed',
                        reference: p.reference || 'Restaurant Receipt',
                        created_at: p.created_at,
                        billing_name: p.booking?.billing_name || p.booking?.client_name,
                        billing_nif: p.booking?.billing_nif,
                        billing_address: p.booking?.billing_address,
                        needs_invoice: !!(p.booking?.billing_nif),
                        invoice_status: !!(p.booking?.billing_nif) ? 'pending' : 'ignored',
                        invoice_ref: '',
                        source_table: 'restaurant_payments',
                        booking: p.booking
                    };
                });

                // Combine and deduplicate
                const all = [...mappedTx, ...mappedP, ...mappedRP];
                const unique = all.reduce((acc: TransactionWithBooking[], curr) => {
                    const isDuplicate = acc.some(tx => {
                        // 1. Direct ID match
                        if (tx.id === curr.id) return true;

                        // 2. Reference match (skip generic fallbacks)
                        const isGenericRef = (curr.reference || '').includes('Recorded before transaction logging') ||
                            (curr.reference || '').includes('Migrated from legacy source');
                        const isTxGenericRef = (tx.reference || '').includes('Recorded before transaction logging') ||
                            (tx.reference || '').includes('Migrated from legacy source');

                        if (!isGenericRef && !isTxGenericRef && tx.reference === curr.reference && tx.reference !== null) return true;

                        // 3. Loose match for legacy migrations (Booking + Amount)
                        // This handles cases where dates might vary slightly
                        if (String(tx.booking_id) === String(curr.booking_id) &&
                            Math.abs(tx.amount - curr.amount) < 0.1) {
                            return true;
                        }

                        return false;
                    });
                    if (!isDuplicate) acc.push(curr);
                    return acc;
                }, []);

                console.log(`[Payments] Final unique list: ${unique.length} items`);
                const txItems = unique.filter((u: TransactionWithBooking) => u.source_table === 'payment_transactions');
                console.log(`[Payments] Unique list has ${txItems.length} records from payment_transactions`);
                if (txItems.length > 0) {
                    console.log('[Payments] Sample tx record in unique list:', {
                        id: txItems[0].id,
                        bookingId: txItems[0].booking_id,
                        status: txItems[0].invoice_status
                    });
                }

                // 5. Add fallback legacy entries from bookings
                (bData || []).forEach((b: any) => {
                    // Check if this specific payment (Booking + Amount) is already covered
                    const hasTransaction = unique.some((tx: TransactionWithBooking) =>
                        String(tx.booking_id) === String(b.id) &&
                        Math.abs(tx.amount - (b.amount_paid || 0)) < 0.1
                    );

                    if (!hasTransaction) {
                        const methodLabel = b.source === 'manual' ? 'Legacy Manual (Office)' : 'Legacy Online (Link)';
                        unique.push({
                            id: `legacy-${b.id}`,
                            booking_id: b.id,
                            amount: b.amount_paid,
                            method: methodLabel,
                            display_method: methodLabel,
                            status: 'completed',
                            reference: 'Recorded before transaction logging',
                            created_at: b.updated_at || b.created_at,
                            billing_name: b.billing_name || b.client_name,
                            billing_nif: b.billing_nif,
                            billing_address: b.billing_address,
                            needs_invoice: !!(b.billing_nif),
                            invoice_status: !!(b.billing_nif) ? 'pending' : 'ignored',
                            invoice_ref: '',
                            source_table: 'booking_fallback',
                            booking: {
                                id: b.id,
                                client_name: b.client_name,
                                client_email: b.client_email,
                                billing_nif: b.billing_nif,
                                billing_name: b.billing_name,
                                billing_address: b.billing_address
                            }
                        });
                    }
                });

                // Sort by date descending
                unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                setTransactions(unique);
            } catch (err: any) {
                console.error('Error fetching payments:', err.message);
                toast({
                    title: 'Error',
                    description: 'Failed to load payments.',
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchPayments();
    }, [supabase, toast]);

    // Filtering logic
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesSearch =
                tx.booking?.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tx.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tx.billing_nif?.includes(searchQuery);

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'invoice' && tx.needs_invoice) ||
                (statusFilter === 'invoice-pending' && tx.needs_invoice && tx.invoice_status === 'pending') ||
                (statusFilter === 'invoice-issued' && tx.needs_invoice && tx.invoice_status === 'issued') ||
                (statusFilter === 'regular' && !tx.needs_invoice);

            return matchesSearch && matchesStatus;
        });
    }, [transactions, searchQuery, statusFilter]);

    // CSV Export
    const exportToCSV = () => {
        const headers = ['Date', 'Client', 'Amount', 'Method', 'Reference', 'Invoicing Name', 'NIF', 'Address'];
        const rows = filteredTransactions.map(tx => [
            format(parseISO(tx.created_at), 'yyyy-MM-dd HH:mm'),
            tx.booking?.client_name || 'Unknown',
            tx.amount.toString(),
            tx.method,
            tx.reference || 'N/A',
            tx.billing_name || 'N/A',
            tx.billing_nif || 'N/A',
            tx.billing_address || 'N/A'
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `payments_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpdateInvoiceStatus = async (txId: string, status: string, ref: string) => {
        try {
            const response = await fetch('/api/payments/invoice-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId: txId,
                    invoiceStatus: status,
                    invoiceRef: ref,
                    accountantNotes: accountantNotesInput,
                    // Additional info in case the record needs to be created (legacy)
                    bookingId: selectedTransactionForInvoice?.booking_id,
                    amount: selectedTransactionForInvoice?.amount,
                    method: selectedTransactionForInvoice?.method,
                    reference: selectedTransactionForInvoice?.reference,
                    createdAt: selectedTransactionForInvoice?.created_at,
                    billingName: selectedTransactionForInvoice?.billing_name,
                    billingNif: selectedTransactionForInvoice?.billing_nif,
                    billingAddress: selectedTransactionForInvoice?.billing_address
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update');
            }

            toast({
                title: 'Success',
                description: 'Invoice status updated.',
            });

            // Update local state
            setTransactions(prev => prev.map(t =>
                t.id === txId ? { ...t, invoice_status: status as any, invoice_ref: ref, accountant_notes: accountantNotesInput } : t
            ));
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.message,
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-700 p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2 px-1">
                <div>
                    <h1 className="text-3xl font-black text-[#18230F] tracking-tight">Payments & Invoicing</h1>
                    <p className="text-xs font-bold text-[#18230F]/40 uppercase tracking-[0.2em] mt-1">Manage and track all customer transactions</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="h-7 px-4 rounded-full border-[#18230F]/10 text-[#18230F]/60 font-black text-[10px] uppercase tracking-widest bg-white shadow-none">
                        {filteredTransactions.length} Results
                    </Badge>
                </div>
            </div>

            {/* Filters Bar - Reservations Style */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 w-full px-1 mb-6">
                <div className="relative w-full lg:w-[450px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#18230F]/60" />
                    <Input
                        placeholder="Search client, NIF, reference..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 bg-white border-[#18230F]/10 focus:bg-white focus:border-[#34C759]/30 rounded-full text-sm font-bold text-[#18230F] placeholder:text-[#18230F]/40 transition-all shadow-none ring-0"
                    />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 w-full xl:w-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-10 rounded-full px-6 gap-2 bg-white text-[#18230F] border-[#18230F]/10 hover:border-[#34C759]/30 hover:bg-emerald-50 transition-all font-bold shadow-none ring-0"
                            >
                                <Filter className="h-4 w-4 text-[#18230F]/60" />
                                {statusFilter === 'all' ? 'All Transactions' :
                                    statusFilter === 'invoice' ? 'All Invoice Req.' :
                                        statusFilter === 'invoice-pending' ? 'Invoice Pending' :
                                            statusFilter === 'invoice-issued' ? 'Invoice Issued' :
                                                'Regular Payments'}
                                <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-[#18230F]/10 shadow-xl bg-white p-2">
                            <DropdownMenuItem onClick={() => setStatusFilter('all')} className="rounded-lg hover:bg-[#34C759]/10 text-xs font-bold text-[#18230F] py-2 cursor-pointer">All Transactions</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusFilter('invoice')} className="rounded-lg hover:bg-[#34C759]/10 text-xs font-bold text-[#18230F] py-2 cursor-pointer">All Invoice Requested</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusFilter('invoice-pending')} className="rounded-lg hover:bg-[#34C759]/10 text-xs font-bold text-amber-600 py-2 cursor-pointer">Faturas Pending</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusFilter('invoice-issued')} className="rounded-lg hover:bg-[#34C759]/10 text-xs font-bold text-emerald-600 py-2 cursor-pointer">Faturas Issued</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusFilter('regular')} className="rounded-lg hover:bg-[#34C759]/10 text-xs font-bold text-[#18230F] py-2 cursor-pointer">Regular Payments</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="h-8 w-px bg-slate-200 mx-1 hidden xl:block" />

                    <Button
                        onClick={exportToCSV}
                        className="h-10 rounded-full px-6 gap-2 bg-[#70C167] text-[#18230F] border-none hover:bg-[#62ad5a] transition-all font-black shadow-none ring-0"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Table - Reservations Style */}
            <Card className="overflow-hidden border border-[#18230F]/10 bg-white rounded-2xl shadow-none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#FDF8F1]/50 text-sm font-black uppercase tracking-widest text-[#18230F] border-b border-[#18230F]/5">
                            <tr>
                                <th className="px-6 py-5 text-left">Date</th>
                                <th className="px-6 py-5 text-left">Client</th>
                                <th className="px-6 py-5 text-left bg-slate-50/50">Amount</th>
                                <th className="px-6 py-5 text-left">Method</th>
                                <th className="px-6 py-5 text-right">Invoice</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#18230F]/5">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="p-6"><Skeleton className="h-12 w-full rounded-xl" /></td>
                                    </tr>
                                ))
                            ) : filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-2">
                                                <CreditCard className="h-8 w-8 text-[#18230F]/10" />
                                            </div>
                                            <h3 className="text-lg font-black text-[#18230F] tracking-tight">No transactions found</h3>
                                            <p className="text-sm text-[#18230F] font-bold opacity-40">Try adjusting your filters or search keywords.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((tx: TransactionWithBooking) => (
                                    <tr
                                        key={tx.id}
                                        className="transition-colors group border-b border-[#18230F]/5 hover:bg-[#34C759]/5"
                                    >
                                        <td className="py-2.5 px-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-[#18230F]">{format(parseISO(tx.created_at), 'dd MMM yyyy')}</span>
                                                <span className="text-[10px] text-[#18230F]/40 font-black uppercase tracking-widest leading-none mt-0.5">{format(parseISO(tx.created_at), 'HH:mm')}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center text-[#18230F] font-black text-xs shrink-0 border border-[#34C759]/10">
                                                    {(tx.booking?.client_name || 'M').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-[#18230F] text-sm truncate">{tx.booking?.client_name || 'External / Manual'}</p>
                                                    <p className="text-[10px] text-[#18230F]/40 font-mono font-bold truncate">{tx.reference || 'No Reference'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-6 bg-slate-50/30">
                                            <span className="text-sm font-black text-slate-900 tracking-tight">€{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="py-2.5 px-6">
                                            <Badge variant="outline" className="border-[#18230F]/10 text-[#18230F]/60 text-[10px] px-3 py-1 rounded-full font-black shadow-none bg-white uppercase tracking-widest">
                                                {tx.display_method || tx.method}
                                            </Badge>
                                        </td>
                                        <td className="py-2.5 px-6 text-right">
                                            <div className="flex flex-col items-end gap-1.5">
                                                {tx.needs_invoice ? (
                                                    <Badge className={cn(
                                                        "border-none shadow-none text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest",
                                                        tx.invoice_status === 'issued' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                                    )}>
                                                        {tx.invoice_status === 'issued' ? 'Issued' : 'Fatura Needed'}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-[10px] font-black text-[#18230F]/10 uppercase tracking-widest">—</span>
                                                )}
                                                {tx.invoice_ref && (
                                                    <span className="text-[10px] font-mono font-bold text-[#18230F]/30 italic truncate max-w-[100px]">{tx.invoice_ref}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Go to Reservation */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-xl hover:bg-[#18230F]/10 text-[#18230F] transition-all shadow-none ring-0 border border-transparent hover:border-[#18230F]/20"
                                                    onClick={() => window.open(`/dashboard/reservations?search=${tx.booking_id}`, '_blank')}
                                                    title="Go to Reservation"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>

                                                {/* Issue Fatura */}
                                                {tx.needs_invoice && tx.invoice_status !== 'issued' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 rounded-xl hover:bg-[#18230F]/10 text-[#18230F] transition-all shadow-none ring-0 border border-transparent hover:border-[#18230F]/20"
                                                        onClick={() => {
                                                            setSelectedTransactionForInvoice(tx);
                                                            setInvoiceRefInput(tx.invoice_ref || '');
                                                            setAccountantNotesInput(tx.accountant_notes || '');
                                                            setIsInvoiceDialogOpen(true);
                                                        }}
                                                        title="Issue Fatura"
                                                    >
                                                        <Receipt className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-xl hover:bg-[#18230F]/10 text-[#18230F] transition-all shadow-none ring-0 border border-transparent hover:border-[#18230F]/20"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedClientForHistory({
                                                            email: tx.booking?.client_email,
                                                            name: tx.booking?.client_name,
                                                            bookingId: tx.booking_id
                                                        });
                                                        setHistoryDialogOpen(true);
                                                    }}
                                                    title="View Client History"
                                                >
                                                    <HistoryIcon className="h-4.5 w-4.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Issue Fatura Dialog */}
            <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
                <DialogContent className="rounded-3xl border border-[#18230F]/10 shadow-2xl bg-white p-0 overflow-hidden max-w-md">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-xl font-black text-[#18230F]">Issue Fatura</DialogTitle>
                        <DialogDescription className="text-[#18230F]/60 font-medium text-[13px] mt-1">
                            Enter the invoice reference from the billing system to mark this transaction as issued.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 space-y-4">
                        {selectedTransactionForInvoice && (
                            <div className="space-y-3">
                                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 space-y-3">
                                    <div className="flex justify-between items-center pb-2 border-b border-emerald-100/50">
                                        <span className="text-[10px] font-black text-[#18230F]/40 uppercase tracking-widest leading-none">Total Amount</span>
                                        <span className="text-xl font-black text-[#18230F] leading-none tracking-tight">€{selectedTransactionForInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-black/40 uppercase tracking-[0.12em]">Billing Name</p>
                                            <p className="text-sm font-black text-black truncate">{selectedTransactionForInvoice.billing_name || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-black/40 uppercase tracking-[0.12em]">Tax ID (NIF)</p>
                                            <p className="text-sm font-black text-black font-mono">{selectedTransactionForInvoice.billing_nif || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-emerald-100/30">
                                        <p className="text-[10px] font-black text-black/40 uppercase tracking-[0.12em] mb-1">Billing Address</p>
                                        <p className="text-[12px] font-black text-black leading-snug">
                                            {selectedTransactionForInvoice.billing_address || 'No address provided'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-xs font-black text-[#18230F] uppercase tracking-widest ml-1">Invoice Reference</Label>
                            <Input
                                placeholder="e.g. FAT 2024/001"
                                value={invoiceRefInput}
                                onChange={(e) => setInvoiceRefInput(e.target.value)}
                                className="h-12 rounded-xl bg-white border-[#18230F]/10 focus:border-[#34C759] font-bold text-[#18230F] shadow-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black text-[#18230F] uppercase tracking-widest ml-1">Accountant Notes</Label>
                            <Input
                                placeholder="Internal notes for reference..."
                                value={accountantNotesInput}
                                onChange={(e) => setAccountantNotesInput(e.target.value)}
                                className="h-12 rounded-xl bg-white border-[#18230F]/10 focus:border-[#34C759] font-bold text-[#18230F] shadow-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="ghost"
                                onClick={() => setIsInvoiceDialogOpen(false)}
                                className="flex-1 rounded-xl h-12 font-bold text-[#18230F]/40 hover:text-[#18230F] hover:bg-slate-100"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (!selectedTransactionForInvoice) return;
                                    setIsSavingInvoice(true);
                                    await handleUpdateInvoiceStatus(selectedTransactionForInvoice.id, 'issued', invoiceRefInput);
                                    setIsSavingInvoice(false);
                                    setIsInvoiceDialogOpen(false);
                                }}
                                disabled={isSavingInvoice || !invoiceRefInput}
                                className="flex-1 rounded-xl h-12 bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-black shadow-none gap-2"
                            >
                                {isSavingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Confirm Issuance
                            </Button>
                        </div>
                    </div>

                    <div className="bg-[#18230F]/5 p-4 text-center">
                        <p className="text-[10px] font-bold text-[#18230F]/30 uppercase tracking-widest">Accountant Verification Required</p>
                    </div>
                </DialogContent>
            </Dialog >

            <ClientHistoryDialog
                open={historyDialogOpen}
                onOpenChange={setHistoryDialogOpen}
                clientEmail={selectedClientForHistory.email}
                clientName={selectedClientForHistory.name}
                initialBookingId={selectedClientForHistory.bookingId}
            />

            {/* Pagination / Footer Info - Reservations Style */}
            <div className="flex justify-between items-center text-[10px] font-black text-[#18230F]/30 px-3 uppercase tracking-widest pt-2">
                <div className="flex items-center gap-2">
                    <span className="bg-[#18230F]/5 px-5 py-1.5 rounded-full">Showing {filteredTransactions.length} items found</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Last system sync: {format(new Date(), 'HH:mm')}
                </div>
            </div>
        </div >
    );
}
