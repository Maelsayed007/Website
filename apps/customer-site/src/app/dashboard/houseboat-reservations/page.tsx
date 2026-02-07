'use client';

import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  Ship,
  Search,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Clock,
  Info,
  CalendarDays,
  Filter,
  Download,
  Plus,
  History,
  UserRound,
  UsersRound
} from 'lucide-react';
import { Customer360View } from '@/components/customer-360-view';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  eachDayOfInterval,
  format,
  addYears,
  subYears,
  startOfYear,
  endOfYear,
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  isSameDay,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  endOfDay,
  getYear,
  eachMonthOfInterval
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useSupabase } from '@/components/providers/supabase-provider';
import { Badge } from '@/components/ui/badge';
import { HouseboatModel, Boat, Booking } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import BookingSidebar from '@/components/booking-sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ToastAction } from '@/components/ui/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Configuration
const SLOT_WIDTH = 40; // Width for AM/PM slot
const BOAT_COL_WIDTH = 200;

const BookingItem = memo(({
  booking,
  isHighlighted,
  onEdit,
  onDelete,
  on360,
  getBoatName,
  rowHeight
}: {
  booking: any;
  isHighlighted: boolean;
  onEdit: (b: Booking) => void;
  onDelete: (b: Booking) => void;
  on360: (b: Booking) => void;
  getBoatName: (id: string | undefined) => string;
  rowHeight: number;
}) => {
  const getBookingColor = (b: any) => {
    if (b.status === 'Cancelled') return 'hidden';
    if (b.status === 'Maintenance') return 'bg-zinc-800 text-white border-zinc-900';

    // Treat as confirmed if:
    // 1. Explicitly confirmed
    // 2. Source is Nicols
    // 3. Has any payment (even if not fully paid)
    const isNicols = b.source === 'nicols';
    const hasPayment = (b.amount_paid || 0) > 0 || b.payment_status === 'deposit_paid' || b.payment_status === 'fully_paid';
    const isConfirmed = b.status === 'Confirmed' || isNicols || hasPayment;

    if (!isConfirmed) return 'bg-red-500 text-white border-red-600';

    switch (b.source) {
      case 'website': return 'bg-indigo-500 text-white border-indigo-600';
      case 'nicols': return 'bg-orange-500 text-white border-orange-600';
      case 'amieira': return 'bg-emerald-500 text-white border-emerald-600';
      case 'diaria': return 'bg-pink-500 text-white border-pink-600';
      case 'ancorado': return 'bg-slate-500 text-white border-slate-600';
      default: return 'bg-emerald-500 text-white border-emerald-600';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "absolute pointer-events-auto h-12 mt-1.5 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-center px-2 overflow-hidden shadow-none",
            getBookingColor(booking),
            booking.isOverflowLeft && "rounded-l-none border-l-0",
            booking.isOverflowRight && "rounded-r-none border-r-0",
            isHighlighted && "animate-shining ring-4 ring-white ring-offset-2 ring-offset-emerald-400/50"
          )}
          style={{
            left: booking.left + 1,
            width: booking.width - 2,
            top: booking.top,
            height: Math.max(rowHeight - 6, 24)
          }}
        >
          <p className={cn(
            "font-black uppercase truncate leading-none",
            rowHeight < 40 ? "text-[8px]" : "text-[10px]"
          )}>
            {booking.clientName}
          </p>
          {rowHeight >= 45 && booking.width > 60 && (
            <div className="flex items-center gap-1 mt-0.5 opacity-80">
              <Clock className="w-2.5 h-2.5" />
              <span className="text-[9px] font-bold">
                {format(parseISO(booking.startTime), 'MMM dd')} - {format(parseISO(booking.endTime), 'MMM dd')}
              </span>
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 overflow-hidden rounded-2xl shadow-2xl border-none">
        <div className={cn("px-4 py-2 text-white flex justify-between items-center", getBookingColor(booking))}>
          <div className="flex flex-col">
            <Badge variant="outline" className="w-fit text-white border-white/30 bg-white/10 text-[9px] px-1.5 h-4 mb-1">
              {booking.status === 'Maintenance' ? 'Maintenance' : (booking.source === 'nicols' ? 'Confirmed (Nicols)' : booking.status)}
            </Badge>
            <h3 className="text-lg font-black truncate max-w-[280px]">
              {booking.status === 'Maintenance' ? `🛠️ ${booking.clientName}` : booking.clientName}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-0.5">Ref: #{booking.id.slice(0, 8)}</p>
            <p className="text-xs font-bold opacity-90">{getBoatName(booking.houseboatId)}</p>
          </div>
        </div>

        <div className="p-3 bg-white space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column: Client Info */}
            <div className="space-y-2">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider border-b pb-0.5">Client Details</h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <UserRound className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-700 truncate">{booking.clientName || 'Unnamed Client'}</span>
                </div>
                {booking.status !== 'Maintenance' && (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-600 truncate">{booking.clientEmail || 'No email provided'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-600 truncate">{booking.clientPhone || 'No phone provided'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <UsersRound className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-600 truncate">{booking.numberOfGuests || 0} Guests</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Stay Info */}
            <div className="space-y-2">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider border-b pb-0.5">Stay Schedule</h4>
              <div className="space-y-1.5">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Check-in</p>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                    {format(parseISO(booking.startTime), 'EEE, MMM dd')}
                    <Badge variant="secondary" className="text-[9px] h-3.5 px-1 py-0">{format(parseISO(booking.startTime), 'HH:mm')}</Badge>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Check-out</p>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <CalendarDays className="w-3.5 h-3.5 text-red-600" />
                    {format(parseISO(booking.endTime), 'EEE, MMM dd')}
                    <Badge variant="secondary" className="text-[9px] h-3.5 px-1 py-0">{format(parseISO(booking.endTime), 'HH:mm')}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {booking.notes && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 italic">
              <div className="flex gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{booking.notes}</span>
              </div>
            </div>
          )}

          {booking.status !== 'Maintenance' && (
            <div className="pt-2 border-t flex justify-between items-center text-xs">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Financial Status</p>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Total</span>
                    <span className="font-black text-slate-900 leading-none">€{(booking.price || booking.total_price || 0).toLocaleString()}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-100" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-emerald-600 uppercase">Paid</span>
                    <span className="font-black text-emerald-700 leading-none">€{(booking.amount_paid || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                booking.payment_status === 'fully_paid' || (booking.price || booking.total_price || 0) - (booking.amount_paid || 0) <= 0
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : booking.payment_status === 'deposit_paid'
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-red-100 text-red-700 border-red-200"
              )}>
                {booking.payment_status === 'fully_paid' || (booking.price || booking.total_price || 0) - (booking.amount_paid || 0) <= 0
                  ? 'Fully Paid'
                  : booking.payment_status === 'deposit_paid'
                    ? 'Deposit Paid'
                    : booking.payment_status === 'failed'
                      ? 'Payment Failed'
                      : (booking.source === 'nicols' ? 'Confirmed (Nicols)' : 'Pending')}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1.5">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 rounded-full gap-2 text-[11px] font-bold"
              onClick={() => onEdit(booking)}
            >
              <Pencil className="w-3 h-3" /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 rounded-full gap-2 text-[11px] font-bold text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(booking)}
            >
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-full p-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200"
              onClick={() => on360(booking)}
              title="Customer 360"
            >
              <History className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

BookingItem.displayName = 'BookingItem';

const BoatRow = memo(({
  boat,
  modelName,
  daysInYear,
  rowHeight,
  onMouseDown,
  onMouseEnter,
  onCellClick,
  isSameDayNow
}: {
  boat: Boat;
  modelName: string;
  daysInYear: Date[];
  rowHeight: number;
  onMouseDown: (boatId: string, day: Date, slot: 'AM' | 'PM', e: React.MouseEvent) => void;
  onMouseEnter: (boatId: string, day: Date, slot: 'AM' | 'PM') => void;
  onCellClick: (boatId: string, day: Date, slot: 'AM' | 'PM') => void;
  isSameDayNow: (d: Date) => boolean;
}) => {
  return (
    <div
      className="flex border-b hover:bg-muted/30 transition-colors group"
      style={{ height: rowHeight }}
    >
      <div
        className="sticky left-0 z-20 bg-background/95 backdrop-blur-sm border-r px-4 flex items-center transition-all group-hover:bg-background"
        style={{ width: BOAT_COL_WIDTH }}
      >
        <div className="min-w-0 flex items-baseline gap-2">
          <p className="font-bold text-sm truncate">{boat.name}</p>
          <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter opacity-70 shrink-0">
            {modelName}
          </span>
        </div>
      </div>

      {daysInYear.map(day => {
        const isToday = isSameDayNow(day);
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "flex border-r transition-colors h-full select-none",
              isToday ? "bg-emerald-50/20" : ""
            )}
            style={{ width: SLOT_WIDTH * 2 }}
          >
            <div
              className="w-1/2 h-full border-r border-dashed border-gray-100 hover:bg-muted/50 cursor-crosshair transition-colors"
              onMouseDown={(e) => onMouseDown(boat.id, day, 'AM', e)}
              onMouseEnter={() => onMouseEnter(boat.id, day, 'AM')}
              onClick={() => onCellClick(boat.id, day, 'AM')}
              title={`Book ${boat.name} - ${format(day, 'MMM dd')} AM`}
            />
            <div
              className="w-1/2 h-full hover:bg-muted/50 cursor-crosshair transition-colors"
              onMouseDown={(e) => onMouseDown(boat.id, day, 'PM', e)}
              onMouseEnter={() => onMouseEnter(boat.id, day, 'PM')}
              onClick={() => onCellClick(boat.id, day, 'PM')}
              title={`Book ${boat.name} - ${format(day, 'MMM dd')} PM`}
            />
          </div>
        );
      })}
    </div>
  );
});

const GridHeader = memo(({
  yearMonths,
  daysInYear,
  isSameDayNow
}: {
  yearMonths: Date[];
  daysInYear: Date[];
  isSameDayNow: (d: Date) => boolean;
}) => {
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
      <div className="flex h-7 border-b">
        <div
          className="sticky left-0 z-40 bg-background border-r flex items-center px-4 font-bold text-xs uppercase tracking-widest text-muted-foreground"
          style={{ width: BOAT_COL_WIDTH }}
        >
          Fleet Units
        </div>
        {yearMonths.map(month => {
          const daysInMonth = differenceInCalendarDays(endOfMonth(month), startOfMonth(month)) + 1;
          const width = daysInMonth * 2 * SLOT_WIDTH;
          return (
            <div
              key={month.toString()}
              className="flex items-center justify-center border-r font-bold text-xs uppercase tracking-wider text-muted-foreground bg-gray-50/50"
              style={{ width }}
            >
              {format(month, 'MMMM')}
            </div>
          );
        })}
      </div>

      <div className="flex">
        <div
          className="sticky left-0 z-40 bg-background border-r"
          style={{ width: BOAT_COL_WIDTH }}
        />
        {daysInYear.map(day => {
          const isToday = isSameDayNow(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex flex-col border-r transition-colors relative",
                isToday ? "bg-emerald-50" : ""
              )}
              style={{ width: SLOT_WIDTH * 2 }}
            >
              <div className="h-6 flex items-center justify-center border-b bg-gray-50/50">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  isToday ? "text-emerald-600" : "text-muted-foreground"
                )}>
                  {format(day, 'EEE')}
                </span>
              </div>
              <div className="h-7 flex items-center justify-center border-b">
                <span className={cn(
                  "text-sm font-bold",
                  isToday ? "text-emerald-600" : "text-foreground"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="h-6 flex">
                <div className="flex-1 flex items-center justify-center border-r">
                  <span className="text-[9px] font-bold text-muted-foreground">AM</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-muted-foreground">PM</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

GridHeader.displayName = 'GridHeader';

BoatRow.displayName = 'BoatRow';

export default function HouseboatReservationsPage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [houseboatModels, setHouseboatModels] = useState<HouseboatModel[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [prices, setPrices] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [availableExtras, setAvailableExtras] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic Row Height Calculation
  const ROW_HEIGHT = useMemo(() => {
    if (boats.length === 0) return 56;
    // We want the calendar to fit in the viewport
    // Approx height of elements outside the card:
    // Header (approx 48) + Padding (approx 48) + Card Header (approx 28) + Grid Header (approx 56)
    // plus the new gap-4 (16px)
    const chromeHeight = 200;
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - chromeHeight : 600;
    const calculated = Math.floor(availableHeight / boats.length);
    return Math.max(calculated, 28);
  }, [boats.length]);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const isSameDayNow = useCallback((d: Date) => isSameDay(d, todayStart), [todayStart]);
  const getBoatName = useCallback((id: string | undefined) => {
    if (!id) return 'Unknown';
    return boats.find(b => b.id === id)?.name || 'Unknown Boat';
  }, [boats]);

  // Debounce search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 400); // 400ms delay for performance
    return () => clearTimeout(timer);
  }, [localSearchTerm]);
  const [selectedBookingFor360, setSelectedBookingFor360] = useState<Booking | null>(null);
  const [is360DialogOpen, setIs360DialogOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const searchParams = useSearchParams();

  // Booking Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [preselectedBoatId, setPreselectedBoatId] = useState<string | undefined>();
  const [preselectedDate, setPreselectedDate] = useState<Date | undefined>();
  const [preselectedSlot, setPreselectedSlot] = useState<'AM' | 'PM' | undefined>();
  const [preselectedEndDate, setPreselectedEndDate] = useState<Date | undefined>();
  const [preselectedEndSlot, setPreselectedEndSlot] = useState<'AM' | 'PM' | undefined>();

  // Drag-to-Reserve States
  const [dragStart, setDragStart] = useState<{ boatId: string; date: Date; slot: 'AM' | 'PM' } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ boatId: string; date: Date; slot: 'AM' | 'PM' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Delete Confirmation State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null);

  // Generate Year Data
  const { daysInYear, yearMonths } = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    const days = eachDayOfInterval({ start: yearStart, end: yearEnd });
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    return { daysInYear: days, yearMonths: months };
  }, [currentDate]);

  // Total grid width based on slots (2 slots per day)
  const totalGridWidth = (daysInYear.length * 2 * SLOT_WIDTH) + BOAT_COL_WIDTH;

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!supabase) return;

    // Only show loading state if not silent and it's the first time
    if (!options?.silent && boats.length === 0) {
      setIsLoading(true);
    }

    try {
      const [modelsRes, boatsRes, bookingsRes, pricesRes, extrasRes, tariffsRes] = await Promise.all([
        supabase.from('houseboat_models').select('*'),
        supabase.from('boats').select('*'),
        supabase.from('bookings').select('*').not('houseboat_id', 'is', null),
        supabase.from('houseboat_prices').select('*'),
        supabase.from('extras').select('*').in('type', ['all', 'houseboat']),
        supabase.from('tariffs').select('*')
      ]);

      if (modelsRes.data) setHouseboatModels(modelsRes.data as any);
      if (boatsRes.data) setBoats(boatsRes.data as any);
      if (pricesRes.data) setPrices(pricesRes.data as any);
      if (tariffsRes.data) setTariffs(tariffsRes.data as any);
      if (bookingsRes.data) {
        setBookings((bookingsRes.data as any[]).map(b => ({
          ...b,
          price: b.total_price || b.price || 0, // Map total_price to price for frontend
          clientName: b.client_name,
          clientEmail: b.client_email,
          clientPhone: b.client_phone,
          startTime: b.start_time,
          endTime: b.end_time,
          houseboatId: b.houseboat_id,
          restaurantTableId: b.restaurant_table_id,
          dailyTravelPackageId: b.daily_travel_package_id,
          numberOfGuests: b.number_of_guests || 2,
          selectedExtras: b.selected_extras || [],
          extras: b.selected_extras || [] // Keep as extras too for interface safety
        })));
      }
      if (extrasRes.data) {
        setAvailableExtras(extrasRes.data);
      }
      if (extrasRes.data) {
        // We might want to pass these available extras to the Sidebar
        // But for now let's just ensure they are available if we need them
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load reservations.' });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time Subscription
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('bookings-live-sync')
      .on(
        'postgres_changes',
        { event: '*', table: 'bookings', schema: 'public' },
        (payload) => {
          console.log('Real-time change detected:', payload);

          // Trigger a silent refresh to get the latest state
          fetchData({ silent: true });

          // Show notifications for external changes
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Reservation!",
              description: "A new booking has just been made.",
              action: (
                <ToastAction altText="View" onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('highlight', payload.new.id);
                  window.history.replaceState({}, '', url.toString());

                  // Trigger highlight state for immediate visual feedback
                  setHighlightedId(payload.new.id);

                  // Manual scroll trigger if possible or let the effect handle it
                  const start = parseISO(payload.new.start_time);
                  const targetYear = getYear(start);
                  if (getYear(currentDate) === targetYear) {
                    const dayOffset = differenceInCalendarDays(start, startOfYear(new Date(targetYear, 0, 1)));
                    const scrollX = (dayOffset * 2 * SLOT_WIDTH);
                    document.querySelector('.custom-scrollbar')?.scrollTo({ left: scrollX, behavior: 'smooth' });
                  } else {
                    setCurrentDate(new Date(targetYear, 0, 1));
                  }
                }}>
                  View
                </ToastAction>
              ),
            });
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "Reservation Updated",
              description: "An existing booking was modified.",
              action: (
                <ToastAction altText="View" onClick={() => {
                  setHighlightedId(payload.new.id);
                  // Just scroll/target, don't open
                }}>
                  View
                </ToastAction>
              ),
            });
          } else if (payload.eventType === 'DELETE') {
            toast({
              title: "Reservation Cancelled",
              description: "A booking has been removed.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchData, toast]);

  // Handle Highlighting and Navigation
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && bookings.length > 0) {
      const target = bookings.find(b => b.id === highlightId);
      if (target) {
        // 1. Ensure we are in the correct year
        const targetYear = getYear(parseISO(target.startTime));
        if (getYear(currentDate) !== targetYear) {
          setCurrentDate(new Date(targetYear, 0, 1));
          return; // Next effect run will handle the rest
        }

        // 2. Highlight Only (Don't open dialog)
        setHighlightedId(highlightId);

        // Clear highlight after 5 seconds
        setTimeout(() => setHighlightedId(null), 5000);

        // 3. Scroll into view (optional but helpful if grid is wide)
        const start = parseISO(target.startTime);
        const dayOffset = differenceInCalendarDays(start, startOfYear(new Date(targetYear, 0, 1)));
        const scrollX = (dayOffset * 2 * SLOT_WIDTH);

        const scrollContainer = document.querySelector('.custom-scrollbar');
        if (scrollContainer) {
          scrollContainer.scrollTo({
            left: scrollX,
            behavior: 'smooth'
          });
        }

        // Clear highlight from URL to avoid re-triggering (cleaner URL)
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [searchParams, bookings, currentDate]);

  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'next' ? addYears(prev, 1) : subYears(prev, 1));
  };

  const scrollToMonth = useCallback((monthIndex: number) => {
    const yearStart = startOfYear(currentDate);
    const targetMonth = new Date(getYear(currentDate), monthIndex, 1);
    const dayOffset = differenceInCalendarDays(targetMonth, yearStart);
    const scrollX = (dayOffset * 2 * SLOT_WIDTH);

    const scrollContainer = document.querySelector('.custom-scrollbar');
    if (scrollContainer) {
      scrollContainer.scrollTo({
        left: scrollX,
        behavior: 'smooth'
      });
    }
  }, [currentDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const calendarMonth = currentDate.getMonth();
    if (direction === 'next') {
      if (calendarMonth === 11) {
        // Go to next year Jan
        setCurrentDate(addYears(currentDate, 1));
        // After year change, we need to scroll to Jan (offset 0)
        setTimeout(() => scrollToMonth(0), 100);
      } else {
        scrollToMonth(calendarMonth + 1);
        setCurrentDate(new Date(getYear(currentDate), calendarMonth + 1, 1));
      }
    } else {
      if (calendarMonth === 0) {
        // Go to prev year Dec
        setCurrentDate(subYears(currentDate, 1));
        setTimeout(() => scrollToMonth(11), 100);
      } else {
        scrollToMonth(calendarMonth - 1);
        setCurrentDate(new Date(getYear(currentDate), calendarMonth - 1, 1));
      }
    }
  };

  // CRUD Handlers
  const handleSaveBooking = useCallback(async (bookingData: Partial<Booking>) => {
    // Optimistic Update
    const oldBookings = [...bookings];
    if (bookingData.id) {
      setBookings(prev => prev.map(b => b.id === bookingData.id ? { ...b, ...bookingData } as Booking : b));
    }

    try {
      const method = bookingData.id ? 'PUT' : 'POST';
      const response = await fetch('/api/bookings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save booking');
      }

      toast({ title: 'Success', description: `Booking ${bookingData.id ? 'updated' : 'created'} successfully` });
      await fetchData({ silent: true }); // Refresh data in background
    } catch (error: any) {
      setBookings(oldBookings); // Rollback
      console.error('Error saving booking:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save booking' });
    }
  }, [bookings, toast, fetchData]);

  const handleDeleteBooking = useCallback(async () => {
    if (!deletingBooking) return;

    // Optimistic Update
    const oldBookings = [...bookings];
    setBookings(prev => prev.filter(b => b.id !== deletingBooking.id));

    try {
      const response = await fetch(`/api/bookings?id=${deletingBooking.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete booking');

      toast({ title: 'Success', description: 'Booking deleted successfully' });
      setIsDeleteDialogOpen(false);
      setDeletingBooking(null);
      await fetchData({ silent: true }); // Refresh data in background
    } catch (error) {
      setBookings(oldBookings); // Rollback
      console.error('Error deleting booking:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete booking' });
    }
  }, [deletingBooking, bookings, toast, fetchData]);

  const handleCellClick = useCallback((boatId: string, date: Date, slot: 'AM' | 'PM') => {
    if (isDragging) return;
    setPreselectedBoatId(boatId);
    setPreselectedDate(date);
    setPreselectedSlot(slot);
    setPreselectedEndDate(undefined);
    setPreselectedEndSlot(undefined);
    setEditingBooking(null);
    setIsSidebarOpen(true);
  }, [isDragging]);

  const checkConflict = useCallback((boatId: string, start: Date, end: Date) => {
    return bookings.some(b => {
      if (b.houseboatId !== boatId || b.status === 'Cancelled') return false;
      const bStart = parseISO(b.startTime);
      const bEnd = parseISO(b.endTime);
      return start < bEnd && end > bStart;
    });
  }, [bookings]);

  const handleCellMouseDown = useCallback((boatId: string, date: Date, slot: 'AM' | 'PM', e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setDragStart({ boatId, date, slot });
    setDragCurrent({ boatId, date, slot });
    setIsDragging(true);
  }, []);

  const handleCellMouseEnter = useCallback((boatId: string, date: Date, slot: 'AM' | 'PM') => {
    if (!isDragging || !dragStart || dragStart.boatId !== boatId) return;

    // Calculate candidate range
    const startDateTime = new Date(dragStart.date);
    startDateTime.setHours(dragStart.slot === 'AM' ? 10 : 15, 0, 0, 0);

    const candidateDateTime = new Date(date);
    candidateDateTime.setHours(slot === 'AM' ? 10 : 15, 0, 0, 0);

    const actualStart = isBefore(startDateTime, candidateDateTime) ? startDateTime : candidateDateTime;
    const actualEnd = isBefore(startDateTime, candidateDateTime) ? candidateDateTime : startDateTime;

    if (!checkConflict(boatId, actualStart, actualEnd)) {
      setDragCurrent({ boatId, date, slot });
    }
  }, [isDragging, dragStart, checkConflict]);

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

    const isBackward = isBefore(endDateTime, startDateTime);
    const finalStart = isBackward ? dragCurrent : dragStart;
    const finalEnd = isBackward ? dragStart : dragCurrent;

    setPreselectedBoatId(dragStart.boatId);
    setPreselectedDate(finalStart.date);
    setPreselectedSlot(finalStart.slot);
    setPreselectedEndDate(finalEnd.date);
    setPreselectedEndSlot(finalEnd.slot);
    setEditingBooking(null);
    setIsSidebarOpen(true);

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  }, [isDragging, dragStart, dragCurrent]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', finalizeDrag);
      return () => window.removeEventListener('mouseup', finalizeDrag);
    }
  }, [isDragging, finalizeDrag]);

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setPreselectedBoatId(undefined);
    setPreselectedDate(undefined);
    setPreselectedSlot(undefined);
    setPreselectedEndDate(undefined);
    setPreselectedEndSlot(undefined);
    setIsSidebarOpen(true);
  };

  const filteredBoats = useMemo(() => {
    let result = boats;

    // Filter by Search Term (matches boat name OR matches any client name in that boat)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(boat => {
        const matchesBoatName = boat.name.toLowerCase().includes(lowerSearch);
        const hasMatchingBooking = bookings.some(b =>
          b.houseboatId === boat.id &&
          b.clientName?.toLowerCase().includes(lowerSearch)
        );
        return matchesBoatName || hasMatchingBooking;
      });
    }

    // Filter by Selected Models
    if (selectedModels.length > 0) {
      result = result.filter(boat => boat.model_id && selectedModels.includes(boat.model_id));
    }

    return result;
  }, [boats, searchTerm, bookings, selectedModels]);

  const processedBookings = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);

    return bookings.map(booking => {
      // 1. Basic Visibility Check (Correct Year/Month)
      const start = parseISO(booking.startTime);
      const end = parseISO(booking.endTime);
      if (isAfter(start, yearEnd) || isBefore(end, yearStart)) return null;

      // 2. Filter by Status
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(booking.status)) return null;

      // 3. Filter by Source
      if (selectedSources.length > 0 && !selectedSources.includes(booking.source || 'manual')) return null;

      // 4. Filter by Search (Case insensitive client name)
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        const matchesClient = booking.clientName?.toLowerCase().includes(lowerSearch);
        const matchesBoat = boats.find(b => b.id === booking.houseboatId)?.name.toLowerCase().includes(lowerSearch);
        if (!matchesClient && !matchesBoat) return null;
      }

      const boatIndex = filteredBoats.findIndex(b => b.id === booking.houseboatId);
      if (boatIndex === -1) return null;

      const dayOffsetStart = differenceInCalendarDays(start, yearStart);
      let startSlotIndex = dayOffsetStart * 2;
      if (start.getHours() >= 12) startSlotIndex += 1;

      const dayOffsetEnd = differenceInCalendarDays(end, yearStart);
      let endSlotIndex = dayOffsetEnd * 2;
      if (end.getHours() >= 12) endSlotIndex += 1;

      const widthSlots = (endSlotIndex - startSlotIndex) + 1;

      return {
        ...booking,
        left: startSlotIndex * SLOT_WIDTH,
        width: widthSlots * SLOT_WIDTH,
        top: boatIndex * ROW_HEIGHT,
        isOverflowLeft: isBefore(start, yearStart),
        isOverflowRight: isAfter(end, yearEnd),
      };
    }).filter(Boolean);
  }, [bookings, currentDate, filteredBoats, searchTerm, selectedStatuses, boats]);

  if (isLoading) return (
    <div className="p-8">
      <Skeleton className="h-12 w-64 mb-6" />
      <Skeleton className="h-[600px] w-full rounded-xl" />
    </div>
  );

  return (
    <div className="flex flex-col h-screen p-4 lg:p-6 overflow-hidden bg-gray-50/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold tracking-tight">Houseboat Reservations</h1>

          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search unit or client..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs shadow-sm bg-white"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 gap-2 shadow-sm font-bold",
                    (selectedModels.length > 0 || selectedStatuses.length > 0) && "border-emerald-500 bg-emerald-50 text-emerald-700"
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                  {(selectedModels.length > 0 || selectedStatuses.length > 0) && (
                    <Badge variant="secondary" className="h-4 px-1.5 min-w-[18px] text-[10px] bg-emerald-200 text-emerald-800 border-none">
                      {selectedModels.length + selectedStatuses.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-5 rounded-2xl shadow-xl mt-2" align="start">
                <div className="space-y-5">
                  <div>
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Boat Models</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {houseboatModels.map(model => (
                        <div key={model.id} className="flex items-center space-x-2.5">
                          <Checkbox
                            id={`model-${model.id}`}
                            checked={selectedModels.includes(model.id)}
                            onCheckedChange={(checked) => {
                              setSelectedModels(prev =>
                                checked ? [...prev, model.id] : prev.filter(id => id !== model.id)
                              );
                            }}
                          />
                          <label htmlFor={`model-${model.id}`} className="text-xs font-bold leading-none cursor-pointer truncate">
                            {model.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Reservation Status</h4>
                    <div className="flex gap-6">
                      {['Confirmed', 'Pending'].map(status => (
                        <div key={status} className="flex items-center space-x-2.5">
                          <Checkbox
                            id={`status-${status}`}
                            checked={selectedStatuses.includes(status)}
                            onCheckedChange={(checked) => {
                              setSelectedStatuses(prev =>
                                checked ? [...prev, status] : prev.filter(s => s !== status)
                              );
                            }}
                          />
                          <label htmlFor={`status-${status}`} className="text-xs font-bold leading-none cursor-pointer">
                            {status}
                          </label>
                        </div>
                      ))}
                      <div className="flex items-center space-x-2.5">
                        <Checkbox
                          id="status-Maintenance"
                          checked={selectedStatuses.includes('Maintenance')}
                          onCheckedChange={(checked) => {
                            setSelectedStatuses(prev =>
                              checked ? [...prev, 'Maintenance'] : prev.filter(s => s !== 'Maintenance')
                            );
                          }}
                        />
                        <label htmlFor="status-Maintenance" className="text-xs font-bold leading-none cursor-pointer">
                          Maintenance
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Source</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'website', name: 'Website' },
                        { id: 'nicols', name: 'Nicols' },
                        { id: 'diaria', name: 'Diária' },
                        { id: 'ancorado', name: 'Ancorado' },
                        { id: 'manual', name: 'Manual' }
                      ].map(source => (
                        <div key={source.id} className="flex items-center space-x-2.5">
                          <Checkbox
                            id={`source-${source.id}`}
                            checked={selectedSources.includes(source.id)}
                            onCheckedChange={(checked) => {
                              setSelectedSources(prev =>
                                checked ? [...prev, source.id] : prev.filter(id => id !== source.id)
                              );
                            }}
                          />
                          <label htmlFor={`source-${source.id}`} className="text-xs font-bold leading-none cursor-pointer truncate">
                            {source.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(selectedModels.length > 0 || selectedStatuses.length > 0 || selectedSources.length > 0) && (
                    <div className="pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-9 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        onClick={() => {
                          setSelectedModels([]);
                          setSelectedStatuses([]);
                          setSelectedSources([]);
                        }}
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Navigation */}
          <div className="flex items-center gap-0.5 border rounded-full p-1 bg-white shadow-sm h-10">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-50" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Select
              value={currentDate.getMonth().toString()}
              onValueChange={(val) => {
                const month = parseInt(val);
                scrollToMonth(month);
                setCurrentDate(new Date(getYear(currentDate), month, 1));
              }}
            >
              <SelectTrigger className="h-8 border-none shadow-none text-sm font-black w-[110px] focus:ring-0 uppercase tracking-tight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl font-bold">
                {Array.from({ length: 12 }).map((_, i) => (
                  <SelectItem key={i} value={i.toString()} className="text-xs uppercase font-bold tracking-tight">
                    {format(new Date(2024, i, 1), 'MMMM')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-50" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Year Navigation */}
          <div className="flex items-center border rounded-full overflow-hidden bg-white shadow-sm h-10 p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-50" onClick={() => navigateYear('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 font-black text-sm min-w-[65px] text-center tracking-tighter">
              {format(currentDate, 'yyyy')}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-50" onClick={() => navigateYear('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 rounded-full text-xs font-black uppercase tracking-widest shadow-sm hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
            onClick={() => {
              const today = new Date();
              setCurrentDate(today);
              setTimeout(() => scrollToMonth(today.getMonth()), 100);
            }}
          >
            Today
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        <Card className={cn(
          "flex-1 flex flex-col border border-border bg-background shadow-sm overflow-hidden transition-all duration-300",
          isSidebarOpen ? "w-2/3" : "w-full"
        )}>
          <div className="w-full overflow-x-auto overflow-y-hidden relative custom-scrollbar h-full">
            <div className="inline-block min-w-full" style={{ width: totalGridWidth }}>
              <GridHeader
                yearMonths={yearMonths}
                daysInYear={daysInYear}
                isSameDayNow={isSameDayNow}
              />

              <div className="relative">
                {filteredBoats.map((boat) => (
                  <BoatRow
                    key={boat.id}
                    boat={boat}
                    modelName={houseboatModels.find(m => m.id === boat.model_id)?.name || ''}
                    daysInYear={daysInYear}
                    rowHeight={ROW_HEIGHT}
                    onMouseDown={handleCellMouseDown}
                    onMouseEnter={handleCellMouseEnter}
                    onCellClick={handleCellClick}
                    isSameDayNow={isSameDayNow}
                  />
                ))}

                <div className="absolute top-0 pointer-events-none" style={{ left: BOAT_COL_WIDTH }}>
                  {/* Drag Selection Preview */}
                  {dragStart && dragCurrent && (
                    <div
                      className="absolute bg-emerald-400/30 border-2 border-emerald-500/50 rounded-lg pointer-events-none z-10 animate-pulse"
                      style={(() => {
                        const boatIndex = filteredBoats.findIndex(b => b.id === dragStart.boatId);
                        const startD = new Date(dragStart.date);
                        startD.setHours(dragStart.slot === 'AM' ? 10 : 15);
                        const endD = new Date(dragCurrent.date);
                        endD.setHours(dragCurrent.slot === 'AM' ? 10 : 15);

                        const isBackward = isBefore(endD, startD);
                        const visualStart = isBackward ? endD : startD;
                        const visualEnd = isBackward ? startD : endD;

                        const yearStart = startOfYear(currentDate);
                        const dayOffsetStart = differenceInCalendarDays(visualStart, yearStart);
                        let startSlotIndex = dayOffsetStart * 2;
                        if (visualStart.getHours() >= 12) startSlotIndex += 1;

                        const dayOffsetEnd = differenceInCalendarDays(visualEnd, yearStart);
                        let endSlotIndex = dayOffsetEnd * 2;
                        if (visualEnd.getHours() >= 12) endSlotIndex += 1;

                        const left = startSlotIndex * SLOT_WIDTH;
                        const width = (endSlotIndex - startSlotIndex + 1) * SLOT_WIDTH;

                        return {
                          left: left + 1,
                          width: width - 2,
                          top: boatIndex * ROW_HEIGHT + 3,
                          height: Math.max(ROW_HEIGHT - 6, 24)
                        };
                      })()}
                    />
                  )}

                  {processedBookings.map((booking: any) => (
                    <BookingItem
                      key={booking.id}
                      booking={booking}
                      isHighlighted={highlightedId === booking.id}
                      onEdit={handleEditBooking}
                      onDelete={(b) => {
                        setDeletingBooking(b);
                        setIsDeleteDialogOpen(true);
                      }}
                      on360={(b) => {
                        setSelectedBookingFor360(b);
                        setIs360DialogOpen(true);
                      }}
                      getBoatName={getBoatName}
                      rowHeight={ROW_HEIGHT}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <BookingSidebar
          isOpen={isSidebarOpen}
          onClose={() => {
            setIsSidebarOpen(false);
            setEditingBooking(null);
          }}
          onSave={handleSaveBooking}
          onDelete={() => {
            if (editingBooking) {
              setDeletingBooking(editingBooking);
              setIsDeleteDialogOpen(true);
            }
          }}
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
        />
      </div>

      <Dialog open={is360DialogOpen} onOpenChange={setIs360DialogOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
          <DialogHeader className="px-6 py-4 border-b bg-slate-50/50 backdrop-blur-md">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 text-left">Customer 360 View</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium text-left">Comprehensive history and insights for this customer</DialogDescription>
            </div>
          </DialogHeader>
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            {selectedBookingFor360 && (
              <Customer360View
                clientEmail={selectedBookingFor360.clientEmail}
                clientName={selectedBookingFor360.clientName}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the reservation for <strong>{deletingBooking?.clientName}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingBooking(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Reservation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx global>{`
        @keyframes shining {
          0% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.05); filter: brightness(1.3); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        .animate-shining {
          animation: shining 1.5s ease-in-out infinite;
          z-index: 50 !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ddd;
          border-radius: 10px;
          border: 2px solid #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ccc;
        }
        /* Ensure the unit labels stay on top of the overlay shadows */
        .sticky.left-0 {
          z-index: 45 !important;
        }
      `}</style>
    </div>
  );
}
