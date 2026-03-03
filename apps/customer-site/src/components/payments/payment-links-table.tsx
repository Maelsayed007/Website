'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Send, ExternalLink, RefreshCw, Calendar, Clock, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PaymentLink {
    id: string;
    token: string;
    created_at: string;
    expires_at: string;
    used_at: string | null;
    requested_amount: number | null;
    description: string | null;
    bookings: {
        id: string;
        client_name: string;
        client_email: string;
    };
}

export function PaymentLinksTable() {
    const [links, setLinks] = useState<PaymentLink[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchLinks = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('payment_tokens')
            .select(`
                *,
                bookings (
                    id,
                    client_name,
                    client_email
                )
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching payment links:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load payment history.' });
        } else {
            setLinks(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLinks();
    }, []);

    const copyLink = (token: string) => {
        const link = `${window.location.origin}/payment/${token}`;
        navigator.clipboard.writeText(link);
        toast({ title: 'Copied', description: 'Payment link copied to clipboard.' });
    };

    const getStatus = (link: PaymentLink) => {
        if (link.used_at) return <Badge className="bg-[#34C759] text-white hover:bg-[#34C759] border-none shadow-none text-xs font-bold px-3 py-1 rounded-full">Paid</Badge>;
        if (new Date(link.expires_at) < new Date()) return <Badge variant="secondary" className="bg-[#18230F]/5 text-[#18230F]/40 border-none shadow-none text-xs font-bold px-3 py-1 rounded-full">Expired</Badge>;
        return <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 border-none shadow-none text-xs font-bold px-3 py-1 rounded-full">Active</Badge>;
    };

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(fetchLinks, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && links.length === 0) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-[#34C759]" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#18230F] opacity-30 uppercase tracking-widest">Recent Payment Tokens</h3>
                <Button variant="ghost" size="sm" onClick={fetchLinks} className="h-8 rounded-full px-3 text-[#18230F] font-bold gap-2">
                    <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                    <span className="text-[11px]">Sync History</span>
                </Button>
            </div>

            <div className="rounded-2xl border border-[#18230F]/5 bg-white overflow-hidden">
                <Table>
                    <TableHeader className="bg-[#34C759]/5 border-b border-[#18230F]/5">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[#18230F]/60">Created</TableHead>
                            <TableHead className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[#18230F]/60">Client</TableHead>
                            <TableHead className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[#18230F]/60">Description</TableHead>
                            <TableHead className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[#18230F]/60">Amount</TableHead>
                            <TableHead className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[#18230F]/60">Status</TableHead>
                            <TableHead className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[#18230F]/60">Expires</TableHead>
                            <TableHead className="py-2.5 px-4 text-center text-[11px] font-bold uppercase tracking-wider text-[#18230F]/60">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {links.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-20 bg-white">
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-50 rounded-xl mb-3">
                                        <Clock className="h-6 w-6 text-[#18230F]/10" />
                                    </div>
                                    <h3 className="font-bold text-[#18230F]">No generation history</h3>
                                    <p className="text-sm text-[#18230F]/40">Tokens will appear here once generated for clients.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            links.map((link: PaymentLink) => (
                                <TableRow key={link.id} className="hover:bg-[#34C759]/5 transition-colors border-b border-[#18230F]/5 last:border-0">
                                    <TableCell className="py-2.5 px-4 text-xs font-bold text-[#18230F]/60">
                                        {format(new Date(link.created_at), 'dd MMM HH:mm')}
                                    </TableCell>
                                    <TableCell className="py-2.5 px-4">
                                        <div className="font-bold text-[#18230F] text-sm">
                                            {link.bookings?.client_name || 'Unknown'}
                                        </div>
                                        <div className="text-xs text-[#18230F]/60 tracking-tight truncate max-w-[120px]">{link.bookings?.client_email}</div>
                                    </TableCell>
                                    <TableCell className="py-2.5 px-4 text-sm font-medium text-[#18230F]/60 max-w-[150px] truncate" title={link.description || ''}>
                                        {link.description || '-'}
                                    </TableCell>
                                    <TableCell className="py-2.5 px-4 font-bold text-[#18230F] text-sm">
                                        {link.requested_amount ? `€${link.requested_amount.toLocaleString()}` : '-'}
                                    </TableCell>
                                    <TableCell className="py-2.5 px-4">{getStatus(link)}</TableCell>
                                    <TableCell className="py-2.5 px-4 text-xs font-bold text-[#18230F]/30">
                                        {format(new Date(link.expires_at), 'dd MMM')}
                                    </TableCell>
                                    <TableCell className="py-2.5 px-4">
                                        <div className="flex justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full hover:bg-white text-[#18230F] hover:text-[#34C759] transition-all opacity-40 hover:opacity-100"
                                                onClick={() => copyLink(link.token)}
                                                title="Copy Link"
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full hover:bg-white text-[#18230F] hover:text-[#34C759] transition-all opacity-40 hover:opacity-100"
                                                asChild
                                                title="Open Link"
                                            >
                                                <a href={`/payment/${link.token}`} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
