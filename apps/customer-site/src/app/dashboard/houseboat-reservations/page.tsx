'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  UIEvent as ReactUIEvent,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  addYears,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
  subYears,
} from 'date-fns';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  ListFilter,
  Loader2,
  Plus,
  Search,
  Settings2,
} from 'lucide-react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { Booking } from '@/lib/types';
import {
  BOAT_COL_WIDTH,
  HORIZONTAL_DAY_WIDTH,
  SLOT_WIDTH,
  SOURCE_OPTIONS,
  bookingOverlapsRange,
  buildRangeCalendarData,
  processBookingsForGrid,
} from '@/features/dashboard/houseboat-reservations/calendar-utils';
import type { MappedBooking } from '@/features/dashboard/houseboat-reservations/types';
import { useHouseboatReservationsData } from '@/features/dashboard/houseboat-reservations/use-houseboat-reservations-data';
import { CalendarGrid } from '@/features/dashboard/houseboat-reservations/calendar-grid';

const Customer360View = dynamic(
  () => import('@/components/customer-360-view').then((m) => m.Customer360View),
  { ssr: false }
);

const QuickPreviewDrawer = dynamic(
  () => import('@/features/dashboard/houseboat-reservations/quick-preview-drawer').then((m) => m.QuickPreviewDrawer),
  { ssr: false }
);

const BookingFormSheet = dynamic(
  () => import('@/features/dashboard/houseboat-reservations/booking-form-sheet').then((m) => m.BookingFormSheet),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading reservation form...
      </div>
    ),
  }
);

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Maintenance', 'Cancelled'];

type CalendarScrollState = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type GridCellPosition = {
  boatIndex: number;
  slotIndex: number;
};

function parseYearParam(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 2000 || parsed > 2100) return null;
  return parsed;
}

function parseCsvParam(value: string | null) {
  if (!value) return [];
  return value
    .split(',')
    .map((piece) => piece.trim())
    .filter(Boolean);
}

function preloadBookingForm() {
  void import('@/features/dashboard/houseboat-reservations/booking-form-sheet');
}

type FilterRailProps = {
  collapsed: boolean;
  modelCount: number;
  selectedModels: string[];
  selectedStatuses: string[];
  selectedSources: string[];
  onToggleCollapsed?: () => void;
  onToggleModel: (modelId: string, checked: boolean) => void;
  onToggleStatus: (status: string, checked: boolean) => void;
  onToggleSource: (sourceId: string, checked: boolean) => void;
  onReset: () => void;
  models: Array<{ id: string; name: string }>;
};

