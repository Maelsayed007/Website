import { differenceInCalendarDays, eachDayOfInterval, getDay } from 'date-fns';
import { applyHouseboatRecurringDiscount } from '@/lib/booking-rules';

type BookingType = 'overnight' | 'day_charter';
type Mode = 'houseboat' | 'combo' | 'river-cruise';

type PriceObject = {
  weekday_price?: number;
  weekend_price?: number;
};

type MenuSelection = {
  menuId: string;
  quantity: number;
};

type CheckoutPricingInput = {
  mode: Mode;
  offer: any | null;
  riverCruisePackage: any | null;
  adults: number;
  childrenCount: number;
  seniors: number;
  menuSelections: MenuSelection[];
  allMenus: any[];
  boat: any | null;
  prices: PriceObject[];
  dates: { from: Date; to: Date };
  bookingType: BookingType;
  selectedExtras: string[];
  extras: any[];
};

export function calculateCheckoutPricing(input: CheckoutPricingInput) {
  const {
    mode,
    offer,
    riverCruisePackage,
    adults,
    childrenCount,
    seniors,
    menuSelections,
    allMenus,
    boat,
    prices,
    dates,
    bookingType,
    selectedExtras,
    extras,
  } = input;

  if (mode === 'river-cruise' && riverCruisePackage) {
    let total = 0;
    const p = riverCruisePackage.pricing;

    if (offer?.use_manual_pricing) {
      total =
        adults * (offer.manual_adult_price || 0) +
        childrenCount * (offer.manual_child_price || 0) +
        seniors * (offer.manual_senior_price || 0);
    } else if (p?.type === 'exclusive') {
      total = p?.totalPrice || 0;
    } else {
      const aPrice = p?.adults?.withoutFood || 0;
      const cPrice = p?.children?.withoutFood || 0;
      const sPrice = p?.seniors?.withoutFood || 0;
      total = adults * aPrice + childrenCount * cPrice + seniors * sPrice;
    }

    let menuTotal = 0;
    if (!offer?.use_manual_pricing) {
      menuSelections.forEach((sel) => {
        const menu = allMenus.find((m) => m.id === sel.menuId);
        if (menu) {
          menuTotal += sel.quantity * menu.price_adult;
        }
      });
    }

    if (!offer?.use_manual_pricing) {
      total += menuTotal;
    }

    if (!offer?.use_manual_pricing && offer && (offer.discount_value || 0) > 0) {
      if (offer.discount_type === 'percentage') {
        total = total * (1 - (offer.discount_value || 0) / 100);
      } else {
        total = Math.max(0, total - (offer.discount_value || 0));
      }
    }

    return {
      weekdayNights: 0,
      weekdayPrice: 0,
      weekendNights: 0,
      weekendPrice: 0,
      preparationFee: 0,
      extrasTotal: 0,
      total,
      deposit: Math.ceil(total * 0.3),
      adults,
      children: childrenCount,
      seniors,
      riverCruisePackage,
      menuSelections,
      allMenus,
    };
  }

  if (mode === 'combo' && offer) {
    const pAdult = offer.manual_adult_price || 0;
    const pChild = offer.manual_child_price || 0;
    const pSenior = offer.manual_senior_price || 0;
    const total = adults * pAdult + childrenCount * pChild + seniors * pSenior;

    return {
      weekdayNights: 0,
      weekdayPrice: 0,
      weekendNights: 0,
      weekendPrice: 0,
      preparationFee: 0,
      extrasTotal: 0,
      total,
      deposit: Math.ceil(total * 0.3),
      adults,
      children: childrenCount,
      seniors,
      perPersonBreakdown: {
        adults: { count: adults, price: pAdult },
        children: { count: childrenCount, price: pChild },
        seniors: { count: seniors, price: pSenior },
      },
    };
  }

  if (!boat) {
    return {
      weekdayNights: 0,
      weekdayPrice: 0,
      weekendNights: 0,
      weekendPrice: 0,
      preparationFee: 0,
      extrasTotal: 0,
      total: 0,
      deposit: 0,
    };
  }

  const priceObj = prices[0] || { weekday_price: 150, weekend_price: 150 };
  const nights = Math.max(0, differenceInCalendarDays(dates.to, dates.from));

  let weekdayCount = 0;
  let weekendCount = 0;
  let baseTotal = 0;
  let preparationFee = 76;
  let recurringDiscountPercent = 0;
  let recurringDiscountAmount = 0;

  if (bookingType === 'day_charter') {
    baseTotal = boat.diaria_price || 0;
    preparationFee = 0;
  } else if (nights > 0) {
    eachDayOfInterval({ start: dates.from, end: dates.to })
      .slice(0, -1)
      .forEach((d) => {
        const day = getDay(d);
        if (day === 5 || day === 6) {
          weekendCount++;
        } else {
          weekdayCount++;
        }
      });
    baseTotal = weekdayCount * (priceObj.weekday_price || 0) + weekendCount * (priceObj.weekend_price || 0);
  }

  let extrasTotal = 0;
  selectedExtras.forEach((id) => {
    const extra = extras.find((e) => e.id === id);
    if (!extra) return;
    const extraNights = bookingType === 'day_charter' ? 1 : nights;
    const cost = extra.price_type === 'per_day' ? extra.price * extraNights : extra.price;
    extrasTotal += cost;
  });

  if (bookingType === 'overnight') {
    const recurring = applyHouseboatRecurringDiscount({
      bookingType,
      baseOvernightPrice: baseTotal,
      bookingDate: new Date(),
      checkInDate: dates.from,
      guests: adults + childrenCount + seniors,
      nights,
    });
    recurringDiscountPercent = recurring.discountPercent;
    recurringDiscountAmount = recurring.discountAmount;
    baseTotal = recurring.discountedBasePrice;
  }

  const total = baseTotal + preparationFee + extrasTotal;

  return {
    weekdayNights: weekdayCount,
    weekdayPrice: priceObj.weekday_price,
    weekendNights: weekendCount,
    weekendPrice: priceObj.weekend_price,
    preparationFee,
    extrasTotal,
    recurringDiscountPercent,
    recurringDiscountAmount,
    total,
    deposit: Math.ceil(total * 0.3),
  };
}

export function mapSelectedExtras(selectedExtras: string[], extras: any[]) {
  return selectedExtras
    .map((id) => {
      const extra = extras.find((e) => e.id === id);
      return extra ? { ...extra, quantity: 1 } : null;
    })
    .filter(Boolean);
}
