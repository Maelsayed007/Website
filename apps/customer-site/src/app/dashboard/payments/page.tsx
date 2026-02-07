'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import {
    DollarSign,
    TrendingUp,
    Clock,
    CreditCard,
    Search,
    Filter,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PaymentLinkPopover } from '@/components/payments/payment-link-popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function PaymentsPage() {
    const [stats, setStats] = useState({ revenue: 0, pending: 0, transactions: 0 });
    const [payments, setPayments] = useState<any[]>([]); // To be typed
    const [outstanding, setOutstanding] = useState<any[]>([]); // To be typed
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Recent Transactions (from restaurant_payments for now - ideally a unified generic table)
            // For now, let's fetch 'restaurant_payments' joined with bookings
            const { data: recentPayments, error: paymentError } = await supabase
                .from('restaurant_payments')
                .select('*, bookings(client_name)')
                .order('created_at', { ascending: false })
                .limit(20);

            if (paymentError) console.error(paymentError);

            // 2. Fetch Outstanding Bookings (confirmed but unpaid/partial)
            // Logic: status not Cancelled, amount_paid < total_price
            // Note: total_price column consistency check needed.
            const { data: unpaidBookings, error: unpaidError } = await supabase
                .from('bookings')
                .select('*')
                .neq('status', 'Cancelled')
                .order('start_time', { ascending: true }); // Oldest first

            if (unpaidError) console.error(unpaidError);

            // Filter calc on client side for MVP simplicity or complex computed columns
            const pendingList = (unpaidBookings || []).filter(b => {
                const total = b.total_price || b.price || 0;
                const paid = b.amount_paid || 0;
                return (total - paid) > 0.5; // Tolerance
            });

            setPayments(recentPayments || []);
            setOutstanding(pendingList);

            // Calculate Stats
            const totalRevenue = (recentPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0); // limiting to fetched... real dashboard needs agg query
            const totalPending = pendingList.reduce((sum, b) => sum + ((b.total_price || b.price || 0) - (b.amount_paid || 0)), 0);

            setStats({
                revenue: totalRevenue, // Just displayed recent revenue for now
                pending: totalPending,
                transactions: (recentPayments || []).length
            });

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Financial Overview"
                description="Monitor revenue, track payments, and manage collections."
            />

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-emerald-50 border-emerald-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-900">Recent Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">€{stats.revenue.toFixed(2)}</div>
                        <p className="text-xs text-emerald-600/60">+ from recent transactions</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-amber-900">Pending Collection</CardTitle>
                        <Clock className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-700">€{stats.pending.toFixed(2)}</div>
                        <p className="text-xs text-amber-600/60">{outstanding.length} bookings unpaid</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.transactions}</div>
                        <p className="text-xs text-muted-foreground">Processed recently</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="receivable" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="receivable">Accounts Receivable</TabsTrigger>
                    <TabsTrigger value="transactions">Transaction History</TabsTrigger>
                </TabsList>

                <TabsContent value="receivable" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search client..." className="h-8 w-[200px]" />
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchData}>
                            Refresh
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {outstanding.map((item) => {
                            const total = item.total_price || item.price || 0;
                            const paid = item.amount_paid || 0;
                            const due = total - paid;

                            return (
                                <div key={item.id} className="group flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10 bg-amber-100 text-amber-600">
                                            <AvatarFallback className="font-bold">{item.client_name?.[0] || '?'}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{item.client_name || 'Quick Reservation'}</h4>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>Booking #{item.id.slice(0, 8)}</span>
                                                <span>•</span>
                                                <span>{format(new Date(item.start_time), 'MMM dd, HH:mm')}</span>
                                                {item.houseboat_id && <Badge variant="secondary" className="text-[10px] h-4">Houseboat</Badge>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs font-medium text-gray-500">Amount Due</p>
                                            <p className="font-black text-amber-600">€{due.toFixed(2)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <PaymentLinkPopover booking={item} />
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={`/dashboard/restaurant-reservations?id=${item.id}`}>View</a>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {outstanding.length === 0 && (
                            <div className="text-center py-10 text-gray-500">No outstanding payments found.</div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                    <Card>
                        <CardContent className="p-0">
                            <div className="rounded-md border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-[#F8F9FA] text-gray-500 font-medium border-b">
                                        <tr>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Client</th>
                                            <th className="p-4">Reference</th>
                                            <th className="p-4">Method</th>
                                            <th className="p-4 text-right">Amount</th>
                                            <th className="p-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map((p) => (
                                            <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                                                <td className="p-4 font-medium">{format(new Date(p.created_at), 'dd MMM yyyy HH:mm')}</td>
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-900">{p.bookings?.client_name || '-'}</div>
                                                    <div className="text-xs text-gray-500">Ref: {p.notes || '-'}</div>
                                                </td>
                                                <td className="p-4 font-mono text-xs text-gray-500">{p.id.slice(0, 8)}</td>
                                                <td className="p-4">
                                                    <Badge variant="outline" className="capitalize bg-white">{p.method}</Badge>
                                                </td>
                                                <td className="p-4 text-right font-black text-emerald-600">
                                                    +€{p.amount.toFixed(2)}
                                                </td>
                                                <td className="p-4">
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Completed</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