function FilterRail({
  collapsed,
  modelCount,
  selectedModels,
  selectedStatuses,
  selectedSources,
  onToggleCollapsed,
  onToggleModel,
  onToggleStatus,
  onToggleSource,
  onReset,
  models,
}: FilterRailProps) {
  const activeCount = selectedModels.length + selectedStatuses.length + selectedSources.length;
  const isInlinePanel = !onToggleCollapsed;

  return (
    <div
      className={cn(
        isInlinePanel
          ? 'bg-card'
          : 'border-r border-border bg-card transition-[width] duration-200',
        isInlinePanel ? 'w-full' : collapsed ? 'w-16' : 'w-72'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-3 py-3">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Filters</p>
              {activeCount > 0 ? (
                <Badge variant="secondary" className="h-5 rounded-full bg-muted px-2 text-xs text-foreground">
                  {activeCount}
                </Badge>
              ) : null}
            </div>
          ) : (
            <div className="mx-auto rounded-full border border-border bg-muted p-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {onToggleCollapsed ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onToggleCollapsed}
              title={collapsed ? 'Expand filter rail' : 'Collapse filter rail'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          ) : null}
        </div>

        {!collapsed ? (
          <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-4">
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model</p>
              {models.slice(0, 20).map((model) => (
                <label key={model.id} className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={selectedModels.includes(model.id)}
                    onCheckedChange={(checked) => onToggleModel(model.id, Boolean(checked))}
                  />
                  <span className="truncate">{model.name}</span>
                </label>
              ))}
              {modelCount > 20 ? (
                <p className="text-xs text-muted-foreground">{modelCount - 20} more models available</p>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
              {STATUS_OPTIONS.map((status) => (
                <label key={status} className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={(checked) => onToggleStatus(status, Boolean(checked))}
                  />
                  <span>{status}</span>
                </label>
              ))}
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</p>
              {SOURCE_OPTIONS.map((source) => (
                <label key={source.id} className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={selectedSources.includes(source.id)}
                    onCheckedChange={(checked) => onToggleSource(source.id, Boolean(checked))}
                  />
                  <span>{source.name}</span>
                </label>
              ))}
            </div>

            {activeCount > 0 ? (
              <Button variant="outline" className="h-10 w-full rounded-xl" onClick={onReset}>
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function HouseboatReservationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const searchParams = useSearchParams();
  const initialYear = parseYearParam(searchParams.get('year'));
  const [currentDate, setCurrentDate] = useState(
    () => (initialYear ? new Date(initialYear, 0, 1) : new Date())
  );
  const [localSearchTerm, setLocalSearchTerm] = useState(() => searchParams.get('q') || '');
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [selectedModels, setSelectedModels] = useState<string[]>(
    () => parseCsvParam(searchParams.get('models'))
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    () => parseCsvParam(searchParams.get('statuses'))
  );
  const [selectedSources, setSelectedSources] = useState<string[]>(
    () => parseCsvParam(searchParams.get('sources'))
  );

  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [isBookingFormDirty, setIsBookingFormDirty] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [preselectedBoatId, setPreselectedBoatId] = useState<string | undefined>();
  const [preselectedDate, setPreselectedDate] = useState<Date | undefined>();
  const [preselectedSlot, setPreselectedSlot] = useState<'AM' | 'PM' | undefined>();
  const [preselectedEndDate, setPreselectedEndDate] = useState<Date | undefined>();
  const [preselectedEndSlot, setPreselectedEndSlot] = useState<'AM' | 'PM' | undefined>();

  const [previewBooking, setPreviewBooking] = useState<MappedBooking | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedBookingFor360, setSelectedBookingFor360] = useState<MappedBooking | null>(null);
  const [is360DialogOpen, setIs360DialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState<MappedBooking | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [dragStart, setDragStart] = useState<{ boatId: string; date: Date; slot: 'AM' | 'PM' } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ boatId: string; date: Date; slot: 'AM' | 'PM' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [keyboardCell, setKeyboardCell] = useState<GridCellPosition | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const firstPaintMeasuredRef = useRef(false);
  const bookingSheetOpenRef = useRef(false);
  const [scrollState, setScrollState] = useState<CalendarScrollState>({ left: 0, top: 0, width: 0, height: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  useEffect(() => {
    const queryYear = parseYearParam(searchParams.get('year'));
    if (queryYear) {
      setCurrentDate((prev) => (prev.getFullYear() === queryYear ? prev : new Date(queryYear, 0, 1)));
    }

    const querySearch = searchParams.get('q') || '';
    setLocalSearchTerm((prev) => (prev === querySearch ? prev : querySearch));
    setSearchTerm((prev) => (prev === querySearch ? prev : querySearch));

    const queryModels = parseCsvParam(searchParams.get('models'));
    setSelectedModels((prev) => (queryModels.join(',') === prev.join(',') ? prev : queryModels));

    const queryStatuses = parseCsvParam(searchParams.get('statuses'));
    setSelectedStatuses((prev) => (queryStatuses.join(',') === prev.join(',') ? prev : queryStatuses));

    const querySources = parseCsvParam(searchParams.get('sources'));
    setSelectedSources((prev) => (querySources.join(',') === prev.join(',') ? prev : querySources));
  }, [searchParams]);

  useEffect(() => {
    if (!pathname) return;
    const nextParams = new URLSearchParams();
    nextParams.set('year', String(currentDate.getFullYear()));
    if (searchTerm.trim()) nextParams.set('q', searchTerm.trim());
    if (selectedModels.length > 0) nextParams.set('models', selectedModels.join(','));
    if (selectedStatuses.length > 0) nextParams.set('statuses', selectedStatuses.join(','));
    if (selectedSources.length > 0) nextParams.set('sources', selectedSources.join(','));

    const nextQuery = nextParams.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [
    router,
    pathname,
    searchParams,
    currentDate,
    searchTerm,
    selectedModels,
    selectedStatuses,
    selectedSources,
  ]);

  useEffect(() => {
    if (typeof performance === 'undefined') return;
    performance.mark('hb-calendar:first-paint:start');
  }, []);

  const { range, days, months } = useMemo(() => buildRangeCalendarData(currentDate, 'year'), [currentDate]);

  const { houseboatModels, boats, bookings, prices, tariffs, availableExtras, isLoading, errorMessage, refresh } =
    useHouseboatReservationsData({
      supabase,
      toast,
      range,
      selectedModels,
      selectedStatuses,
      selectedSources,
      searchTerm,
    });

  const boatNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const boat of boats) {
      map.set(boat.id, boat.name);
    }
    return map;
  }, [boats]);

  const getBoatName = useCallback(
    (id: string | undefined) => {
      if (!id) return 'Unknown';
      return boatNameById.get(id) || 'Unknown';
    },
    [boatNameById]
  );

  const modelNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const model of houseboatModels) {
      map.set(model.id, model.name);
    }
    return map;
  }, [houseboatModels]);

  const { groupedBoats, boatAliasMap } = useMemo(() => {
    const byName = new Map<
      string,
      { id: string; name: string; model_id?: string; aliasIds: string[] }
    >();
    for (const boat of boats) {
      const nameKey = boat.name.trim().toLowerCase();
      const existing = byName.get(nameKey);
      if (!existing) {
        byName.set(nameKey, {
          id: boat.id,
          name: boat.name,
          model_id: boat.model_id,
          aliasIds: [boat.id],
        });
        continue;
      }
      existing.aliasIds.push(boat.id);
      if (!existing.model_id && boat.model_id) {
        existing.model_id = boat.model_id;
      }
    }

    const aliasMap = new Map<string, string>();
    for (const item of byName.values()) {
      for (const aliasId of item.aliasIds) {
        aliasMap.set(aliasId, item.id);
      }
    }

    return {
      groupedBoats: Array.from(byName.values()).map((item) => ({
        id: item.id,
        name: item.name,
        model_id: item.model_id,
      })),
      boatAliasMap: aliasMap,
    };
  }, [boats]);

  const normalizedBookings = useMemo(
    () =>
      bookings.map((booking) => ({
        ...booking,
        houseboatId: booking.houseboatId ? boatAliasMap.get(booking.houseboatId) || booking.houseboatId : booking.houseboatId,
      })),
    [bookings, boatAliasMap]
  );

  const bookingSearchTextByBoatId = useMemo(() => {
    const map = new Map<string, string>();
    for (const booking of normalizedBookings) {
      if (!booking.houseboatId) continue;
      const piece = `${booking.clientName || ''} ${booking.clientEmail || ''} ${booking.id}`.toLowerCase();
      const current = map.get(booking.houseboatId);
      map.set(booking.houseboatId, current ? `${current} ${piece}` : piece);
    }
    return map;
  }, [normalizedBookings]);

  const filteredBoats = useMemo(() => {
    let result = groupedBoats;

    if (selectedModels.length > 0) {
      result = result.filter((boat) => boat.model_id && selectedModels.includes(boat.model_id));
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter((boat) => {
        const boatMatch = boat.name.toLowerCase().includes(query);
        const bookingMatch = (bookingSearchTextByBoatId.get(boat.id) || '').includes(query);
        return boatMatch || bookingMatch;
      });
    }

    return [...result].sort((a, b) => {
      const modelA = a.model_id ? modelNameById.get(a.model_id) || '' : '';
      const modelB = b.model_id ? modelNameById.get(b.model_id) || '' : '';
      const aMissingModel = modelA.length === 0;
      const bMissingModel = modelB.length === 0;

      if (aMissingModel !== bMissingModel) {
        return aMissingModel ? 1 : -1;
      }

      const modelComparison = modelA.localeCompare(modelB, undefined, { sensitivity: 'base', numeric: true });
      if (modelComparison !== 0) {
        return modelComparison;
      }

      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    });
  }, [groupedBoats, selectedModels, searchTerm, bookingSearchTextByBoatId, modelNameById]);

  const filteredBoatIndexById = useMemo(() => {
    const map = new Map<string, number>();
    filteredBoats.forEach((boat, index) => {
      map.set(boat.id, index);
    });
    return map;
  }, [filteredBoats]);

  const rowHeight = useMemo(() => {
    if (filteredBoats.length === 0) return 34;
    const viewportHeight = scrollState.height > 0 ? scrollState.height : typeof window !== 'undefined' ? window.innerHeight : 900;
    const chromeHeight = 188;
    const candidate = Math.floor((viewportHeight - chromeHeight) / Math.max(filteredBoats.length, 1));
    return Math.max(28, Math.min(candidate, 42));
  }, [filteredBoats.length, scrollState.height]);

  const processedBookings = useMemo(
    () =>
      processBookingsForGrid({
        bookings: normalizedBookings,
        boats: filteredBoats,
        range,
        rowHeight,
      }),
    [normalizedBookings, filteredBoats, range, rowHeight]
  );

  const totalDaysWidth = days.length * HORIZONTAL_DAY_WIDTH;
  const totalGridWidth = BOAT_COL_WIDTH + totalDaysWidth;

  const isLowPowerDevice = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const cores = navigator.hardwareConcurrency || 8;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8;
    return cores <= 4 || memory <= 4;
  }, []);

  const dayOverscan = isLowPowerDevice ? 2 : 4;
  const rowOverscan = isLowPowerDevice ? 4 : 8;
  const dayViewportWidth = Math.max(0, scrollState.width - BOAT_COL_WIDTH);
  const dayStartIndex =
    scrollState.width > 0 ? Math.max(0, Math.floor(scrollState.left / HORIZONTAL_DAY_WIDTH) - dayOverscan) : 0;
  const dayEndIndex =
    scrollState.width > 0
      ? Math.min(days.length - 1, Math.ceil((scrollState.left + dayViewportWidth) / HORIZONTAL_DAY_WIDTH) + dayOverscan)
      : Math.max(days.length - 1, 0);
  const dayStartSlotIndex = dayStartIndex * 2;
  const dayEndSlotIndex = Math.max(dayStartSlotIndex, (dayEndIndex + 1) * 2 - 1);

  const visibleDays = useMemo(() => days.slice(dayStartIndex, dayEndIndex + 1), [days, dayStartIndex, dayEndIndex]);
  const leftDayPadding = dayStartIndex * HORIZONTAL_DAY_WIDTH;
  const rightDayPadding = Math.max(0, (days.length - dayEndIndex - 1) * HORIZONTAL_DAY_WIDTH);

  const headerHeight = 92;
  const bodyScrollTop = Math.max(0, scrollState.top - headerHeight);
  const bodyViewportHeight = Math.max(0, scrollState.height - headerHeight);

  const rowStartIndex =
    scrollState.height > 0 ? Math.max(0, Math.floor(bodyScrollTop / rowHeight) - rowOverscan) : 0;
  const rowEndIndex =
    scrollState.height > 0
      ? Math.min(filteredBoats.length - 1, Math.ceil((bodyScrollTop + bodyViewportHeight) / rowHeight) + rowOverscan)
      : Math.max(filteredBoats.length - 1, 0);
  const visibleBoats = useMemo(
    () => filteredBoats.slice(rowStartIndex, rowEndIndex + 1),
    [filteredBoats, rowStartIndex, rowEndIndex]
  );

  const visibleSlotStart = dayStartSlotIndex;
  const visibleSlotEnd = dayEndSlotIndex;
  const visibleProcessedBookings = useMemo(
    () =>
      processedBookings.filter(
        (booking) =>
          booking.boatIndex >= rowStartIndex &&
          booking.boatIndex <= rowEndIndex &&
          booking.endSlotIndex >= visibleSlotStart &&
          booking.startSlotIndex <= visibleSlotEnd
      ),
    [processedBookings, rowStartIndex, rowEndIndex, visibleSlotStart, visibleSlotEnd]
  );

  useEffect(() => {
    if (filteredBoats.length === 0 || days.length === 0) {
      setKeyboardCell(null);
      return;
    }
    setKeyboardCell((prev) => {
      if (!prev) return prev;
      const maxBoatIndex = filteredBoats.length - 1;
      const maxSlotIndex = days.length * 2 - 1;
      const nextBoat = Math.min(Math.max(prev.boatIndex, 0), maxBoatIndex);
      const nextSlot = Math.min(Math.max(prev.slotIndex, 0), maxSlotIndex);
      if (nextBoat === prev.boatIndex && nextSlot === prev.slotIndex) return prev;
      return { boatIndex: nextBoat, slotIndex: nextSlot };
    });
  }, [filteredBoats.length, days.length]);

  const activeCellStyle = useMemo(() => {
    if (!keyboardCell) return null;
    return {
      left: keyboardCell.slotIndex * SLOT_WIDTH + 1,
      width: Math.max(SLOT_WIDTH - 2, 10),
      top: keyboardCell.boatIndex * rowHeight + 4,
      height: Math.max(rowHeight - 10, 22),
    };
  }, [keyboardCell, rowHeight]);

  const monthSegments = useMemo(
    () =>
      months
        .map((month) => {
          const monthStartIndex = differenceInCalendarDays(month, range.start);
          const monthEndIndex = differenceInCalendarDays(
            new Date(month.getFullYear(), month.getMonth() + 1, 0),
            range.start
          );
          const monthVisibleDays = Math.max(
            0,
            Math.min(days.length - 1, monthEndIndex) - Math.max(0, monthStartIndex) + 1
          );
          if (monthVisibleDays <= 0) return null;
          return {
            key: month.toISOString(),
            label: format(month, 'MMMM'),
            width: monthVisibleDays * HORIZONTAL_DAY_WIDTH,
          };
        })
        .filter((value): value is { key: string; label: string; width: number } => Boolean(value)),
    [months, range.start, days.length]
  );

  const todayKey = startOfDay(new Date()).getTime();

  const dragPreviewStyle = useMemo(() => {
    if (!dragStart || !dragCurrent) return null;
    const startDateTime = new Date(dragStart.date);
    startDateTime.setHours(dragStart.slot === 'AM' ? 10 : 15, 0, 0, 0);
    const endDateTime = new Date(dragCurrent.date);
    endDateTime.setHours(dragCurrent.slot === 'AM' ? 10 : 15, 0, 0, 0);
    const isBackward = endDateTime < startDateTime;
    const visualStart = isBackward ? endDateTime : startDateTime;
    const visualEnd = isBackward ? startDateTime : endDateTime;

    const startDayOffset = differenceInCalendarDays(visualStart, range.start);
    let startSlotIndex = startDayOffset * 2 + (visualStart.getHours() >= 12 ? 1 : 0);

    const endDayOffset = differenceInCalendarDays(visualEnd, range.start);
    let endSlotIndex = endDayOffset * 2 + (visualEnd.getHours() >= 12 ? 1 : 0);

    startSlotIndex = Math.max(0, startSlotIndex);
    endSlotIndex = Math.max(startSlotIndex, endSlotIndex);

    const boatIndex = filteredBoatIndexById.get(dragStart.boatId);
    if (boatIndex === undefined) return null;

    return {
      left: startSlotIndex * SLOT_WIDTH + 1,
      width: (endSlotIndex - startSlotIndex + 1) * SLOT_WIDTH - 2,
      top: boatIndex * rowHeight + 3,
      height: Math.max(rowHeight - 6, 24),
    };
  }, [dragStart, dragCurrent, filteredBoatIndexById, range.start, rowHeight]);

  const filterCount = selectedModels.length + selectedStatuses.length + selectedSources.length;

  const handleGridScroll = useCallback((event: ReactUIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const nextLeft = target.scrollLeft;
    const nextTop = target.scrollTop;

    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      setScrollState((prev) => {
        if (prev.left === nextLeft && prev.top === nextTop) return prev;
        return {
          ...prev,
          left: nextLeft,
          top: nextTop,
        };
      });
      scrollFrameRef.current = null;
    });
  }, []);

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateSize = () => {
      setScrollState((prev) => ({
        ...prev,
        width: container.clientWidth,
        height: container.clientHeight,
      }));
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateSize);
      observer.observe(container);
    }

    return () => {
      window.removeEventListener('resize', updateSize);
      observer?.disconnect();
    };
  }, []);

  const scrollToDate = useCallback(
    (date: Date) => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const dayIndex = differenceInCalendarDays(startOfDay(date), startOfDay(range.start));
      if (dayIndex < 0) return;
      const targetLeft = Math.max(0, dayIndex * HORIZONTAL_DAY_WIDTH - 120);
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    },
    [range.start]
  );

  const navigateRange = useCallback(
    (direction: 'prev' | 'next') => {
      const next = direction === 'next';
      setCurrentDate((prev) => (next ? addYears(prev, 1) : subYears(prev, 1)));
    },
    []
  );

  const openNewReservation = useCallback(() => {
    preloadBookingForm();
    setIsPreviewOpen(false);
    setPreviewBooking(null);
    setIs360DialogOpen(false);
    setIsBookingFormDirty(false);
    setEditingBooking(null);
    setPreselectedBoatId(undefined);
    setPreselectedDate(undefined);
    setPreselectedSlot(undefined);
    setPreselectedEndDate(undefined);
    setPreselectedEndSlot(undefined);
    if (typeof performance !== 'undefined') {
      performance.mark('hb:booking-sheet-open:start');
    }
    setIsBookingFormOpen(true);
  }, []);

  const handleCellClick = useCallback((boatId: string, date: Date, slot: 'AM' | 'PM') => {
    if (isDragging) return;
    setIsPreviewOpen(false);
    setPreviewBooking(null);
    setIsBookingFormDirty(false);
    setEditingBooking(null);
    setPreselectedBoatId(boatId);
    setPreselectedDate(date);
    setPreselectedSlot(slot);
    setPreselectedEndDate(undefined);
    setPreselectedEndSlot(undefined);
    if (typeof performance !== 'undefined') {
      performance.mark('hb:booking-sheet-open:start');
    }
    setIsBookingFormOpen(true);
  }, [isDragging]);

  const handleEditBooking = useCallback((booking: MappedBooking) => {
    setPreviewBooking(null);
    setIsPreviewOpen(false);
    setIsBookingFormDirty(false);
    setEditingBooking(booking as Booking);
    setPreselectedBoatId(undefined);
    setPreselectedDate(undefined);
    setPreselectedSlot(undefined);
    setPreselectedEndDate(undefined);
    setPreselectedEndSlot(undefined);
    if (typeof performance !== 'undefined') {
      performance.mark('hb:booking-sheet-open:start');
    }
    setIsBookingFormOpen(true);
  }, []);

  const resolveSlotFromPointer = useCallback((event: ReactMouseEvent<HTMLButtonElement>): 'AM' | 'PM' => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    return offsetX < rect.width / 2 ? 'AM' : 'PM';
  }, []);

  const updateKeyboardCellForPointer = useCallback((boatId: string, day: Date, slot: 'AM' | 'PM') => {
    const boatIndex = filteredBoatIndexById.get(boatId);
    if (boatIndex === undefined) return;
    const dayIndex = differenceInCalendarDays(startOfDay(day), startOfDay(range.start));
    if (dayIndex < 0 || dayIndex >= days.length) return;
    const slotIndex = dayIndex * 2 + (slot === 'PM' ? 1 : 0);
    setKeyboardCell({ boatIndex, slotIndex });
  }, [filteredBoatIndexById, range.start, days.length]);

  const handleOpenPreview = useCallback((selected: MappedBooking) => {
    setPreviewBooking(selected);
    setIsPreviewOpen(true);
  }, []);

  const checkConflict = useCallback(
    (boatId: string, start: Date, end: Date) => {
      return normalizedBookings.some((booking) => {
        if (booking.houseboatId !== boatId || booking.status === 'Cancelled') return false;
        const bookingStart = parseISO(booking.startTime);
        const bookingEnd = parseISO(booking.endTime);
        return start < bookingEnd && end > bookingStart;
      });
    },
    [normalizedBookings]
  );

  const handleCellMouseDown = useCallback((boatId: string, date: Date, slot: 'AM' | 'PM', event: ReactMouseEvent) => {
    if (event.button !== 0) return;
    setDragStart({ boatId, date, slot });
    setDragCurrent({ boatId, date, slot });
    setIsDragging(true);
  }, []);

  const handleCellMouseEnter = useCallback(
    (boatId: string, date: Date, slot: 'AM' | 'PM') => {
      if (!isDragging || !dragStart || dragStart.boatId !== boatId) return;

      const startDateTime = new Date(dragStart.date);
      startDateTime.setHours(dragStart.slot === 'AM' ? 10 : 15, 0, 0, 0);

      const candidateDateTime = new Date(date);
      candidateDateTime.setHours(slot === 'AM' ? 10 : 15, 0, 0, 0);

      const actualStart = startDateTime < candidateDateTime ? startDateTime : candidateDateTime;
      const actualEnd = startDateTime < candidateDateTime ? candidateDateTime : startDateTime;

      if (!checkConflict(boatId, actualStart, actualEnd)) {
        setDragCurrent({ boatId, date, slot });
      }
    },
    [isDragging, dragStart, checkConflict]
  );

  const handleDayCellMouseDown = useCallback(
    (boatId: string, day: Date, event: ReactMouseEvent<HTMLButtonElement>) => {
      const slot = resolveSlotFromPointer(event);
      updateKeyboardCellForPointer(boatId, day, slot);
      handleCellMouseDown(boatId, day, slot, event);
    },
    [resolveSlotFromPointer, updateKeyboardCellForPointer, handleCellMouseDown]
  );

  const handleDayCellHover = useCallback(
    (boatId: string, day: Date, event: ReactMouseEvent<HTMLButtonElement>) => {
      if (!isDragging) return;
      const slot = resolveSlotFromPointer(event);
      handleCellMouseEnter(boatId, day, slot);
    },
    [isDragging, resolveSlotFromPointer, handleCellMouseEnter]
  );

  const handleDayCellClick = useCallback(
    (boatId: string, day: Date, event: ReactMouseEvent<HTMLButtonElement>) => {
      const slot = resolveSlotFromPointer(event);
      updateKeyboardCellForPointer(boatId, day, slot);
      handleCellClick(boatId, day, slot);
    },
    [resolveSlotFromPointer, updateKeyboardCellForPointer, handleCellClick]
  );

  const finalizeDrag = useCallback(() => {
    if (!isDragging || !dragStart || !dragCurrent) {
      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const startDateTime = new Date(dragStart.date);
    startDateTime.setHours(dragStart.slot === 'AM' ? 10 : 15, 0, 0, 0);
    const endDateTime = new Date(dragCurrent.date);
    endDateTime.setHours(dragCurrent.slot === 'AM' ? 10 : 15, 0, 0, 0);

    const isBackward = endDateTime < startDateTime;
    const finalStart = isBackward ? dragCurrent : dragStart;
    const finalEnd = isBackward ? dragStart : dragCurrent;

    setEditingBooking(null);
    setPreselectedBoatId(dragStart.boatId);
    setPreselectedDate(finalStart.date);
    setPreselectedSlot(finalStart.slot);
    setPreselectedEndDate(finalEnd.date);
    setPreselectedEndSlot(finalEnd.slot);
    setIsBookingFormDirty(false);
    if (typeof performance !== 'undefined') {
      performance.mark('hb:booking-sheet-open:start');
    }
    setIsBookingFormOpen(true);

    setDragStart(null);
    setDragCurrent(null);
    setIsDragging(false);
  }, [isDragging, dragStart, dragCurrent]);

  useEffect(() => {
    if (!isDragging) return;
    const onMouseUp = () => finalizeDrag();
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [isDragging, finalizeDrag]);

  const scrollKeyboardCellIntoView = useCallback((boatIndex: number, slotIndex: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const viewportDaysWidth = Math.max(0, container.clientWidth - BOAT_COL_WIDTH);
    const cellLeft = slotIndex * SLOT_WIDTH;
    const cellRight = cellLeft + SLOT_WIDTH;
    const viewLeft = container.scrollLeft;
    const viewRight = viewLeft + viewportDaysWidth;

    let nextLeft = container.scrollLeft;
    if (cellLeft < viewLeft) {
      nextLeft = Math.max(0, cellLeft - HORIZONTAL_DAY_WIDTH);
    } else if (cellRight > viewRight) {
      nextLeft = Math.max(0, cellRight - viewportDaysWidth + HORIZONTAL_DAY_WIDTH);
    }

    const headerHeight = 92;
    const cellTop = boatIndex * rowHeight + headerHeight;
    const cellBottom = cellTop + rowHeight;
    const viewTop = container.scrollTop + headerHeight;
    const viewBottom = container.scrollTop + container.clientHeight;

    let nextTop = container.scrollTop;
    if (cellTop < viewTop) {
      nextTop = Math.max(0, boatIndex * rowHeight);
    } else if (cellBottom > viewBottom) {
      nextTop = Math.max(0, boatIndex * rowHeight - container.clientHeight + rowHeight + headerHeight);
    }

    if (nextLeft !== container.scrollLeft || nextTop !== container.scrollTop) {
      container.scrollTo({ left: nextLeft, top: nextTop, behavior: 'smooth' });
    }
  }, [rowHeight]);

  const handleGridFocus = useCallback(() => {
    if (keyboardCell || filteredBoats.length === 0 || days.length === 0) return;
    setKeyboardCell({ boatIndex: rowStartIndex, slotIndex: dayStartSlotIndex });
  }, [keyboardCell, filteredBoats.length, days.length, rowStartIndex, dayStartSlotIndex]);

  const handleGridKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (filteredBoats.length === 0 || days.length === 0) return;

    const maxBoatIndex = filteredBoats.length - 1;
    const maxSlotIndex = days.length * 2 - 1;
    const current = keyboardCell || { boatIndex: rowStartIndex, slotIndex: dayStartSlotIndex };

    let nextBoatIndex = current.boatIndex;
    let nextSlotIndex = current.slotIndex;
    let handled = false;

    switch (event.key) {
      case 'ArrowRight':
        nextSlotIndex = Math.min(maxSlotIndex, current.slotIndex + 1);
        handled = true;
        break;
      case 'ArrowLeft':
        nextSlotIndex = Math.max(0, current.slotIndex - 1);
        handled = true;
        break;
      case 'ArrowDown':
        nextBoatIndex = Math.min(maxBoatIndex, current.boatIndex + 1);
        handled = true;
        break;
      case 'ArrowUp':
        nextBoatIndex = Math.max(0, current.boatIndex - 1);
        handled = true;
        break;
      case 'Enter': {
        const boat = filteredBoats[current.boatIndex];
        const dayIndex = Math.floor(current.slotIndex / 2);
        const day = days[dayIndex];
        const slot = current.slotIndex % 2 === 0 ? 'AM' : 'PM';
        if (boat && day) {
          handleCellClick(boat.id, day, slot);
        }
        handled = true;
        break;
      }
      default:
        break;
    }

    if (!handled) return;
    event.preventDefault();

    setKeyboardCell({ boatIndex: nextBoatIndex, slotIndex: nextSlotIndex });
    scrollKeyboardCellIntoView(nextBoatIndex, nextSlotIndex);
  }, [
    filteredBoats,
    days,
    keyboardCell,
    rowStartIndex,
    dayStartSlotIndex,
    handleCellClick,
    scrollKeyboardCellIntoView,
  ]);

  const handleSaveBooking = useCallback(
    async (
      bookingData: Partial<Booking> & { selectedExtras?: string[] },
      options?: { closeAfterSave?: boolean }
    ) => {
      try {
        const method = bookingData.id ? 'PUT' : 'POST';
        const response = await fetch('/api/bookings', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to save reservation');
        }

        toast({ title: 'Saved', description: `Reservation ${bookingData.id ? 'updated' : 'created'} successfully.` });
        setIsBookingFormDirty(false);
        if (options?.closeAfterSave ?? true) {
          if (typeof performance !== 'undefined') {
            performance.mark('hb:booking-sheet-close:start');
          }
          setIsBookingFormOpen(false);
          setEditingBooking(null);
        }
        await refresh({ silent: true });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save reservation.' });
      }
    },
    [refresh, toast]
  );

  const handleDeleteBooking = useCallback(async () => {
    if (!deletingBooking) return;

    try {
      const response = await fetch(`/api/bookings?id=${deletingBooking.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete reservation');
      toast({ title: 'Deleted', description: 'Reservation removed successfully.' });
      setIsDeleteDialogOpen(false);
      setDeletingBooking(null);
      setPreviewBooking(null);
      setIsPreviewOpen(false);
      await refresh({ silent: true });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete reservation.' });
    }
  }, [deletingBooking, refresh, toast]);

  const attemptCloseBookingForm = useCallback(() => {
    if (isBookingFormDirty) {
      const shouldDiscard = window.confirm('You have unsaved changes. Discard them?');
      if (!shouldDiscard) return false;
    }
    if (typeof performance !== 'undefined') {
      performance.mark('hb:booking-sheet-close:start');
    }
    setIsBookingFormDirty(false);
    setIsBookingFormOpen(false);
    setEditingBooking(null);
    return true;
  }, [isBookingFormDirty]);

  const openFullEditPage = useCallback(() => {
    if (editingBooking?.id) {
      router.push(`/dashboard/houseboat-reservations/${editingBooking.id}/edit`);
      return;
    }

    const params = new URLSearchParams();
    if (preselectedBoatId) params.set('boatId', preselectedBoatId);
    if (preselectedDate) params.set('startDate', format(preselectedDate, 'yyyy-MM-dd'));
    if (preselectedSlot) params.set('startSlot', preselectedSlot);
    if (preselectedEndDate) params.set('endDate', format(preselectedEndDate, 'yyyy-MM-dd'));
    if (preselectedEndSlot) params.set('endSlot', preselectedEndSlot);

    const query = params.toString();
    router.push(
      query
        ? `/dashboard/houseboat-reservations/new?${query}`
        : '/dashboard/houseboat-reservations/new'
    );
  }, [
    router,
    editingBooking,
    preselectedBoatId,
    preselectedDate,
    preselectedSlot,
    preselectedEndDate,
    preselectedEndSlot,
  ]);

  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (!highlightId || bookings.length === 0) return;

    const target = bookings.find((booking) => booking.id === highlightId);
    if (!target) return;

    const start = parseISO(target.startTime);
    if (!bookingOverlapsRange(target, range)) {
      setCurrentDate(start);
      return;
    }

    setHighlightedId(highlightId);
    scrollToDate(start);
    const timeout = setTimeout(() => setHighlightedId(null), 5000);

    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete('highlight');
    const nextQuery = nextParams.toString();
    window.history.replaceState(
      {},
      '',
      nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname
    );
    return () => clearTimeout(timeout);
  }, [searchParams, bookings, range, scrollToDate]);

  useEffect(() => {
    if (typeof performance === 'undefined') return;
    if (!isLoading && scrollState.width > 0 && !firstPaintMeasuredRef.current) {
      firstPaintMeasuredRef.current = true;
      performance.mark('hb-calendar:first-paint:end');
      try {
        performance.measure(
          'hb-calendar:first-paint',
          'hb-calendar:first-paint:start',
          'hb-calendar:first-paint:end'
        );
      } catch {
        // Ignore duplicate measurements in development refresh cycles.
      }
    }
  }, [isLoading, scrollState.width]);

  useEffect(() => {
    if (typeof performance === 'undefined') return;
    if (!bookingSheetOpenRef.current && isBookingFormOpen) {
      performance.mark('hb:booking-sheet-open:end');
      try {
        performance.measure(
          'hb:booking-sheet-open',
          'hb:booking-sheet-open:start',
          'hb:booking-sheet-open:end'
        );
      } catch {
        // Ignore duplicate measurements.
      }
    }
    if (bookingSheetOpenRef.current && !isBookingFormOpen) {
      performance.mark('hb:booking-sheet-close:end');
      try {
        performance.measure(
          'hb:booking-sheet-close',
          'hb:booking-sheet-close:start',
          'hb:booking-sheet-close:end'
        );
      } catch {
        // Ignore duplicate measurements.
      }
    }
    bookingSheetOpenRef.current = isBookingFormOpen;
  }, [isBookingFormOpen]);

  useEffect(() => {
    const handleShortcuts = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.getAttribute('contenteditable') === 'true';
      if (!isEditable && event.key === '/') {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (!isEditable && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        openNewReservation();
        return;
      }
      if (event.key === 'Escape') {
        setIsPreviewOpen(false);
        setPreviewBooking(null);
        attemptCloseBookingForm();
      }
    };

    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [openNewReservation, attemptCloseBookingForm]);

  if (isLoading && bookings.length === 0) {
    return (
      <div className="p-6">
        <Skeleton className="mb-4 h-14 w-full rounded-xl" />
        <Skeleton className="h-[640px] w-full rounded-xl" />
      </div>
    );
  }

  if (errorMessage && bookings.length === 0) {
    return (
      <div className="p-6">
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-base font-semibold text-foreground">Unable to load calendar data</p>
          <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
          <Button className="mt-4 rounded-full" onClick={() => refresh()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const showNoResultsState = !isLoading && filteredBoats.length === 0;

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0 flex-col bg-background">
      <div className="sticky top-14 z-20 border-b border-border bg-background/95 px-2 py-2.5 backdrop-blur sm:px-3">
        <div className="flex items-center gap-2">
          <div className="hidden xl:flex shrink-0 items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">Website</span>
            <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-zinc-950">Nicols</span>
            <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">Pending</span>
            <span className="inline-flex items-center rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white">Maintenance</span>
          </div>

          <div className="custom-scrollbar min-w-0 flex flex-1 items-center justify-end gap-2 overflow-x-auto whitespace-nowrap pb-1 -mb-1">
            <div className="relative min-w-[18rem] w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={localSearchTerm}
                onChange={(event) => setLocalSearchTerm(event.target.value)}
                placeholder="Search boat, client or reservation ID..."
                className="h-10 rounded-full border-border bg-card pl-9 text-sm shadow-none"
              />
            </div>

            <div className="flex items-center rounded-full border border-border bg-card p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigateRange('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm font-semibold text-foreground">{format(currentDate, 'MMM yyyy')}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigateRange('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              className="h-10 rounded-full px-4"
              onClick={() => {
                const today = new Date();
                setCurrentDate(today);
                setTimeout(() => scrollToDate(today), 80);
              }}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Today
            </Button>
            <Button variant="outline" className="h-10 rounded-full px-4" onClick={() => refresh()}>
              <Settings2 className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 rounded-full px-4">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {filterCount > 0 ? (
                    <Badge variant="secondary" className="ml-2 h-5 rounded-full bg-muted px-2 text-xs text-foreground">
                      {filterCount}
                    </Badge>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[310px] border-border p-0 shadow-none">
                <FilterRail
                  collapsed={false}
                  models={houseboatModels}
                  modelCount={houseboatModels.length}
                  selectedModels={selectedModels}
                  selectedStatuses={selectedStatuses}
                  selectedSources={selectedSources}
                  onToggleModel={(modelId, checked) =>
                    setSelectedModels((prev) => (checked ? [...new Set([...prev, modelId])] : prev.filter((id) => id !== modelId)))
                  }
                  onToggleStatus={(status, checked) =>
                    setSelectedStatuses((prev) => (checked ? [...new Set([...prev, status])] : prev.filter((value) => value !== status)))
                  }
                  onToggleSource={(source, checked) =>
                    setSelectedSources((prev) => (checked ? [...new Set([...prev, source])] : prev.filter((value) => value !== source)))
                  }
                  onReset={() => {
                    setSelectedModels([]);
                    setSelectedStatuses([]);
                    setSelectedSources([]);
                  }}
                />
              </PopoverContent>
            </Popover>
            <Button
              className="h-10 rounded-full px-4"
              onMouseEnter={preloadBookingForm}
              onFocus={preloadBookingForm}
              onClick={openNewReservation}
            >
              <Plus className="mr-2 h-4 w-4" />
              New reservation
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 p-2">
          {showNoResultsState ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-border bg-card p-6 text-center">
              <div>
                <p className="text-base font-semibold text-foreground">No boats match the current filters.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Adjust filters or clear search to load the full fleet calendar.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 rounded-full"
                  onClick={() => {
                    setLocalSearchTerm('');
                    setSearchTerm('');
                    setSelectedModels([]);
                    setSelectedStatuses([]);
                    setSelectedSources([]);
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            </div>
          ) : (
            <CalendarGrid
              scrollContainerRef={scrollContainerRef}
              onGridScroll={handleGridScroll}
              onGridKeyDown={handleGridKeyDown}
              onGridFocus={handleGridFocus}
              totalGridWidth={totalGridWidth}
              totalDaysWidth={totalDaysWidth}
              monthSegments={monthSegments}
              visibleDays={visibleDays}
              leftDayPadding={leftDayPadding}
              rightDayPadding={rightDayPadding}
              todayKey={todayKey}
              filteredBoatsCount={filteredBoats.length}
              rowHeight={rowHeight}
              rowStartIndex={rowStartIndex}
              rowEndIndex={rowEndIndex}
              visibleBoats={visibleBoats}
              modelNameById={modelNameById}
              visibleProcessedBookings={visibleProcessedBookings}
              highlightedId={highlightedId}
              dragPreviewStyle={dragPreviewStyle}
              activeCellStyle={activeCellStyle}
              onOpenBooking={handleOpenPreview}
              onDayCellMouseDown={handleDayCellMouseDown}
              onDayCellHover={handleDayCellHover}
              onDayCellClick={handleDayCellClick}
            />
          )}
        </main>
      </div>

      <QuickPreviewDrawer
        open={isPreviewOpen}
        booking={previewBooking}
        getBoatName={getBoatName}
        onOpenChange={(open: boolean) => {
          setIsPreviewOpen(open);
          if (!open) setPreviewBooking(null);
        }}
        onEdit={handleEditBooking}
        onDelete={(booking) => {
          setDeletingBooking(booking);
          setIsPreviewOpen(false);
          setPreviewBooking(null);
          setIsDeleteDialogOpen(true);
        }}
        onCustomer360={(booking) => {
          setSelectedBookingFor360(booking);
          setIsPreviewOpen(false);
          setPreviewBooking(null);
          setIs360DialogOpen(true);
        }}
      />

      <Sheet
        modal={false}
        open={isBookingFormOpen}
        onOpenChange={(open: boolean) => {
          if (open) {
            setIsBookingFormOpen(true);
            return;
          }
          attemptCloseBookingForm();
        }}
      >
        <SheetContent side="right" className="w-[470px] max-w-[96vw] border-l border-border bg-card p-0">
          <SheetTitle className="sr-only">Reservation form</SheetTitle>
          <BookingFormSheet
            mode="quick"
            booking={editingBooking}
            boats={boats}
            models={houseboatModels}
            prices={prices}
            tariffs={tariffs}
            availableExtras={availableExtras}
            preselectedBoatId={preselectedBoatId}
            preselectedDate={preselectedDate}
            preselectedSlot={preselectedSlot}
            preselectedEndDate={preselectedEndDate}
            preselectedEndSlot={preselectedEndSlot}
            onClose={() => {
              attemptCloseBookingForm();
            }}
            onDirtyChange={setIsBookingFormDirty}
            onOpenFullEdit={openFullEditPage}
            onSave={handleSaveBooking}
            onDelete={
              editingBooking
                ? () => {
                    setDeletingBooking(editingBooking as MappedBooking);
                    setIsDeleteDialogOpen(true);
                  }
                : undefined
            }
          />
        </SheetContent>
      </Sheet>

      <Dialog modal={false} open={is360DialogOpen} onOpenChange={setIs360DialogOpen}>
        <DialogContent className="max-w-4xl border border-border bg-card p-0 shadow-none">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-lg font-semibold text-foreground">Customer 360</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Unified history, communication context, and operational notes for this guest.
            </DialogDescription>
          </DialogHeader>
          <div className="custom-scrollbar max-h-[78vh] overflow-y-auto p-6">
            {selectedBookingFor360 ? (
              <Customer360View
                clientEmail={selectedBookingFor360.clientEmail}
                clientName={selectedBookingFor360.clientName}
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading customer profile...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border border-border bg-card shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-foreground">Delete reservation?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              This will permanently remove the reservation for <strong>{deletingBooking?.clientName || 'this guest'}</strong>. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-xl"
              onClick={() => {
                setDeletingBooking(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteBooking}
            >
              Delete reservation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.45);
        }
      `}</style>
    </div>
  );
}
