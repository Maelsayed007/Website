import { useMemo } from 'react';
import { calculateCheckoutPricing, mapSelectedExtras } from '@/features/checkout/lib/pricing';

type UseCheckoutPricingContractInput = {
  mode: 'houseboat' | 'combo' | 'river-cruise';
  offer: any | null;
  riverCruisePackage: any | null;
  adults: number;
  childrenCount: number;
  seniors: number;
  menuSelections: any[];
  allMenus: any[];
  boat: any | null;
  prices: any[];
  dates: { from: Date; to: Date };
  bookingType: 'overnight' | 'day_charter';
  selectedExtras: string[];
  extras: any[];
};

export function useCheckoutPricingContract(input: UseCheckoutPricingContractInput) {
  const priceBreakdown = useMemo(
    () =>
      calculateCheckoutPricing({
        ...input,
      }),
    [input]
  );

  const selectedExtrasList = useMemo(() => mapSelectedExtras(input.selectedExtras, input.extras), [input]);

  return {
    priceBreakdown,
    selectedExtrasList,
  };
}
