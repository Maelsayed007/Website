import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type {
  BillingInfo,
  PaymentBookingSummary,
  PaymentMessageState,
  PaymentViewStatus,
} from '@/features/payment/types';

type UsePaymentLinkStateMachineArgs = {
  token?: string;
  sessionId: string | null;
  successParam: string | null;
  canceledParam: string | null;
};

export function usePaymentLinkStateMachine({
  token,
  sessionId,
  successParam,
  canceledParam,
}: UsePaymentLinkStateMachineArgs) {
  const { toast } = useToast();
  const [status, setStatus] = useState<PaymentViewStatus>('loading');
  const [booking, setBooking] = useState<PaymentBookingSummary | null>(null);
  const [message, setMessage] = useState<PaymentMessageState>({ type: null, text: '' });
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    name: '',
    nif: '',
    address: '',
    email: '',
  });
  const [processing, setProcessing] = useState(false);
  const [requestingLink, setRequestingLink] = useState(false);

  const amountDisplay = useMemo(() => {
    if (!booking) return '0.00';
    return booking.amountDue.toFixed(2);
  }, [booking]);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setMessage({ type: 'error', text: 'Missing payment token.' });
      return;
    }

    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      setStatus('invalid');
      setMessage({
        type: 'error',
        text: 'Loading timed out. Please refresh and try again.',
      });
    }, 10000);

    const run = async () => {
      try {
        const response = await fetch(`/api/payments/link/validate?token=${encodeURIComponent(token)}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (timedOut) return;
        clearTimeout(timeout);

        if (!response.ok || data.error) {
          setStatus('invalid');
          setMessage({
            type: 'error',
            text: data.error || 'This payment link is no longer active.',
          });
          return;
        }

        setBooking(data.booking);
        setBillingInfo((prev) => ({
          ...prev,
          name: data.booking.clientName || '',
          email: data.booking.clientEmail || '',
        }));
        setStatus('valid');
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        clearTimeout(timeout);
        setStatus('invalid');
        setMessage({
          type: 'error',
          text: 'Failed to validate this payment link. Please try again.',
        });
      }
    };

    run();
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    if (canceledParam) {
      setMessage({ type: 'error', text: 'Payment was canceled.' });
      toast({
        variant: 'destructive',
        title: 'Payment canceled',
        description: 'No payment was captured.',
      });
      return;
    }

    if (!(successParam && sessionId)) return;

    const verify = async () => {
      setStatus('verifying');
      try {
        const response = await fetch('/api/payments/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, token }),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          setStatus('invalid');
          setMessage({
            type: 'error',
            text: data.error || 'Payment verification failed.',
          });
          return;
        }

        setStatus('success');
        setMessage({
          type: 'success',
          text: 'Payment verified successfully.',
        });
      } catch {
        setStatus('invalid');
        setMessage({
          type: 'error',
          text: 'Failed to verify payment. Please contact support.',
        });
      }
    };

    verify();
  }, [canceledParam, sessionId, successParam, toast, token]);

  const isFormValid = () => {
    if (!billingInfo.email) return false;
    if (needsInvoice && (!billingInfo.name || !billingInfo.nif || !billingInfo.address)) {
      return false;
    }
    return true;
  };

  const handlePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setProcessing(true);
    setMessage({ type: null, text: '' });
    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          billingInfo: needsInvoice ? billingInfo : null,
          email: billingInfo.email,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        const errorText = data.error || 'Failed to initialize payment.';
        setMessage({ type: 'error', text: errorText });
        toast({
          variant: 'destructive',
          title: 'Payment initialization failed',
          description: errorText,
        });
        setProcessing(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      const errorText = 'Something went wrong. Please try again.';
      setMessage({ type: 'error', text: errorText });
      toast({
        variant: 'destructive',
        title: 'Payment initialization failed',
        description: errorText,
      });
      setProcessing(false);
    }
  };

  const handleRequestNewLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim();
    if (!email) return;

    setRequestingLink(true);
    try {
      const response = await fetch('/api/payments/request-new-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      });
      if (!response.ok) {
        throw new Error('Failed to send request.');
      }

      setMessage({
        type: 'success',
        text: 'Request sent. Our team will contact you shortly.',
      });
      toast({
        title: 'Request sent',
        description: 'Our team will contact you shortly.',
      });
      event.currentTarget.reset();
    } catch (error: any) {
      const errorText = error?.message || 'Error sending request.';
      setMessage({ type: 'error', text: errorText });
      toast({
        variant: 'destructive',
        title: 'Request failed',
        description: errorText,
      });
    } finally {
      setRequestingLink(false);
    }
  };

  return {
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
  };
}

