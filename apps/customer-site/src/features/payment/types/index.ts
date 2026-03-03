export type PaymentViewStatus = 'loading' | 'valid' | 'invalid' | 'success' | 'verifying';

export type PaymentBookingSummary = {
  id: string;
  clientName: string;
  clientEmail?: string;
  serviceType: string;
  startDate: string;
  endDate?: string;
  amountDue: number;
  currency: string;
};

export type PaymentMessageState = {
  type: 'error' | 'success' | null;
  text: string;
};

export type BillingInfo = {
  name: string;
  nif: string;
  address: string;
  email: string;
};
