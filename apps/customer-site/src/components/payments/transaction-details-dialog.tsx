import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
    CreditCard,
    Calendar,
    User,
    FileText,
    MapPin,
    Hash,
    Mail,
    CheckCircle2,
    Banknote,
    Building2,
    ArrowUpRight,
    Smartphone,
    Globe,
    Receipt
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface TransactionDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: any;
}

export function TransactionDetailsDialog({ isOpen, onClose, transaction }: TransactionDetailsDialogProps) {
    if (!transaction) return null;

    const booking = transaction.bookings || {};
    const clientName = booking.client_name || "Unknown Client";
    const clientEmail = booking.client_email || "N/A";
    const billingNif = booking.billing_nif || "N/A";
    const billingName = booking.billing_name || clientName;
    const billingAddress = booking.billing_address || "N/A";
    const accountantNotes = transaction.accountant_notes;

    const metadata = transaction.metadata || {};
    const stripeType = metadata.stripe_type;
    const isStripe = transaction.method === 'stripe';

    // Determine the icon and label for the payment method
    const getMethodDisplay = () => {
        if (!isStripe) {
            return {
                icon: <Banknote className="w-5 h-5 text-emerald-500" />,
                label: transaction.method === 'cash' ? 'Cash Payment' : 'Other Method',
                sublabel: 'Manual entry'
            };
        }

        // Specific Stripe types
        if (stripeType === 'card') {
            const brand = metadata.card_brand || 'card';
            return {
                icon: <CreditCard className="w-5 h-5 text-indigo-500" />,
                label: `${brand.charAt(0).toUpperCase() + brand.slice(1)} Card`,
                sublabel: metadata.last4 ? `Ending in •••• ${metadata.last4}` : 'Online payment'
            };
        }

        if (metadata.wallet === 'apple_pay') {
            return {
                icon: <Smartphone className="w-5 h-5 text-black" />,
                label: 'Apple Pay',
                sublabel: metadata.last4 ? `•••• ${metadata.last4}` : 'Digital wallet'
            };
        }

        if (metadata.wallet === 'google_pay') {
            return {
                icon: <Smartphone className="w-5 h-5 text-blue-500" />,
                label: 'Google Pay',
                sublabel: metadata.last4 ? `•••• ${metadata.last4}` : 'Digital wallet'
            };
        }

        return {
            icon: <Globe className="w-5 h-5 text-indigo-500" />,
            label: stripeType ? stripeType.charAt(0).toUpperCase() + stripeType.slice(1) : 'Online Payment',
            sublabel: 'Processed via Stripe'
        };
    };

    const methodDisplay = getMethodDisplay();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl rounded-3xl">
                {/* Premium Dark Header */}
                <div className="bg-[#18230F] p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Receipt className="w-32 h-32 rotate-12" />
                    </div>

                    <div className="flex justify-between items-start mb-6 relative">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-2 w-2 rounded-full bg-[#34C759] animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Payment Verified</span>
                            </div>
                            <DialogTitle className="text-2xl font-bold text-white mb-1">Transaction</DialogTitle>
                            <p className="text-emerald-100/50 text-[11px] font-medium tracking-wide">
                                ID: {transaction.id.toUpperCase()}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                                    {isStripe ? 'STRIPE' : 'MANUAL'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2 relative">
                        <span className="text-4xl font-extrabold tracking-tight">€{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span className="text-emerald-300/60 text-lg font-bold">EUR</span>
                    </div>
                </div>

                <div className="p-8 space-y-8 bg-gradient-to-b from-white to-slate-50/50">
                    {/* Payment Method Section - Redesigned */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-1 bg-[#18230F] rounded-full" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#18230F]/40">Payment Details</h4>
                        </div>

                        <div className="group relative">
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:border-emerald-200 hover:shadow-md">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-[#F1F8F1] flex items-center justify-center text-[#18230F] group-hover:scale-110 transition-transform">
                                        {methodDisplay.icon}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#18230F]">{methodDisplay.label}</p>
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            {methodDisplay.sublabel}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Timestamp</p>
                                    <p className="text-[11px] font-bold text-[#18230F]">
                                        {format(new Date(transaction.created_at), "dd MMM, HH:mm")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoicing Section - Premium Grid */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-1 bg-[#18230F] rounded-full" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#18230F]/40">Invoicing Information</h4>
                        </div>

                        <div className="bg-white/50 rounded-2xl border border-slate-100 p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Recipient</p>
                                    <p className="text-sm font-bold text-[#18230F] leading-tight">{billingName}</p>
                                    {clientEmail !== 'N/A' && (
                                        <p className="text-[11px] text-slate-500 truncate font-medium">{clientEmail}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Tax Identifier</p>
                                    <p className="text-sm font-bold text-[#18230F] font-mono tracking-tighter">
                                        {billingNif !== 'N/A' ? billingNif : 'Not provided'}
                                    </p>
                                </div>
                            </div>

                            <Separator className="opacity-50" />

                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Registered Address</p>
                                <div className="flex items-start gap-2 text-[#18230F]">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                    <p className="text-xs font-semibold leading-relaxed">
                                        {billingAddress !== 'N/A' ? billingAddress : 'No address on file'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Accountant Notes Section (Conditiontal) */}
                    {accountantNotes && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-1 bg-amber-500 rounded-full" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#18230F]/40">Accountant Notes</h4>
                            </div>
                            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
                                <p className="text-xs font-semibold text-amber-900 leading-relaxed italic">
                                    "{accountantNotes}"
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer branding */}
                <div className="p-6 bg-[#F1F8F1]/50 flex justify-center items-center">
                    <div className="flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
                        <div className="h-4 w-4 bg-[#18230F] rounded-sm flex items-center justify-center">
                            <span className="text-[8px] font-black text-white">AM</span>
                        </div>
                        <span className="text-[9px] font-bold text-[#18230F] uppercase tracking-widest">Amieira Marina Official Record</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
