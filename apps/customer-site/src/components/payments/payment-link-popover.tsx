'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { Loader2, Link, CheckCircle, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Booking } from '@/lib/types';

interface PaymentLinkPopoverProps {
    booking: Booking | any; // Loose type for flexibility or stricter if preferred
    trigger?: React.ReactNode;
    onLinkGenerated?: () => void;
    compact?: boolean;
}

export function PaymentLinkPopover({ booking, trigger, onLinkGenerated, compact = false }: PaymentLinkPopoverProps) {
    const [loadingLink, setLoadingLink] = useState(false);
    const [linkAmount, setLinkAmount] = useState<number | null>(null);
    const [linkEmail, setLinkEmail] = useState('');
    const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    useEffect(() => {
        if (isLinkPopoverOpen) {
            setGeneratedLink(null);
            const total = booking.total_price || booking.price || 0;
            const paid = booking.amount_paid || 0;
            const remaining = Math.max(0, total - paid);

            // Default logic: If nothing paid yet, default to 30% deposit. Else remaining balance.
            if (paid === 0 && total > 0) {
                setLinkAmount(Math.floor(total * 0.30));
            } else {
                setLinkAmount(remaining);
            }

            setLinkEmail(booking.client_email || '');
        }
    }, [booking, isLinkPopoverOpen]);

    const handleQuickAmount = (percentage: number) => {
        const total = booking.total_price || booking.price || 0;
        const paid = booking.amount_paid || 0;
        const remaining = Math.max(0, total - paid);

        if (percentage === 1) {
            setLinkAmount(remaining);
        } else {
            setLinkAmount(Math.floor(total * percentage));
        }
    };

    const handleGenerateLink = async (mode: 'email' | 'copy') => {
        setLoadingLink(true);
        try {
            const res = await fetch('/api/payments/link/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: booking.id,
                    email: linkEmail,
                    amount: linkAmount,
                    skipEmail: mode === 'copy'
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            if (mode === 'email') {
                toast({
                    title: 'Payment Link Sent',
                    description: `Link sent to ${linkEmail}`
                });
                setIsLinkPopoverOpen(false);
            } else {
                setGeneratedLink(data.link);
                navigator.clipboard.writeText(data.link);
                toast({ title: 'Copied!', description: 'Link copied to clipboard.' });
            }

            if (onLinkGenerated) onLinkGenerated();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoadingLink(false);
        }
    };

    return (
        <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
            <PopoverTrigger asChild>
                {trigger || (
                    <Button
                        className={cn(
                            "bg-[#34C759] text-white hover:bg-[#2da84a] font-bold shadow-sm shadow-emerald-500/20 uppercase tracking-wider",
                            compact ? "h-8 px-3 text-[10px]" : "h-9 px-4 text-xs"
                        )}
                    >
                        <Link className={cn("mr-2", compact ? "h-3 w-3" : "h-4 w-4")} />
                        Payment Link
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4 rounded-xl shadow-xl border-[#18230F]/10" align="end">
                <div className="space-y-2">
                    <h4 className="font-bold text-[#18230F] flex items-center gap-2">
                        <Link className="h-4 w-4 text-[#34C759]" />
                        Send Payment Request
                    </h4>
                    <p className="text-xs text-gray-500">Customize amount and recipient for <strong>{booking.client_name || 'Guest'}</strong>.</p>
                </div>

                {generatedLink ? (
                    <div className="space-y-3 animate-in fade-in zoom-in duration-300">
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100 space-y-2">
                            <div className="flex items-center gap-2 text-green-700 font-bold text-xs">
                                <CheckCircle className="h-4 w-4" />
                                Link Generated!
                            </div>
                            <div className="flex gap-2">
                                <Input readOnly value={generatedLink} className="h-8 text-[10px] font-mono bg-white" />
                                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => {
                                    navigator.clipboard.writeText(generatedLink || '');
                                    toast({ title: 'Copied' });
                                }}>
                                    <Copy className="h-3 w-3" />
                                    <span className="sr-only">Copy</span>
                                </Button>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setGeneratedLink(null)} className="w-full text-xs text-gray-500">
                            Create Another Link
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-[#18230F]/40">Amount (€)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={linkAmount || ''}
                                    onChange={(e) => setLinkAmount(parseFloat(e.target.value))}
                                    className="h-9 font-black flex-1"
                                />
                                <div className="flex gap-1">
                                    <Button variant="outline" size="sm" onClick={() => handleQuickAmount(0.3)} className="h-9 px-2 text-[10px] font-bold">30%</Button>
                                    <Button variant="outline" size="sm" onClick={() => handleQuickAmount(0.5)} className="h-9 px-2 text-[10px] font-bold">50%</Button>
                                    <Button variant="outline" size="sm" onClick={() => handleQuickAmount(1)} className="h-9 px-2 text-[10px] font-bold">100%</Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-[#18230F]/40">Recipient Email</Label>
                            <Input
                                type="email"
                                value={linkEmail}
                                onChange={(e) => setLinkEmail(e.target.value)}
                                className="h-9"
                                placeholder="Optional for copying"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <Button
                                onClick={() => handleGenerateLink('copy')}
                                disabled={loadingLink || !linkAmount}
                                variant="outline"
                                className="h-10 font-bold text-xs"
                            >
                                {loadingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Copy Link'}
                            </Button>
                            <Button
                                onClick={() => handleGenerateLink('email')}
                                disabled={loadingLink || !linkAmount || !linkEmail}
                                className="bg-[#18230F] hover:bg-black text-white h-10 font-bold text-xs"
                            >
                                {loadingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Send Email'}
                            </Button>
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
