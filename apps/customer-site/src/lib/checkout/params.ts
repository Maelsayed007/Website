export type CheckoutMode = 'houseboat' | 'combo' | 'river-cruise';
export type BookingType = 'overnight' | 'day_charter';

export type ParsedCheckoutParams = {
  boatId: string | null;
  offerId: string | null;
  packageId: string | null;
  mode: CheckoutMode;
  from: string | null;
  to: string | null;
  date: string | null;
  time: string | null;
  guests: number;
  adults: number;
  children: number;
  seniors: number;
  selectedExtraIds: string[];
  menuSelectionsRaw: string | null;
  bookingType: BookingType;
};

function parsePositiveInt(value: string | null, fallback: number, min = 0): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
}

export function parseCheckoutParams(
  searchParams: URLSearchParams
): ParsedCheckoutParams {
  const boatId = searchParams.get('boatId');
  const offerId = searchParams.get('offerId');
  const packageId = searchParams.get('packageId');

  const modeParam = searchParams.get('mode');
  const mode: CheckoutMode =
    modeParam === 'combo' || modeParam === 'river-cruise' || modeParam === 'houseboat'
      ? modeParam
      : offerId
        ? 'combo'
        : packageId
          ? 'river-cruise'
          : 'houseboat';

  const bookingTypeParam = searchParams.get('type');
  const bookingType: BookingType =
    bookingTypeParam === 'day_charter' ? 'day_charter' : 'overnight';

  const selectedExtraIds = (searchParams.get('extras') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    boatId,
    offerId,
    packageId,
    mode,
    from: searchParams.get('from'),
    to: searchParams.get('to'),
    date: searchParams.get('date'),
    time: searchParams.get('time'),
    guests: parsePositiveInt(searchParams.get('guests'), 2, 1),
    adults: parsePositiveInt(searchParams.get('adults'), 0, 0),
    children: parsePositiveInt(searchParams.get('children'), 0, 0),
    seniors: parsePositiveInt(searchParams.get('seniors'), 0, 0),
    selectedExtraIds,
    menuSelectionsRaw: searchParams.get('menuSelections'),
    bookingType,
  };
}
