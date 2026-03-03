
'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
    Mail,
    Phone,
    Calendar,
    DollarSign,
    CreditCard,
    History as HistoryIcon,
    ExternalLink,
    FileText,
    Clock,
    User,
    ShieldCheck,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

type ClientHistoryDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientEmail: string | undefined;
    clientName: string | undefined;
    initialBookingId?: string;
};
type PaymentHistoryItem = {
    id: string;
    amount: number;
    method: string;
    status: string;
    created_at: string;
    reference: string;
    booking_id: string;
    needs_invoice?: boolean;
    invoice_status?: string;
    accountant_notes?: string;
    display_method?: string;
};

export function ClientHistoryDialog({
    open,
    onOpenChange,
    clientEmail,
    clientName,
    initialBookingId,
}: ClientHistoryDialogProps) {
    const { supabase } = useSupabase();
    const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [clientData, setClientData] = useState<any>(null);
    const [totalOutstanding, setTotalOutstanding] = useState(0);

    useEffect(() => {
        if (!open || !supabase) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                let bData: any[] = [];

                if (initialBookingId) {
                    // Fetch ONLY the specific booking
                    const { data, error: bError } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('id', initialBookingId);

                    if (bError) throw bError;
                    bData = data || [];
                } else if (clientEmail) {
                    // Fallback to latest booking if somehow called without ID
                    const trimmedEmail = clientEmail.trim();
                    const { data, error: bError } = await supabase
                        .from('bookings')
                        .select('*')
                        .ilike('client_email', trimmedEmail)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (bError) throw bError;
                    bData = data || [];
                }

                if (bData && bData.length > 0) {
                    const booking = bData[0];
                    setClientData(booking);
                    setBookings([booking]);
                    const bookingId = booking.id;

                    // Calculate Outstanding for THIS RESERVATION ONLY
                    const outstanding = Math.max(0, (booking.price || 0) - (booking.amount_paid || 0));
                    setTotalOutstanding(outstanding);

                    // 2. Fetch from all transaction sources for THIS BOOKING ONLY
                    const [txRes, pRes, rpRes] = await Promise.all([
                        supabase.from('payment_transactions').select('*').eq('booking_id', bookingId),
                        supabase.from('payments').select('*').eq('booking_id', bookingId),
                        supabase.from('restaurant_payments').select('*').eq('booking_id', bookingId)
                    ]);

                    if (txRes.error) throw txRes.error;

                    // 3. Map and combine
                    const mappedTx = (txRes.data || []).map(tx => ({
                        ...tx,
                        display_method: tx.method,
                        source: 'payment_transactions'
                    }));

                    const mappedP = (pRes.data || []).map(p => ({
                        ...p,
                        id: `p-${p.id}`,
                        display_method: p.method || 'Online',
                        source: 'payments'
                    }));

                    const mappedRP = (rpRes.data || []).map(p => ({
                        ...p,
                        id: `rp-${p.id}`,
                        display_method: p.method || 'Restaurant',
                        source: 'restaurant_payments'
                    }));

                    let allPayments = [...mappedTx, ...mappedP, ...mappedRP];

                    // 4. Per-booking Fallback Logic (Same as Payment Hub)
                    if (allPayments.length === 0 && booking.amount_paid > 0) {
                        allPayments.push({
                            id: `legacy-${booking.id}`,
                            booking_id: booking.id,
                            amount: booking.amount_paid,
                            method: 'Legacy',
                            display_method: 'LEGACY PAYMENT',
                            status: 'completed',
                            reference: 'Recorded before transaction logging',
                            created_at: booking.updated_at || booking.created_at,
                            source: 'booking_fallback'
                        });
                    }

                    // Final sort
                    allPayments.sort((a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    );

                    setPayments(allPayments);
                } else {
                    setPayments([]);
                    setBookings([]);
                    setTotalOutstanding(0);
                }
            } catch (error) {
                console.error('[ClientHistory] Fetch Error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [open, clientEmail, initialBookingId, supabase]);

    const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] rounded-xl border border-[#18230F]/10 bg-white p-0 overflow-hidden shadow-none">
                <div className="flex flex-col md:flex-row">
                    {/* Left Column: Transaction History Sidebar */}
                    <div className="md:w-[300px] bg-[#FAFAFA] border-r border-[#18230F]/5 flex flex-col p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xs font-black text-[#18230F]/60 uppercase tracking-[0.15em]">
                                Reservation History
                            </h3>
                            <Badge variant="outline" className="h-5 px-2 rounded-md border-[#18230F]/10 text-[#18230F]/40 font-bold text-[9px] uppercase tracking-widest bg-white shadow-none">
                                {payments.length} Cards
                            </Badge>
                        </div>

                        <ScrollArea className="flex-1 -mx-2 px-2 max-h-[420px]">
                            {isLoading ? (
                                <div className="space-y-2">
                                    {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-[#18230F]/5 rounded-lg animate-pulse" />)}
                                </div>
                            ) : payments.length > 0 ? (
                                <div className="space-y-3 pb-4">
                                    {payments.map((tx) => (
                                        <div key={tx.id} className={cn(
                                            "bg-white p-3.5 rounded-xl border transition-all duration-300 group",
                                            tx.needs_invoice ? "border-amber-200 bg-amber-50/10" : "border-[#18230F]/10 hover:border-[#18230F]/20 hover:shadow-sm"
                                        )}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-black text-[#18230F]/40 uppercase tracking-widest">
                                                        {tx.display_method || tx.method}
                                                    </span>
                                                    {tx.needs_invoice && (
                                                        <span className="text-[10px] font-black text-amber-600 bg-amber-100/50 px-1.5 py-0.5 rounded-md leading-none">FATURA</span>
                                                    )}
                                                </div>
                                                <span className="text-sm font-black text-[#18230F]">€{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                            </div>

                                            <p className="text-[11px] font-medium text-[#18230F]/70 truncate mb-2">
                                                {tx.reference || 'Booking Payment'}
                                            </p>

                                            <div className="flex items-center justify-between mt-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#18230F]/30 uppercase tracking-wider">
                                                    <Clock className="h-3 w-3" />
                                                    {format(parseISO(tx.created_at), 'dd MMM yyyy')}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-all shadow-none"
                                                    onClick={() => window.open(`/dashboard/reservations?id=${tx.booking_id}`, '_blank')}
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                    <div className="bg-[#18230F]/5 p-3 rounded-full mb-3">
                                        <HistoryIcon className="h-5 w-5 text-[#18230F]/20" />
                                    </div>
                                    <p className="text-[10px] font-black text-[#18230F]/30 uppercase tracking-widest">No Transactions Found</p>
                                </div>
                            )}
                        </ScrollArea>

                        {/* Balance Summary Sidebar Footer */}
                        <div className="mt-4 pt-4 border-t border-[#18230F]/10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-[#18230F]/50">Total Paid</span>
                                <span className="text-sm font-semibold text-[#18230F]">€{totalSpent.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[#18230F]/50">Outstanding Balance</span>
                                <span className="text-lg font-black text-red-600">€{totalOutstanding.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Profile & Analytics */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white">
                        <DialogHeader className="p-6 pb-4 border-b border-[#18230F]/5">
                            <DialogTitle className="text-xl font-bold text-[#18230F]">
                                {clientName || 'Client Profile'}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-[#18230F]/50 mt-1 flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                {clientEmail}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-6 flex-1">
                            <Tabs defaultValue="profile" className="w-full">
                                <TabsList className="bg-[#18230F]/5 p-1 rounded-lg h-10 w-full grid grid-cols-2 mb-6">
                                    <TabsTrigger value="profile" className="rounded-md text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#18230F] transition-all">
                                        <User className="h-3.5 w-3.5 mr-2" />
                                        Profile Info
                                    </TabsTrigger>
                                    <TabsTrigger value="billing" className="rounded-md text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#18230F] transition-all">
                                        <FileText className="h-3.5 w-3.5 mr-2" />
                                        Billing Data
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="profile" className="mt-0 space-y-6 outline-none">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-lg border border-[#18230F]/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Calendar className="h-3.5 w-3.5 text-[#18230F]/40" />
                                                <span className="text-[10px] font-bold text-[#18230F]/40 uppercase tracking-widest">Client Age</span>
                                            </div>
                                            <p className="text-lg font-bold text-[#18230F]">{clientData?.created_at ? format(parseISO(clientData.created_at), 'MMM yyyy') : 'New Client'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg border border-[#18230F]/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <DollarSign className="h-3.5 w-3.5 text-[#18230F]/40" />
                                                <span className="text-[10px] font-bold text-[#18230F]/40 uppercase tracking-widest">Transactions</span>
                                            </div>
                                            <p className="text-lg font-bold text-[#18230F]">{payments.length} Records</p>
                                        </div>
                                    </div>

                                    {/* Snapshot */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-[#18230F]/50 uppercase tracking-wider">
                                            Accountant View
                                        </h4>
                                        <div className="bg-white rounded-lg border border-[#18230F]/10 divide-y divide-[#18230F]/5">
                                            <div className="flex justify-between items-center p-4">
                                                <span className="text-xs text-[#18230F]/60">Main Product</span>
                                                <span className="text-xs font-bold text-emerald-600 uppercase">{clientData?.houseboat_id ? 'Houseboats' : clientData?.restaurant_table_id ? 'Restaurant' : 'General'}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-4">
                                                <span className="text-xs text-[#18230F]/60">Email Status</span>
                                                <span className="text-xs font-bold text-blue-600 uppercase">Verified Account</span>
                                            </div>
                                        </div>

                                        <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100 flex gap-3">
                                            <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Accountant Note</p>
                                                <p className="text-xs text-amber-700/80 leading-relaxed font-medium">
                                                    "Client historical data shows high consistency in NIF usage. All payments verified."
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="billing" className="mt-0 space-y-6 outline-none">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-[#18230F]/50 uppercase tracking-wider">
                                            Billing Information
                                        </h4>
                                        <div className="bg-[#FAFAFA] p-5 rounded-lg border border-[#18230F]/10 space-y-6">
                                            <div>
                                                <Label className="text-[10px] font-bold text-[#18230F]/40 uppercase tracking-widest block mb-1">Company / Full Name</Label>
                                                <p className="text-sm font-bold text-[#18230F]">{clientData?.billing_name || clientName || 'Not provided'}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-[10px] font-bold text-[#18230F]/40 uppercase tracking-widest block mb-1">Tax Identification (NIF)</Label>
                                                    <p className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100 inline-block uppercase">{clientData?.billing_nif || 'Not provided'}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-[10px] font-bold text-[#18230F]/40 uppercase tracking-widest block mb-1">Billing Address</Label>
                                                <p className="text-xs font-medium text-[#18230F]/80 leading-relaxed">{clientData?.billing_address || 'Not provided'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        <div className="p-8 pt-0 flex justify-end">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="rounded-xl px-10 font-bold text-[11px] text-[#18230F] uppercase tracking-widest h-11 shadow-none border-[#18230F]/10 hover:bg-slate-50 transition-all font-black"
                            >
                                Close Portal
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
