'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  Loader2,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/components/app-layout';
import { usePaymentLinkStateMachine } from '@/features/payment';
import { PaymentLoadingSkeleton } from '@/components/loading/public-page-skeletons';

export default function PaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { websiteSettings } = useAppContext();

  const token = params?.token as string | undefined;
  const sessionId = searchParams.get('session_id');
  const successParam = searchParams.get('success');
  const canceledParam = searchParams.get('canceled');

  const {
    status,
    booking,
    message,
    needsInvoice,
    billingInfo,
    processing,
    requestingLink,
    amountDisplay,
    setNeedsInvoice,
    setBillingInfo,
    isFormValid,
    handlePayment,
    handleRequestNewLink,
  } = usePaymentLinkStateMachine({
    token,
    sessionId,
    successParam,
    canceledParam,
  });

  if (status === 'loading') {
    return <PaymentLoadingSkeleton />;
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="bg-white border border-[#18230F]/10 rounded-lg p-8 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="text-lg font-semibold text-[#18230F] mb-2">Link expired or invalid</h1>
            <p className="text-sm text-[#18230F]/60">
              {message.text || 'This payment link is no longer active.'}
            </p>

            <div className="border-t border-[#18230F]/5 pt-6 mt-6">
              <p className="text-xs text-[#18230F]/40 mb-4">Need a new payment link?</p>
              <form onSubmit={handleRequestNewLink} className="space-y-3">
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="your@email.com"
                  className="w-full h-10 px-3 text-sm border border-[#18230F]/10 rounded-lg bg-[#FAFAFA] focus:border-[#18230F]/30 focus:ring-0 transition-colors placeholder:text-[#18230F]/30"
                />
                <button
                  type="submit"
                  disabled={requestingLink}
                  className="cta-shimmer w-full h-10 text-white text-sm font-medium rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {requestingLink ? 'Requesting...' : 'Request New Link'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'verifying') {
    return <PaymentLoadingSkeleton />;
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white border border-[#18230F]/10 rounded-lg p-8 text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <h1 className="text-xl font-semibold text-[#18230F] mb-2">Payment successful</h1>
            <p className="text-sm text-[#18230F]/60">
              Your reservation is confirmed. A receipt has been sent to your email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center py-8 px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex justify-center">
          {websiteSettings?.logoUrl ? (
            <Image
              src={websiteSettings.logoUrl}
              alt={websiteSettings?.companyName || 'Logo'}
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <span className="text-lg font-semibold text-[#18230F]">
              {websiteSettings?.companyName || 'AMIEIRA MARINA'}
            </span>
          )}
        </div>

        <div className="bg-white border border-[#18230F]/10 rounded-lg overflow-hidden">
          <div className="bg-[#18230F] text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">
                Total Due
              </span>
              <div className="flex items-center gap-1 text-[10px] text-white/50">
                <Shield className="h-3 w-3" />
                <span>Secure Payment</span>
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight">EUR {amountDisplay}</div>
            <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Service</span>
                <span className="font-medium">{booking?.serviceType}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Dates</span>
                <span className="font-medium">
                  {booking?.startDate
                    ? format(new Date(booking.startDate), 'dd MMM yyyy')
                    : ''}
                  {booking?.endDate
                    ? ` - ${format(new Date(booking.endDate), 'dd MMM yyyy')}`
                    : ''}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Client</span>
                <span className="font-medium">{booking?.clientName}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handlePayment} className="p-6 space-y-5">
            {message.type && (
              <div
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm',
                  message.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                )}
              >
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#18230F]/70 mb-1.5">
                Email for Receipt <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="email"
                value={billingInfo.email}
                onChange={(e) => setBillingInfo({ ...billingInfo, email: e.target.value })}
                className="w-full h-10 px-3 text-sm border border-[#18230F]/10 rounded-lg bg-[#FAFAFA] focus:border-[#18230F]/30 focus:ring-0 transition-colors placeholder:text-[#18230F]/30"
                placeholder="your@email.com"
              />
            </div>

            <div
              className={cn(
                'border rounded-lg p-4 cursor-pointer transition-colors',
                needsInvoice
                  ? 'border-[#18230F]/30 bg-[#18230F]/[0.02]'
                  : 'border-[#18230F]/10 hover:border-[#18230F]/20'
              )}
              onClick={() => setNeedsInvoice(!needsInvoice)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={needsInvoice}
                  onChange={(event) => setNeedsInvoice(event.target.checked)}
                  onClick={(event) => event.stopPropagation()}
                  className="h-4 w-4 rounded border-[#18230F]/20 text-[#18230F] focus:ring-0 focus:ring-offset-0"
                />
                <div>
                  <p className="text-sm font-medium text-[#18230F]">I need an invoice (Fatura)</p>
                  <p className="text-xs text-[#18230F]/50">With NIF and billing address</p>
                </div>
              </div>

              {needsInvoice && (
                <div
                  className="mt-4 pt-4 border-t border-[#18230F]/10 space-y-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div>
                    <label className="block text-xs font-medium text-[#18230F]/70 mb-1">
                      Full Name / Company <span className="text-red-400">*</span>
                    </label>
                    <input
                      required={needsInvoice}
                      type="text"
                      value={billingInfo.name}
                      onChange={(e) => setBillingInfo({ ...billingInfo, name: e.target.value })}
                      className="w-full h-9 px-3 text-sm border border-[#18230F]/10 rounded-lg bg-white focus:border-[#18230F]/30 focus:ring-0 transition-colors"
                      placeholder="Joao Silva or Company Lda"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#18230F]/70 mb-1">
                        NIF / Tax ID <span className="text-red-400">*</span>
                      </label>
                      <input
                        required={needsInvoice}
                        type="text"
                        value={billingInfo.nif}
                        onChange={(e) => setBillingInfo({ ...billingInfo, nif: e.target.value })}
                        className="w-full h-9 px-3 text-sm border border-[#18230F]/10 rounded-lg bg-white focus:border-[#18230F]/30 focus:ring-0 transition-colors font-mono"
                        placeholder="123456789"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#18230F]/70 mb-1">
                        Billing Address <span className="text-red-400">*</span>
                      </label>
                      <input
                        required={needsInvoice}
                        type="text"
                        value={billingInfo.address}
                        onChange={(e) =>
                          setBillingInfo({ ...billingInfo, address: e.target.value })
                        }
                        className="w-full h-9 px-3 text-sm border border-[#18230F]/10 rounded-lg bg-white focus:border-[#18230F]/30 focus:ring-0 transition-colors"
                        placeholder="Rua Principal 123, Lisboa"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={processing || !isFormValid()}
              className="cta-shimmer w-full h-11 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pay EUR {amountDisplay}
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-[#18230F]/40">
              You will choose your payment method on the next screen.
            </p>
          </form>
        </div>

        <p className="text-center text-[10px] text-[#18230F]/30 font-medium uppercase tracking-wider">
          Amieira Marina - Portugal
        </p>
      </div>
    </div>
  );
}
