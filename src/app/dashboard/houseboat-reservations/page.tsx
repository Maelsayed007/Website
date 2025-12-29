

'use client';

import { useState, useMemo, useRef, useEffect, useDeferredValue, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Ship, Search, Pencil, Trash2, GripVertical, Phone, Mail, FileDown, FileText, CheckCircle, XCircle, Calendar as CalendarIcon, Maximize2, Minimize2, User, CreditCard, Tag, Info, Clock, DollarSign, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import {
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  format,
  addYears,
  getYear,
  startOfMonth,
  endOfMonth,
  addMonths,
  getMonth,
  getDaysInMonth,
  differenceInCalendarDays,
  isSameDay,
  getHours,
  getMinutes,
  isAfter,
  isBefore,
  isEqual,
  min,
  max,
  parseISO,
  differenceInHours,
  isFriday,
  isSaturday,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useSupabase } from '@/components/providers/supabase-provider';
import { Textarea } from '@/components/ui/textarea';
import { generateCheckinManifest, generateFinancialSummary } from '@/lib/pdf-designs';
import { Badge } from '@/components/ui/badge';
import { logActivity } from '@/lib/actions';
import { Separator } from '@/components/ui/separator';
import type { Tariff, HouseboatModelPrice } from '@/lib/data-firestore';
import { DateRange } from 'react-day-picker';
import { Calendar as DatePicker } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const SLOT_WIDTH = 40;
const BOAT_COL_WIDTH = 200;
const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 100;

type DragAction = 'move' | 'resize-start' | 'resize-end';
type DragState = 'idle' | 'creating' | 'dragging'
type ViewMode = 'year' | 'month';

// Hoisted Types
type HouseboatModel = {
  id: string;
  name: string;
};

type Boat = {
  id: string;
  name: string;
  modelId: string;
  modelName: string;
}

type Booking = {
  id: string;
  houseboatId: string;
  clientName: string;
  startDate: Date;
  endDate: Date;
  status: 'Confirmed' | 'Pending' | 'Maintenance' | 'Cancelled';
  source?: string;
  clientPhone?: string;
  clientEmail?: string;
  notes?: string;
  price?: number;
  discount?: number;
  voucher?: string;
  initialPaymentAmount?: number;
  initialPaymentMethod?: string;
  extras?: any;
  startTime: string; // Legacy for PDF tools, required for type compatibility
  endTime: string;   // Legacy for PDF tools, required for type compatibility
};

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  /* ... */
}

type WebsiteSettings = {
  companyName: string;
  logoUrl: string;
  contactEmail: string;
  restaurantEmail: string;
  contactPhone1: string;
  contactPhone2: string;
  address: string;
  websiteUrl: string;
  pdfTermsAndConditions: string;
  pdfOtherDetails: string;
};

type UserPermissions = {
  isSuperAdmin?: boolean;
  canEditHouseboatReservations?: boolean;
}

export type ProcessedBooking = Booking & {
  startDate: Date;
  endDate: Date;
  left: number;
  width: number;
  top: number;
  boatIndex: number;
}

const getBookingColor = (status: Booking['status'], source: string = '') => {
  const normalizedSource = source?.toLowerCase() || '';

  if (status === 'Pending') {
    // Website pending = deeper red
    if (normalizedSource.includes('website')) return 'bg-red-800 border-red-900';
    return 'bg-red-500 border-red-600';
  }

  if (status === 'Confirmed') {
    if (normalizedSource.includes('amieira')) return 'bg-blue-500 border-blue-600';
    if (normalizedSource.includes('nicols')) return 'bg-orange-500 border-orange-600';
    if (normalizedSource.includes('ancorado')) return 'bg-purple-500 border-purple-600';
    if (normalizedSource.includes('diaria')) return 'bg-indigo-900 border-indigo-950'; // Navy blue
    return 'bg-blue-500 border-blue-600'; // Default confirmed
  }

  if (status === 'Maintenance') return 'bg-gray-500 border-gray-600';
  if (status === 'Cancelled') return 'bg-slate-700/50 border-slate-700';

  return 'bg-primary';
};

type Slot = 'AM' | 'PM';

const GanttChart = () => {
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const ganttContainerRef = useRef<HTMLDivElement>(null);

  const [userProfile, setUserProfile] = useState<{ permissions: UserPermissions, username: string } | null>(null);

  useEffect(() => {
    if (!user || !supabase) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setUserProfile(data);
    };
    fetchProfile();
  }, [user, supabase]);

  const isHardcodedAdmin = user?.email === 'myasserofficial@gmail.com';
  const canEdit = isHardcodedAdmin || userProfile?.permissions?.isSuperAdmin || userProfile?.permissions?.canEditHouseboatReservations;

  const showPermissionDeniedToast = () => {
    toast({
      variant: 'destructive',
      title: 'Permission Denied',
      description: "You don't have permission to perform this action.",
    });
  }

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('year');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedBookingId, setHighlightedBookingId] = useState<string | null>(searchParams.get('highlight'));

  const [isBookingSheetOpen, setIsBookingSheetOpen] = useState(false);

  const [isPdfRendering, setIsPdfRendering] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  const [modelFilter, setModelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const [bookingToDeleteId, setBookingToDeleteId] = useState<string | null>(null);

  const [bookingData, setBookingData] = useState<Partial<Booking> | null>(null);

  const [bookingCost, setBookingCost] = useState<{
    rentalTotal: number;
    discountAmount: number;
    total: number;
    weekdayNights: number;
    weekendNights: number;
    weekdayPrice: number;
    weekendPrice: number;
    tax: number;
    tariffDetails: { name: string; nights: number }[];
  } | null>(null);

  // Drag states
  const [dragState, setDragState] = useState<DragState>('idle');
  const [dragCreateStartDate, setDragCreateStartDate] = useState<Date | null>(null);
  const [dragCreateEndDate, setDragCreateEndDate] = useState<Date | null>(null);
  const [draggedBoatId, setDraggedBoatId] = useState<string | null>(null);
  const [isDragCreateInvalid, setIsDragCreateInvalid] = useState(false);
  const [activeDragAction, setActiveDragAction] = useState<{ action: DragAction; booking: ProcessedBooking } | null>(null);
  const [ghostBooking, setGhostBooking] = useState<ProcessedBooking | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);

  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [hoveredBoatIndex, setHoveredBoatIndex] = useState<number | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dynamicRowHeight, setDynamicRowHeight] = useState(ROW_HEIGHT);

  const headerRef = useRef<HTMLDivElement>(null);
  const boatColRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Data States
  const [houseboatModels, setHouseboatModels] = useState<HouseboatModel[]>([]);
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]); // Use simplified Booking type
  const [tariffs, setTariffs] = useState<Tariff[]>([]);

  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  const [allBoats, setAllBoats] = useState<Boat[]>([]);
  const [isLoadingBoats, setIsLoadingBoats] = useState(true);

  const [allPrices, setAllPrices] = useState<(HouseboatModelPrice & { modelId: string })[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchPopover, setClientSearchPopover] = useState(false);
  const [searchedClients, setSearchedClients] = useState<Client[]>([]);

  // Fetch Core Data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!supabase) return;

    if (!isRefresh) setIsLoadingBookings(true);

    try {
      // 1. Models
      const { data: models } = await supabase.from('houseboat_models').select('*');
      setHouseboatModels(models || []);

      // 2. Settings
      const { data: settings } = await supabase.from('site_settings').select('*').eq('key', 'main').single();
      if (settings?.data) setWebsiteSettings(settings.data);

      // 3. Bookings
      const { data: bookingsData } = await supabase.from('bookings').select('*');
      // Map snake_case database fields to camelCase application Model
      setBookings((bookingsData || []).map((b: any) => ({
        id: b.id,
        houseboatId: b.houseboat_id,
        clientName: b.client_name,
        startDate: new Date(b.start_time),
        endDate: new Date(b.end_time),
        status: b.status,
        source: b.source,
        clientPhone: b.client_phone,
        clientEmail: b.client_email,
        notes: b.notes,
        price: b.price,
        discount: b.discount,
        voucher: b.voucher,
        initialPaymentAmount: b.initial_payment_amount,
        initialPaymentMethod: b.initial_payment_method,
        extras: b.extras,
        startTime: b.start_time || '',
        endTime: b.end_time || ''
      })));

      // 4. Tariffs (if table exists or mock/migrate if needed)
      // For now assume tariffs table
      const { data: tariffsData } = await supabase.from('tariffs').select('*');
      setTariffs(tariffsData || []);

      // 5. Prices (now in houseboat_prices table)
      const { data: prices } = await supabase.from('houseboat_prices').select('*');
      setAllPrices((prices || []).map((p: any) => ({
        ...p,
        modelId: p.model_id,
        weekday: Number(p.weekday_price) || 0,
        weekend: Number(p.weekend_price) || 0,
        tariffId: p.tariff_id
      })));

      // 6. Boats (Implied from models or separate table? Schema had houseboat_models, do individual boats exist in SQL?)
      // Check schema: We didn't create 'boats' table, only 'houseboat_models'.
      // Firestore had subcollection 'boats'. We likely need a 'boats' table in Postgres if individual units differ.
      // FALLBACK: For migration, if we lack 'boats' table, assume 1-to-1 or use models as boats temporarily or create dummy boats.
      // Let's assume we need to fetch them if they exist.
      // Creating dummy list based on models for visual Gantt chart if no 'boats' table yet:
      if (models) {
        const derivedBoats: Boat[] = [];
        // Simulate specific boats if they were subcollections.
        // Ideally we need a 'boats' table. I added 'houseboat_models' to schema.
        // I'll create a 'houseboats' (units) table in next step if missing.
        // For now, let's just map models to boats directly 1-to-1 or check if we can query them.

        // Strictly fetch boat units from the 'boats' table
        const { data: units, error } = await supabase.from('boats').select('*');
        if (!error && units && units.length > 0) {
          setAllBoats(units.map((u: any) => ({
            id: u.id,
            name: u.name,
            modelId: u.model_id,
            modelName: models.find((m: any) => m.id === u.model_id)?.name || ''
          })));
        } else {
          // If no units are found, we don't fall back to models unless absolutely necessary for dev.
          // The user explicitly wants boat units only.
          console.log("No boats found in 'boats' table.");
          setAllBoats([]);
        }
      }

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoadingModels(false);
      setIsLoadingBookings(false);
      setIsLoadingBoats(false);
      setIsLoadingPrices(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    fetchData();

    // Setup Realtime Subscription for Bookings
    const channel = supabase.channel('realtime_bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        console.log('Realtime update:', payload);

        if (payload.eventType === 'INSERT') {
          const newBooking = payload.new as any;
          toast({
            title: "New Booking Received",
            description: `A new reservation for ${newBooking.client_name || 'a client'} has been added ${newBooking.source === 'Website' ? 'from the website' : ''}.`,
          });
        }

        // Refetch all bookings silently
        fetchData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchData, toast]);

  // Client Search Effect
  useEffect(() => {
    if (!supabase || clientSearch.length < 2) {
      setSearchedClients([]);
      return;
    }
    const searchClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .ilike('name', `%${clientSearch}%`)
        .limit(5);
      setSearchedClients(data || []);
    };
    const timeout = setTimeout(searchClients, 300);
    return () => clearTimeout(timeout);
  }, [clientSearch, supabase]);


  const handleClientSelect = (client: Client) => {
    setBookingData(prev => prev ? {
      ...prev,
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone
    } : null);
    setClientSearchPopover(false);
  }

  // Removed legacy fetchSubCollections/useEffect as it's handled above

  const handlePrev = () => setCurrentDate(viewMode === 'year' ? addYears(currentDate, -1) : addMonths(currentDate, -1));
  const handleNext = () => setCurrentDate(viewMode === 'year' ? addYears(currentDate, 1) : addMonths(currentDate, 1));

  const timelineInterval = useMemo(() => {
    if (viewMode === 'year') {
      return { start: startOfYear(currentDate), end: endOfYear(currentDate) };
    } else {
      return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  }, [currentDate, viewMode]);

  const daysInView = useMemo(() => eachDayOfInterval(timelineInterval), [timelineInterval]);

  const monthsInYear = useMemo(() => {
    if (viewMode !== 'year') return [];
    const months = [];
    let dayCounter = 0;
    for (let i = 0; i < 12; i++) {
      const monthStart = startOfMonth(new Date(getYear(currentDate), i, 1));
      const daysInMonth = getDaysInMonth(monthStart);
      months.push({
        name: format(monthStart, 'MMMM'),
        shortName: format(monthStart, 'MMM'),
        days: daysInMonth,
        startDayIndex: dayCounter,
      });
      dayCounter += daysInMonth;
    }
    return months;
  }, [currentDate, viewMode]);


  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    if (boatColRef.current) {
      boatColRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };


  const scrollToMonth = (monthIndex: number) => {
    setViewMode('year');
    if (!scrollContainerRef.current) return;
    const month = monthsInYear[monthIndex];
    if (month) {
      const scrollPosition = month.startDayIndex * SLOT_WIDTH * 2;
      scrollContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth',
      });
    }
  };

  const scrollToDate = (date: Date, onComplete?: () => void) => {
    const scrollAndHighlight = (targetDate: Date, onCompleteCallback?: () => void) => {
      if (!scrollContainerRef.current) return;
      const dayIndex = differenceInCalendarDays(targetDate, timelineInterval.start);
      const scrollPosition = dayIndex * SLOT_WIDTH * 2 - scrollContainerRef.current.offsetWidth / 2 + SLOT_WIDTH;

      let startTime: number | null = null;
      const startScroll = scrollContainerRef.current.scrollLeft;
      const duration = 500; // ms

      const animateScroll = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);

        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = startScroll + (scrollPosition - startScroll) * ease;
        }

        if (elapsed < duration) {
          requestAnimationFrame(animateScroll);
        } else {
          if (onCompleteCallback) {
            onCompleteCallback();
          }
        }
      };

      requestAnimationFrame(animateScroll);
    }

    if (getYear(date) !== getYear(currentDate) || (viewMode === 'month' && getMonth(date) !== getMonth(currentDate))) {
      setCurrentDate(date);
      setTimeout(() => scrollAndHighlight(date, onComplete), 100);
    } else {
      scrollAndHighlight(date, onComplete);
    }
  }

  const scrollToToday = () => {
    scrollToDate(new Date());
  };

  const filteredBoats = useMemo(() => {
    return (allBoats || []).filter(boat => {
      if (modelFilter === 'all') return true;
      return boat.modelId === modelFilter;
    });
  }, [modelFilter, allBoats]);

  useEffect(() => {
    if (isFullscreen && ganttContainerRef.current) {
      const calculateDynamicHeight = () => {
        const container = ganttContainerRef.current;
        if (!container) return;

        const availableHeight = window.innerHeight - HEADER_HEIGHT - 120; // 120px for filters and margins
        const calculatedHeight = Math.floor(availableHeight / filteredBoats.length);
        const newHeight = Math.max(40, Math.min(calculatedHeight, ROW_HEIGHT)); // Min 40px, max 56px

        setDynamicRowHeight(newHeight);
      };

      calculateDynamicHeight();
      window.addEventListener('resize', calculateDynamicHeight);

      return () => window.removeEventListener('resize', calculateDynamicHeight);
    } else {
      setDynamicRowHeight(ROW_HEIGHT);
    }
  }, [isFullscreen, filteredBoats.length]);


  const boatIdToIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    filteredBoats.forEach((boat, index) => {
      map.set(boat.id, index);
    });
    return map;
  }, [filteredBoats]);

  const processedBookings: ProcessedBooking[] = useMemo(() => {
    if (!bookings || !allBoats || allBoats.length === 0) return [];

    const heightToUse = isFullscreen ? dynamicRowHeight : ROW_HEIGHT;

    return bookings
      .filter(booking => {
        if (!booking.houseboatId || booking.status === 'Cancelled') return false;

        const boatForBooking = allBoats.find(b => b.id === booking.houseboatId);
        if (!boatForBooking || !boatIdToIndexMap.has(boatForBooking.id)) {
          return false;
        }

        if (statusFilter !== 'all' && booking.status !== statusFilter) {
          return false;
        }

        if (sourceFilter !== 'all' && booking.source !== sourceFilter) {
          return false;
        }

        // Logic for timeline visibility
        return isBefore(booking.startDate, timelineInterval.end) && isAfter(booking.endDate, timelineInterval.start);
      })
      .map(booking => {
        const startDate = booking.startDate;
        const endDate = booking.endDate;

        const startDayIndex = differenceInCalendarDays(startDate, timelineInterval.start);
        const startSlotIsPM = getHours(startDate) >= 12;
        const leftOffset = startDayIndex * 2 * SLOT_WIDTH + (startSlotIsPM ? SLOT_WIDTH : 0);

        let endDayIndex = differenceInCalendarDays(endDate, timelineInterval.start);
        // PM starts at 12:00, so if it ends exactly at 12:00, it's NOT in the PM slot
        const endSlotIsPM = getHours(endDate) > 12 || (getHours(endDate) === 12 && getMinutes(endDate) > 0);

        const startSlotIndex = (startDayIndex * 2) + (startSlotIsPM ? 1 : 0);
        const endSlotIndex = (endDayIndex * 2) + (endSlotIsPM ? 1 : 0);
        const slots = Math.max(1, endSlotIndex - startSlotIndex + 1);

        const width = slots * SLOT_WIDTH;
        const boatIndex = boatIdToIndexMap.get(booking.houseboatId!)!;
        const top = boatIndex * heightToUse;

        return { ...booking, startDate, endDate, left: leftOffset, width, top, boatIndex };
      });
  }, [bookings, allBoats, boatIdToIndexMap, statusFilter, sourceFilter, timelineInterval, isFullscreen, dynamicRowHeight]);

  useEffect(() => {
    if (searchParams.get('action') === 'new' && canEdit) {
      setBookingData({
        clientName: '',
        status: 'Pending',
      });
      setIsBookingSheetOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canEdit]);

  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && processedBookings.length > 0) {
      const bookingToHighlight = processedBookings.find(b => b.id === highlightId);
      if (bookingToHighlight) {
        scrollToDate(bookingToHighlight.startDate, () => {
          // Add a delay to ensure scrolling is complete before highlighting
          setTimeout(() => {
            setHighlightedBookingId(highlightId);
            // Remove highlight after a couple of seconds
            setTimeout(() => setHighlightedBookingId(null), 2500);
          }, 300);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, processedBookings]); // Depend on processedBookings to ensure data is loaded


  const searchResults = useMemo(() => {
    if (!deferredSearchQuery || !bookings) return [];
    return bookings.filter(booking =>
      booking.clientName.toLowerCase().includes(deferredSearchQuery.toLowerCase())
    ).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [deferredSearchQuery, bookings]);

  const handleSearchResultClick = (booking: Booking) => {
    setSearchQuery('');
    const startDate = booking.startDate;
    scrollToDate(startDate, () => {
      setTimeout(() => {
        setHighlightedBookingId(booking.id);
        setTimeout(() => {
          setHighlightedBookingId(null);
        }, 2000);
      }, 300);
    });
  };

  const getSlotFromPosition = (x: number, y: number): { date: Date, boatId: string, boatIndex: number } | null => {
    if (!scrollContainerRef.current) return null;

    const gridRect = scrollContainerRef.current.getBoundingClientRect();
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const scrollTop = scrollContainerRef.current.scrollTop;
    const mouseX = x - gridRect.left + scrollLeft;
    const mouseY = y - gridRect.top + scrollTop;

    const dayIndex = Math.floor(mouseX / (SLOT_WIDTH * 2));
    const slotInDay = Math.floor((mouseX % (SLOT_WIDTH * 2)) / SLOT_WIDTH);
    const slot: Slot = slotInDay === 0 ? 'AM' : 'PM';

    const boatIndex = Math.floor(mouseY / ROW_HEIGHT);
    const boat = filteredBoats[boatIndex];

    if (daysInView[dayIndex] && boat) {
      const date = getSlotDate(daysInView[dayIndex], slot);
      return { date, boatId: boat.id, boatIndex };
    }
    return null;
  }

  const getSlotDate = (day: Date, slot: Slot): Date => {
    const date = new Date(day);
    // AM: 9:00 AM, PM: 12:00 PM
    date.setHours(slot === 'AM' ? 9 : 12, 0, 0, 0);
    return date;
  };

  const getBookingForSlot = (boatId: string, day: Date, slot: Slot) => {
    return processedBookings.find(b => {
      if (b.houseboatId !== boatId) return false;
      const slotStart = getSlotDate(day, slot);
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotStart.getHours() + 4);
      const bookingStart = typeof b.startDate === 'string' ? parseISO(b.startDate) : b.startDate;
      const bookingEnd = typeof b.endDate === 'string' ? parseISO(b.endDate) : b.endDate;
      return isBefore(bookingStart, slotEnd) && isAfter(bookingEnd, slotStart);
    });
  }

  const handleMouseDownOnGrid = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canEdit || dragState !== 'idle' || isContextMenuOpen) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-booking-id]') || target.closest('[data-radix-popover-content]') || target.closest('[data-radix-context-menu-content]')) {
      return;
    }
    if (e.button !== 0) return;

    const slotInfo = getSlotFromPosition(e.clientX, e.clientY);
    if (!slotInfo) return;

    const existingBooking = processedBookings.find(b =>
      b.houseboatId === slotInfo.boatId &&
      isBefore(slotInfo.date, b.endDate) &&
      isAfter(new Date(slotInfo.date.getTime() + 1), b.startDate)
    );

    if (existingBooking) {
      return;
    }

    e.preventDefault();
    setDragState('creating');
    setIsDragCreateInvalid(false);
    setDragCreateStartDate(slotInfo.date);
    setDragCreateEndDate(slotInfo.date);
    setDraggedBoatId(slotInfo.boatId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canEdit || (dragState === 'idle' && !activeDragAction)) return;

    // If we have an active action but aren't dragging yet, check threshold
    if (dragState === 'idle' && activeDragAction && dragStartPos) {
      const dist = Math.sqrt(Math.pow(e.clientX - dragStartPos.x, 2) + Math.pow(e.clientY - dragStartPos.y, 2));
      if (dist > 5) {
        setDragState('dragging');
      } else {
        return; // Haven't moved enough yet
      }
    }

    const slotInfo = getSlotFromPosition(e.clientX, e.clientY);
    if (!slotInfo) return;

    if (dragState === 'creating') {
      setDragCreateEndDate(slotInfo.date);

      const start = min([dragCreateStartDate!, slotInfo.date]);
      const end = max([dragCreateStartDate!, slotInfo.date]);
      const isInvalid = processedBookings.some(b =>
        b.houseboatId === draggedBoatId && isBefore(start, b.endDate) && isAfter(end, b.startDate)
      );
      setIsDragCreateInvalid(isInvalid);

    } else if (dragState === 'dragging' && activeDragAction) {
      let { action, booking } = activeDragAction;
      let newStartDate = new Date(booking.startDate);
      let newEndDate = new Date(booking.endDate);

      if (action === 'move') {
        const duration = booking.endDate.getTime() - booking.startDate.getTime();
        newStartDate = new Date(slotInfo.date.getTime() - dragStartOffset);
        newEndDate = new Date(newStartDate.getTime() + duration);
        // Snapping the end to the slot boundary
        if (getHours(newEndDate) > 12 || (getHours(newEndDate) === 12 && getMinutes(newEndDate) > 0)) {
          newEndDate.setHours(17, 0, 0, 0);
        } else {
          newEndDate.setHours(12, 0, 0, 0);
        }
      } else if (action === 'resize-end') {
        newEndDate = new Date(slotInfo.date);
        if (getHours(newEndDate) >= 12) {
          newEndDate.setHours(17, 0, 0, 0);
        } else {
          newEndDate.setHours(12, 0, 0, 0);
        }
        if (isBefore(newEndDate, newStartDate)) newEndDate = newStartDate;
      } else if (action === 'resize-start') {
        newStartDate = slotInfo.date;
        if (isAfter(newStartDate, newEndDate)) newEndDate = newStartDate;
      }

      const startDayIndex = differenceInCalendarDays(newStartDate, timelineInterval.start);
      const startSlotIsPM = getHours(newStartDate) >= 12;
      const left = startDayIndex * 2 * SLOT_WIDTH + (startSlotIsPM ? SLOT_WIDTH : 0);

      const endDayIndex = differenceInCalendarDays(newEndDate, timelineInterval.start);
      const endSlotIsPM = getHours(newEndDate) >= 12;

      let slots = (endDayIndex - startDayIndex) * 2;
      if (startSlotIsPM) slots--;
      if (endSlotIsPM) slots++; else slots++;

      const width = Math.max(1, slots) * SLOT_WIDTH;
      const top = slotInfo.boatIndex * ROW_HEIGHT;

      setGhostBooking({
        ...booking,
        startDate: newStartDate,
        endDate: newEndDate,
        houseboatId: slotInfo.boatId,
        boatIndex: slotInfo.boatIndex,
        top,
        left,
        width
      });
    }
  };

  const handleMouseUpOnGrid = async (e: React.MouseEvent) => {
    if (!canEdit) return;

    if (dragState === 'creating') {
      if (!dragCreateStartDate || !dragCreateEndDate || !draggedBoatId || isDragCreateInvalid) {
        resetDragCreate();
        if (isDragCreateInvalid) {
          toast({ variant: 'destructive', title: 'Booking Conflict', description: 'The selected date range overlaps with an existing booking.' });
        }
        return;
      }

      const finalStart = min([dragCreateStartDate, dragCreateEndDate]) as Date;
      const lastSelected = max([dragCreateStartDate, dragCreateEndDate]) as Date;

      const finalEnd = new Date(lastSelected);
      // AM ends at 12:00, PM ends at 17:00 (5 PM)
      if (getHours(lastSelected) >= 12) {
        finalEnd.setHours(17, 0, 0, 0);
      } else {
        finalEnd.setHours(12, 0, 0, 0);
      }

      resetDragCreate();

      setTimeout(() => {
        setBookingData({
          houseboatId: draggedBoatId,
          startDate: finalStart,
          endDate: finalEnd,
          clientName: '',
          status: 'Pending',
        });
        setIsBookingSheetOpen(true);
      }, 50);

    } else if (dragState === 'dragging' && activeDragAction && ghostBooking) {
      if (!supabase || !user) {
        resetDragAction();
        return;
      }

      // Check permissions again if strict

      const collision = processedBookings.find(b =>
        b.id !== ghostBooking.id &&
        b.houseboatId === ghostBooking.houseboatId &&
        isBefore(ghostBooking.startDate, b.endDate) &&
        isAfter(ghostBooking.endDate, b.startDate)
      );

      if (collision) {
        toast({ variant: 'destructive', title: "Booking Conflict", description: `Cannot move booking here, it conflicts with ${collision.clientName}'s booking.` });
      } else {
        try {
          const { error } = await supabase
            .from('bookings')
            .update({
              start_time: ghostBooking.startDate.toISOString(),
              end_time: ghostBooking.endDate.toISOString(),
              houseboat_id: ghostBooking.houseboatId,
              updated_at: new Date().toISOString()
            })
            .eq('id', ghostBooking.id);

          if (error) throw error;

          toast({ title: 'Booking Updated', description: 'Booking successfully moved.' });

          fetchData(true); // Refresh silently

          // Log activity
          // logActivity not customized for Supabase yet, might skip or update later

        } catch (error: any) {
          console.error("Error updating booking:", error);
          toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        }
      }
      resetDragAction();
    } else if (activeDragAction && dragState === 'idle') {
      // It was a click, not a drag movement
      openEditDialog(activeDragAction.booking);
      resetDragAction();
    }
  };

  const resetDragCreate = () => {
    setDragState('idle');
    setDragCreateStartDate(null);
    setDragCreateEndDate(null);
    setDraggedBoatId(null);
    setIsDragCreateInvalid(false);
  };

  const resetDragAction = () => {
    setDragState('idle');
    setActiveDragAction(null);
    setGhostBooking(null);
    setDragStartOffset(0);
    setDragStartPos(null);
  }

  const openEditDialog = (booking: ProcessedBooking) => {
    if (!canEdit) {
      showPermissionDeniedToast();
      return;
    }
    setBookingData({
      id: booking.id,
      houseboatId: booking.houseboatId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      clientName: booking.clientName,
      status: booking.status,
      source: booking.source,
      clientEmail: booking.clientEmail,
      clientPhone: booking.clientPhone,
      notes: booking.notes,
      price: booking.price,
      discount: booking.discount,
      voucher: booking.voucher,
      initialPaymentAmount: booking.initialPaymentAmount,
      initialPaymentMethod: booking.initialPaymentMethod,
      extras: booking.extras,
    });
    setIsBookingSheetOpen(true);
  };

  // --- Price Calculation Logic ---
  const getActiveTariffForDate = (date: Date): Tariff | null => {
    if (!tariffs) return null;
    const currentMonthDay = format(date, 'MM-dd');
    for (const tariff of tariffs) {
      for (const period of tariff.periods) {
        if (period.start > period.end) { // Handles periods crossing the new year
          if (currentMonthDay >= period.start || currentMonthDay <= period.end) return tariff;
        } else {
          if (currentMonthDay >= period.start && currentMonthDay <= period.end) return tariff;
        }
      }
    }
    return tariffs.find(t => t.name.toLowerCase().includes('low')) || tariffs[0] || null;
  };

  const getPriceForTariff = (tariffId: string, modelId: string) => {
    return allPrices.find(p => p.tariffId === tariffId && p.modelId === modelId) || null;
  };

  const calculateCosts = () => {
    if (!bookingData?.startDate || !bookingData.endDate || !bookingData.houseboatId) {
      setBookingCost(null);
      return;
    }

    const start = bookingData.startDate;
    const end = bookingData.endDate;

    let weekdayNights = 0;
    let weekendNights = 0;
    let weekdayPrice = 0;
    let weekendPrice = 0;
    let tax = 0; // Initialize tax
    let rentalTotal = 0;

    const nights = differenceInCalendarDays(end, start);
    if (nights <= 0) {
      setBookingCost(null);
      return;
    }

    // Find price for this boat model
    const boat = allBoats.find(b => b.id === bookingData.houseboatId);
    if (boat) {
      // Handle potential case difference or field naming (modelId vs model_id)
      const price = allPrices.find(p => p.modelId === boat.modelId || (p as any).model_id === boat.modelId);
      if (price) {
        // Ensure numbers (already mapped in fetchData but safe to double check or just use property)
        weekdayPrice = price.weekday || 0;
        weekendPrice = price.weekend || 0;
      }
    }

    // Calculate nights
    const days = eachDayOfInterval({ start, end });
    // Remove last day as it's checkout
    if (days.length > 0) days.pop();

    days.forEach(day => {
      if (isFriday(day) || isSaturday(day)) {
        weekendNights++;
      } else {
        weekdayNights++;
      }
    });

    rentalTotal = (weekdayNights * weekdayPrice) + (weekendNights * weekendPrice);

    // The tax value was hardcoded as 76.00 in the original code.
    // If it should be dynamic, this needs to be fetched or calculated.
    // For now, keeping it as a constant or from settings if available.
    tax = 76.00;

    const preDiscountTotal = rentalTotal + tax;
    const discountPercentage = Number(bookingData.discount) || 0; // Ensure discount is a number
    const discountAmount = preDiscountTotal * (discountPercentage / 100);
    const total = preDiscountTotal - discountAmount;

    setBookingCost({
      rentalTotal,
      discountAmount,
      total,
      weekdayNights,
      weekendNights,
      weekdayPrice,
      weekendPrice,
      tax,
      tariffDetails: [] // This part of the original logic was removed, so setting to empty array
    });
  };

  useEffect(() => {
    calculateCosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingData?.startDate, bookingData?.endDate, bookingData?.houseboatId, bookingData?.discount, allBoats, tariffs, allPrices]);
  // --- End Price Calculation ---


  const handleSaveBooking = async () => {
    if (!canEdit) {
      showPermissionDeniedToast();
      return;
    }

    if (!supabase || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'System not ready. Please try again.',
      });
      return;
    }

    if (!bookingData) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No booking data found.',
      });
      return;
    }

    const clientName = bookingData.clientName?.trim();
    if (!clientName) {
      toast({
        variant: 'destructive',
        title: 'Client name is required',
        description: 'Please enter a name for the client to save the booking.',
      });
      return;
    }

    if (!bookingData.houseboatId) {
      toast({
        variant: 'destructive',
        title: 'Boat is required',
        description: 'Please select a boat for this booking.',
      });
      return;
    }

    if (!bookingData.startDate || !bookingData.endDate) {
      toast({
        variant: 'destructive',
        title: 'Dates are required',
        description: 'Please select check-in and check-out dates.',
      });
      return;
    }

    if (bookingData.status === 'Confirmed' && bookingCost?.total) {
      const paid = bookingData.initialPaymentAmount || 0;
      if (paid < bookingCost.total * 0.3) {
        toast({
          variant: 'destructive',
          title: 'Payment Required',
          description: `A payment of at least 30% of the total price (€${(bookingCost.total * 0.3).toFixed(2)}) is required to confirm this booking.`,
        });
        return;
      }
    }

    // Map to Supabase snake_case schema
    const dataToSave: any = {
      houseboat_id: bookingData.houseboatId,
      start_time: bookingData.startDate.toISOString(),
      end_time: bookingData.endDate.toISOString(),
      client_name: clientName,
      status: bookingData.status,
      source: bookingData.source,
      client_email: bookingData.clientEmail,
      client_phone: bookingData.clientPhone,
      notes: bookingData.notes,
      price: bookingCost?.total ?? bookingData.price ?? 0,
      discount: bookingData.discount,
      voucher: bookingData.voucher,
      initial_payment_amount: bookingData.initialPaymentAmount,
      initial_payment_method: bookingData.initialPaymentMethod,
      extras: bookingData.extras,
    };

    if (!bookingData.id) {
      dataToSave.id = uuidv4();
    }

    // Remove undefined values
    Object.keys(dataToSave).forEach(key => {
      if (dataToSave[key] === undefined) {
        delete dataToSave[key];
      }
    });

    try {
      if (bookingData.id) {
        // UPDATE
        const { error } = await supabase
          .from('bookings')
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq('id', bookingData.id);

        if (error) throw error;

        toast({
          title: 'Booking Updated',
          description: `Successfully updated booking for ${clientName}`,
        });
      } else {
        // CREATE
        const { error } = await supabase
          .from('bookings')
          .insert([dataToSave]);

        if (error) throw error;

        toast({
          title: 'Booking Created',
          description: `Successfully created booking for ${clientName}`,
        });
      }
      setBookingData(null);
      setIsBookingSheetOpen(false);
      fetchData(true); // Refresh silently
    } catch (error: any) {
      console.error("Booking save error details:", error);
      const detail = error.message || error.details || "Check console for details";
      const hint = error.hint ? ` (Hint: ${error.hint})` : "";
      toast({
        title: "Error Saving Booking",
        description: `Failed to save: ${detail}${hint}`,
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (bookingId: string, clientName: string, status: Booking['status']) => {
    if (!canEdit) {
      showPermissionDeniedToast();
      return;
    }
    if (!supabase || !user) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: status })
        .eq('id', bookingId);

      if (error) throw error;

      await fetchData(true); // IsRefresh = true
      toast({ title: 'Success', description: `Status changed to ${status}` });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to update status', variant: "destructive" });
    }
  };

  const handleExportPdf = (type: 'checkin' | 'financial', booking: ProcessedBooking) => {
    const boat = allBoats.find(b => b.id === booking.houseboatId);
    if (!boat || !websiteSettings) {
      toast({
        variant: 'destructive',
        title: 'PDF Export Failed',
        description: 'Could not find required boat or settings information.',
      });
      return;
    }

    setIsPdfRendering(true);

    setTimeout(() => {
      try {
        if (type === 'checkin') {
          generateCheckinManifest(booking, boat, websiteSettings);
        } else if (type === 'financial') {
          generateFinancialSummary(booking, boat, websiteSettings);
        }
      } catch (error) {
        console.error("PDF generation error:", error);
        toast({
          variant: 'destructive',
          title: 'PDF Generation Error',
          description: 'There was a problem creating the PDF file.',
        });
      } finally {
        setIsPdfRendering(false);
      }
    }, 50);
  };

  const isSlotInDragRange = (day: Date, slot: Slot, boatId: string) => {
    if (!dragCreateStartDate || !dragCreateEndDate || !draggedBoatId || draggedBoatId !== boatId || dragState !== 'creating') return false;

    const currentSlotDate = getSlotDate(day, slot);
    const start = min([dragCreateStartDate, dragCreateEndDate]);
    const end = max([dragCreateStartDate, dragCreateEndDate]);

    return isEqual(currentSlotDate, start) || isEqual(currentSlotDate, end) || (isAfter(currentSlotDate, start) && isBefore(currentSlotDate, end));
  };

  const handleBookingMouseDown = (e: React.MouseEvent, action: DragAction, booking: ProcessedBooking) => {
    e.stopPropagation();
    if (!canEdit) return;
    if (e.button !== 0) return;

    // We don't set 'dragging' state yet, we wait for movement threshold
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setActiveDragAction({ action, booking });

    if (action === 'move') {
      const slotInfo = getSlotFromPosition(e.clientX, e.clientY);
      if (slotInfo) {
        const offset = slotInfo.date.getTime() - booking.startDate.getTime();
        setDragStartOffset(offset);
      }
    }
  };

  const currentRowHeight = isFullscreen ? dynamicRowHeight : ROW_HEIGHT;
  const timelineWidth = daysInView.length * SLOT_WIDTH * 2;
  const timelineHeight = filteredBoats.length * currentRowHeight;
  const showSearchResults = isSearchFocused && searchQuery && searchResults.length > 0;
  const isLoading = isLoadingModels || isLoadingBoats || isLoadingBookings || isLoadingPrices;

  const currentViewFormat = viewMode === 'year' ? 'yyyy' : 'MMMM yyyy';

  // Helper for Month Select
  const currentMonthIndex = getMonth(currentDate).toString();
  const handleMonthSelect = (value: string) => {
    scrollToMonth(parseInt(value));
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Full Screen Houseboat Calendar */}
      <TooltipProvider>
        <Card className="flex-grow w-full border border-border shadow-elevation rounded-xl flex flex-col overflow-hidden">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b bg-background z-20 shrink-0">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Houseboat Reservation Calendar
              </h1>
              <p className="text-muted-foreground">
                View and manage all houseboat bookings for the year.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">

              {/* View Mode */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === 'year' ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('year')}
                  className="h-7 text-xs"
                >
                  Year
                </Button>
                <Button
                  variant={viewMode === 'month' ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="h-7 text-xs"
                >
                  Month
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Navigation Group */}
              <div className="flex items-center gap-1">
                {/* Year Selector / Display */}
                <div className="flex items-center border rounded-md overflow-hidden">
                  <Button variant="ghost" size="icon" onClick={handlePrev} className="h-9 w-9 rounded-none border-r">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="px-3 min-w-[60px] text-center font-medium text-sm">
                    {format(currentDate, 'yyyy')}
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleNext} className="h-9 w-9 rounded-none border-l">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Month Selector (Dropdown) */}
                {viewMode === 'year' && (
                  <Select onValueChange={handleMonthSelect} value={currentMonthIndex}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Jump to Month" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-950 border-border shadow-md">
                      {monthsInYear.map((month, index) => (
                        <SelectItem key={month.name} value={index.toString()}>
                          {month.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button variant="outline" onClick={scrollToToday}>
                  Today
                </Button>
              </div>

            </div>
          </div>

          {/* Filters & Search Row */}
          <div className="flex flex-col sm:flex-row gap-3 p-2 bg-muted/30 border-b items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input
                placeholder="Search client..."
                className="pl-9 bg-background"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
              />
              {showSearchResults && (
                <Card className="absolute top-full mt-2 w-full z-50 max-h-60 overflow-y-auto shadow-xl bg-popover text-popover-foreground">
                  <CardContent className="p-2">
                    <ul>
                      {searchResults.map(booking => (
                        <li
                          key={booking.id}
                          className="px-3 py-2 text-sm hover:bg-accent rounded-md cursor-pointer"
                          onClick={() => handleSearchResultClick(booking)}
                        >
                          <p className="font-semibold">{booking.clientName}</p>
                          <p className="text-muted-foreground text-xs">
                            {allBoats?.find(b => b.id === booking.houseboatId)?.name}
                            {' - '}
                            {format(booking.startDate, 'MMM d')}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant={isFullscreen ? "secondary" : "outline"}
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>

              <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="All Models" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 border-border shadow-md">
                  <SelectItem value="all">All Models</SelectItem>
                  {houseboatModels?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 border-border shadow-md">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[130px] bg-background">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 border-border shadow-md">
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Phone">Phone</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <CardContent className="shrink-0 p-0 grid grid-cols-[auto,1fr] grid-rows-[auto,1fr] overflow-hidden bg-background relative border-t-0 border-b">
            <div
              className="p-2 font-semibold border-b border-r flex items-end bg-card sticky top-0 left-0 z-40"
              style={{ width: `${BOAT_COL_WIDTH}px`, height: `${HEADER_HEIGHT}px` }}
            >
              <span>Boat</span>
            </div>

            <div ref={headerRef} className="overflow-hidden border-b bg-card sticky top-0 z-30">
              <div className="relative flex flex-col" style={{ width: `${timelineWidth}px`, height: `${HEADER_HEIGHT}px` }}>
                <div className="flex" style={{ height: '36px' }}>
                  {viewMode === 'year' ? monthsInYear.map(month => (
                    <div
                      key={month.name}
                      className="text-center p-2 font-semibold text-sm border-r flex items-center justify-center"
                      style={{ minWidth: `${month.days * SLOT_WIDTH * 2}px` }}
                    >
                      {month.name}
                    </div>
                  )) : (
                    <div className="text-center p-2 font-semibold text-sm border-r flex items-center justify-center" style={{ minWidth: '100%' }}>
                      {format(currentDate, 'MMMM yyyy')}
                    </div>
                  )}
                </div>
                <div
                  className="grid bg-card border-b"
                  style={{
                    gridTemplateColumns: `repeat(${daysInView.length}, ${SLOT_WIDTH * 2}px)`,
                    height: '38px',
                  }}
                >
                  {daysInView.map((day, i) => (
                    <div
                      key={i}
                      className={cn(
                        'text-center py-1 text-xs border-r border-slate-400 dark:border-slate-600 transition-colors duration-150',
                        {
                          'bg-blue-100 dark:bg-blue-900/50': isSameDay(day, new Date()),
                          'bg-blue-50 dark:bg-blue-950/50': hoveredDayIndex === i && !isSameDay(day, new Date()),
                        }
                      )}
                    >
                      {format(day, 'EEE')}
                      <div className="font-semibold text-base leading-tight">{format(day, 'd')}</div>
                    </div>
                  ))}
                </div>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${daysInView.length * 2}, ${SLOT_WIDTH}px)`, height: '26px' }}>
                  {Array.from({ length: daysInView.length * 2 }).map((_, i) => (
                    <div key={i} className={cn('text-center p-1 font-normal text-xs border-r border-slate-400 dark:border-slate-600 bg-card flex items-center justify-center', { 'bg-muted/30': i % 2 !== 0 })}>
                      {i % 2 === 0 ? 'AM' : 'PM'}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              ref={boatColRef}
              className="overflow-hidden border-r bg-card sticky left-0 z-20"
              style={{ width: `${BOAT_COL_WIDTH}px` }}
            >
              <div className="relative" style={{ height: `${timelineHeight}px` }}>
                {filteredBoats.map((boat, index) => (
                  <div
                    key={boat.id}
                    className={cn(
                      "p-2 font-medium flex items-center border-b truncate transition-colors duration-150",
                      {
                        'bg-amber-50 dark:bg-amber-950/50': hoveredBoatIndex === index,
                      }
                    )}
                    style={{
                      height: `${currentRowHeight}px`,
                      position: 'absolute',
                      top: `${index * currentRowHeight}px`,
                      width: '100%',
                    }}
                  >
                    {boat.name}
                  </div>
                ))}
              </div>
            </div>

            <div
              ref={scrollContainerRef}
              className="overflow-auto"
              onScroll={handleScroll}
              onMouseLeave={resetDragAction}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOnGrid}
              onMouseDown={handleMouseDownOnGrid}
            >
              <div className="relative" style={{ width: `${timelineWidth}px`, height: `${timelineHeight}px` }}>
                <div
                  className="absolute top-0 left-0 grid bg-white dark:bg-zinc-950"
                  style={{
                    width: `${timelineWidth}px`,
                    height: `${timelineHeight}px`,
                    gridTemplateColumns: `repeat(${daysInView.length * 2}, ${SLOT_WIDTH}px)`,
                    gridTemplateRows: `repeat(${filteredBoats.length}, ${currentRowHeight}px)`
                  }}
                  onMouseLeave={() => {
                    setHoveredDayIndex(null);
                    setHoveredBoatIndex(null);
                  }}
                >
                  {Array.from({ length: daysInView.length * 2 * filteredBoats.length }).map((_, i) => {
                    const slotIndex = i % (daysInView.length * 2);
                    const dayIndex = Math.floor(slotIndex / 2);
                    const day = daysInView[dayIndex];
                    const slot = (slotIndex % 2) === 0 ? 'AM' : 'PM';
                    const boatIndex = Math.floor(i / (daysInView.length * 2));
                    const boat = filteredBoats[boatIndex];
                    const isDraggingSlot = boat ? isSlotInDragRange(day, slot, boat.id) : false;

                    const isLastSlotOfDay = (slotIndex % 2) === 1;
                    const isHoveredColumn = hoveredDayIndex === dayIndex;
                    const isHoveredRow = hoveredBoatIndex === boatIndex;

                    return (
                      <div
                        key={i}
                        className={cn(
                          'border-r border-b border-slate-400 dark:border-slate-600 transition-colors duration-150',
                          {
                            'cursor-grab': canEdit && !isDragCreateInvalid,
                            'bg-destructive/50': isDraggingSlot && isDragCreateInvalid,
                            'bg-green-300/50 dark:bg-green-700/50': isDraggingSlot && !isDragCreateInvalid,
                            'border-r': isLastSlotOfDay,
                            'bg-blue-50/50 dark:bg-blue-950/30': isHoveredColumn && !isDraggingSlot,
                            'bg-amber-50/50 dark:bg-amber-950/30': isHoveredRow && !isDraggingSlot,
                            'bg-blue-100/70 dark:bg-blue-900/50': isHoveredColumn && isHoveredRow && !isDraggingSlot,
                          }
                        )}
                        onMouseEnter={() => {
                          setHoveredDayIndex(dayIndex);
                          setHoveredBoatIndex(boatIndex);
                        }}
                      />
                    );
                  })}
                </div>

                <div className="absolute top-0 left-0 h-full w-full">
                  {processedBookings.map(booking => {
                    const isPending = booking.status === 'Pending';
                    const isExpired = isPending && differenceInHours(new Date(), booking.startDate) > 48;

                    return (
                      <ContextMenu key={booking.id} onOpenChange={setIsContextMenuOpen}>
                        <Tooltip>
                          <ContextMenuTrigger asChild>
                            <TooltipTrigger asChild>
                              <div
                                data-booking-id={booking.id}
                                className={cn(
                                  'absolute top-1 flex items-center text-white rounded-md text-xs font-medium z-10 transition-all duration-300 group shadow-sm border',
                                  getBookingColor(booking.status, booking.source),
                                  { 'ring-2 ring-yellow-400': highlightedBookingId === booking.id },
                                  { 'cursor-grabbing': canEdit && activeDragAction?.action === 'move' && activeDragAction?.booking?.id === booking.id },
                                  { 'opacity-80': isExpired }
                                )}
                                style={{
                                  left: `${booking.left}px`,
                                  width: `${booking.width - 4}px`,
                                  top: `${booking.top + 4}px`,
                                  height: `calc(${currentRowHeight}px - 8px)`,
                                }}
                              >
                                <div
                                  className={cn("h-full w-full flex-grow flex items-center justify-center text-center px-2 truncate", { "cursor-grab": canEdit && !activeDragAction })}
                                  onMouseDown={(e) => handleBookingMouseDown(e, 'move', booking)}
                                >
                                  <span className="w-full h-full flex items-center justify-center pointer-events-none">{booking.clientName}</span>
                                </div>
                                <div
                                  data-resize-handle="start"
                                  onMouseDown={(e) => {
                                    handleBookingMouseDown(e, 'resize-start', booking)
                                  }}
                                  className={cn("absolute left-0 top-0 h-full w-2 flex items-center justify-center", { "cursor-col-resize opacity-0 group-hover:opacity-100": canEdit })}
                                >
                                  {canEdit && <GripVertical size={12} className='text-white/50' />}
                                </div>
                                <div
                                  data-resize-handle="end"
                                  onMouseDown={(e) => {
                                    handleBookingMouseDown(e, 'resize-end', booking)
                                  }}
                                  className={cn("absolute right-0 top-0 h-full w-2 flex items-center justify-center", { "cursor-col-resize opacity-0 group-hover:opacity-100": canEdit })}
                                >
                                  {canEdit && <GripVertical size={12} className='text-white/50' />}
                                </div>
                              </div>
                            </TooltipTrigger>
                          </ContextMenuTrigger>
                          <TooltipContent className="bg-white dark:bg-zinc-950 text-popover-foreground border border-border shadow-md z-50">
                            <div className="grid gap-2 text-sm max-w-xs">
                              <p className="font-bold">{booking.clientName}</p>
                              <p className="text-muted-foreground">{allBoats?.find(b => b.id === booking.houseboatId)?.name}</p>
                              <Separator />
                              <div className="flex justify-between">
                                <span>From:</span> <span>{format(booking.startDate, 'MMM d, h:mm a')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>To:</span> <span>{format(booking.endDate, 'MMM d, h:mm a')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Status:</span> <Badge variant={isExpired ? "destructive" : "outline"} className={cn({ 'border-0 text-white': !isExpired }, getBookingColor(booking.status, booking.source))}>
                                  {isExpired ? 'Expired' : booking.status}
                                </Badge>
                              </div>
                            </div>
                          </TooltipContent>
                          <ContextMenuContent className="w-64 bg-white dark:bg-zinc-950 border-border shadow-md text-popover-foreground" onCloseAutoFocus={(e) => e.preventDefault()}>
                            <ContextMenuItem inset onSelect={() => {
                              setIsContextMenuOpen(false);
                              setTimeout(() => {
                                openEditDialog(booking);
                              }, 100);
                            }} disabled={!canEdit}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit Booking
                            </ContextMenuItem>
                            <ContextMenuSub>
                              <ContextMenuSubTrigger inset disabled={!canEdit}>
                                <CheckCircle className="mr-2 h-4 w-4" />Change Status
                              </ContextMenuSubTrigger>
                              <ContextMenuPortal>
                                <ContextMenuSubContent className="w-48 bg-popover border-border shadow-md text-popover-foreground">
                                  <ContextMenuItem onSelect={() => {
                                    handleStatusChange(booking.id, booking.clientName, 'Confirmed');
                                    setIsContextMenuOpen(false);
                                  }}>Confirmed</ContextMenuItem>
                                  <ContextMenuItem onSelect={() => {
                                    handleStatusChange(booking.id, booking.clientName, 'Pending');
                                    setIsContextMenuOpen(false);
                                  }}>Pending</ContextMenuItem>
                                  <ContextMenuItem onSelect={() => {
                                    handleStatusChange(booking.id, booking.clientName, 'Maintenance');
                                    setIsContextMenuOpen(false);
                                  }}>Maintenance</ContextMenuItem>
                                  <ContextMenuItem onSelect={() => {
                                    handleStatusChange(booking.id, booking.clientName, 'Cancelled');
                                    setIsContextMenuOpen(false);
                                  }} className="text-destructive">Cancelled</ContextMenuItem>
                                </ContextMenuSubContent>
                              </ContextMenuPortal>
                            </ContextMenuSub>
                            <ContextMenuSeparator />
                            <ContextMenuItem inset onSelect={(e) => {
                              e.preventDefault();
                              handleExportPdf('checkin', booking);
                            }} disabled={isPdfRendering}>
                              <FileText className="mr-2 h-4 w-4" /> {isPdfRendering ? 'Exporting...' : 'Check-in Manifest'}
                            </ContextMenuItem>
                            <ContextMenuItem inset onSelect={(e) => {
                              e.preventDefault();
                              handleExportPdf('financial', booking);
                            }} disabled={isPdfRendering}>
                              <FileText className="mr-2 h-4 w-4" /> {isPdfRendering ? 'Exporting...' : 'Financial Summary'}
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </Tooltip>
                      </ContextMenu>
                    );
                  })}

                  {ghostBooking && (
                    <div
                      className={cn(
                        'absolute top-1 rounded-md px-2 py-1 text-xs font-medium z-20 pointer-events-none',
                        'bg-slate-400/50 border-2 border-dashed border-slate-500'
                      )}
                      style={{
                        left: `${ghostBooking.left}px`,
                        width: `${ghostBooking.width - 4}px`,
                        top: `${ghostBooking.top + 4}px`,
                        height: `calc(${currentRowHeight}px - 8px)`,
                      }}
                    />
                  )}
                </div>

                {(isLoading || filteredBoats.length === 0) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-40">
                    <p className="text-muted-foreground">
                      {isLoading ? "Loading reservations..." : "No boats match your filter."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Sheet
          key={bookingData?.id || 'new-booking'}
          open={isBookingSheetOpen}
          onOpenChange={(isOpen: boolean) => {
            setIsBookingSheetOpen(isOpen);
            if (!isOpen) {
              resetDragCreate();
              setBookingData(null);
            }
          }}
          modal={false}
        >
          <SheetContent className={cn("max-w-md w-full flex flex-col p-0 bg-background border-l shadow-2xl overflow-hidden", isFullscreen && "z-[60]")}>
            <SheetHeader className="p-5 pb-3 bg-slate-50/80 dark:bg-slate-900/80 border-b shrink-0 text-left">
              <SheetTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{bookingData?.id ? 'Edit Booking' : 'Create New Booking'}</SheetTitle>
              <SheetDescription className="text-slate-500 font-medium text-[10px] flex items-center flex-wrap gap-2 mt-1 uppercase tracking-wider">
                <span className="text-primary font-bold flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded-md"><Ship className="h-3 w-3" /> {allBoats?.find(b => b.id === bookingData?.houseboatId)?.name || 'Select a boat'}</span>
                {bookingData?.startDate && (
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200/50 dark:border-slate-700/50">
                    <CalendarIcon className="h-2.5 w-2.5" />
                    {format(bookingData.startDate, 'MMM d')} — {bookingData?.endDate && format(bookingData.endDate, 'MMM d')}
                  </span>
                )}
              </SheetDescription>
            </SheetHeader>
            {bookingData && (
              <div className="flex-grow overflow-y-auto p-4 scroll-smooth">
                <div className="space-y-3">
                  {/* Section: Client - ALWAYS VISIBLE */}
                  <div className="bg-slate-50/30 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Client Info</h3>
                    </div>

                    <div className="grid gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="client-name-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Full Name
                        </Label>
                        <div className="relative">
                          <Input
                            id="client-name-input"
                            value={bookingData.clientName || ''}
                            onChange={e => {
                              const value = e.target.value;
                              setClientSearch(value);
                              setBookingData(prev => prev ? { ...prev, clientName: value } : null);
                              if (value.length >= 2) setClientSearchPopover(true);
                            }}
                            onFocus={() => { if ((bookingData.clientName || '').length >= 2) setClientSearchPopover(true); }}
                            onBlur={() => setTimeout(() => setClientSearchPopover(false), 200)}
                            placeholder="Type client name..."
                            className={cn("h-9 text-xs", !bookingData.clientName?.trim() && "border-destructive/20")}
                          />
                          {clientSearchPopover && searchedClients && searchedClients.length > 0 && (
                            <Card className="absolute top-full mt-1 w-full z-50 max-h-40 overflow-y-auto shadow-xl border-primary/20">
                              <CardContent className="p-0">
                                {searchedClients.map((client) => (
                                  <div
                                    key={client.id}
                                    className="px-3 py-2 text-xs hover:bg-primary/5 cursor-pointer border-b last:border-0 border-slate-100 dark:border-slate-800"
                                    onClick={() => handleClientSelect(client)}
                                  >
                                    <span className="font-bold block">{client.name}</span>
                                    <span className="text-[9px] text-slate-500">{client.email || client.phone}</span>
                                  </div>
                                ))}
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="clientPhone" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</Label>
                          <Input id="clientPhone" className="h-9 text-xs bg-white/50 dark:bg-slate-950/50" value={bookingData.clientPhone || ''} onChange={e => setBookingData(prev => prev ? { ...prev, clientPhone: e.target.value } : null)} placeholder="+000..." />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="clientEmail" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</Label>
                          <Input id="clientEmail" className="h-9 text-xs bg-white/50 dark:bg-slate-950/50" type="email" value={bookingData.clientEmail || ''} onChange={e => setBookingData(prev => prev ? { ...prev, clientEmail: e.target.value } : null)} placeholder="Email..." />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accordion Sections for others */}
                  <Accordion type="single" collapsible defaultValue="booking-details" className="w-full space-y-2">
                    <AccordionItem value="booking-details" className="border-0 rounded-xl px-4 bg-slate-50/50 dark:bg-slate-900/20 overflow-hidden">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-6 rounded flex items-center justify-center bg-blue-500/10 text-blue-500">
                            <Ship className="h-3 w-3" />
                          </div>
                          <span className="font-bold text-xs uppercase tracking-wider">Booking Details</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-1 pb-4 space-y-4">
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Houseboat</Label>
                            <Select value={bookingData.houseboatId} onValueChange={(value) => { if (bookingData.houseboatId !== value) setBookingData(prev => prev ? { ...prev, houseboatId: value } : null) }}>
                              <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950"><SelectValue placeholder="Select boat" /></SelectTrigger>
                              <SelectContent>
                                {allBoats?.map(boat => (
                                  <SelectItem key={boat.id} value={boat.id} className="text-xs">{boat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Reservation Period</Label>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                              <PopoverTrigger asChild>
                                <div className="relative">
                                  <Input
                                    id="date-range-picker"
                                    value={`${bookingData.startDate ? format(bookingData.startDate, 'MMM dd') : ''} - ${bookingData.endDate ? format(bookingData.endDate, 'MMM dd') : ''}`}
                                    readOnly
                                    className="h-9 text-xs pr-8 cursor-pointer bg-white dark:bg-slate-950"
                                    placeholder="Select dates"
                                  />
                                  <CalendarIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <DatePicker
                                  mode="range"
                                  selected={{ from: bookingData.startDate, to: bookingData.endDate }}
                                  onSelect={(range) => {
                                    if (range?.from) {
                                      const newFrom = new Date(range.from);
                                      if (bookingData.startDate) {
                                        newFrom.setHours(bookingData.startDate.getHours(), bookingData.startDate.getMinutes());
                                      }
                                      const newTo = range.to ? new Date(range.to) : new Date(range.from);
                                      if (bookingData.endDate) {
                                        newTo.setHours(bookingData.endDate.getHours(), bookingData.endDate.getMinutes());
                                      }
                                      setBookingData(prev => prev ? { ...prev, startDate: newFrom, endDate: newTo } : null);
                                    }
                                    if (range?.from && range?.to) setIsDatePickerOpen(false);
                                  }}
                                  numberOfMonths={1}
                                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label htmlFor="check-in-time" className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Check-in Time</Label>
                              <div className="relative">
                                <Input
                                  id="check-in-time"
                                  type="time"
                                  className="h-9 text-xs bg-white dark:bg-slate-950 px-2"
                                  value={bookingData.startDate ? format(bookingData.startDate, 'HH:mm') : '09:00'}
                                  onChange={(e) => {
                                    const [hours, minutes] = e.target.value.split(':').map(Number);
                                    if (bookingData.startDate) {
                                      const newDate = new Date(bookingData.startDate);
                                      newDate.setHours(hours, minutes);
                                      setBookingData(prev => prev ? { ...prev, startDate: newDate } : null);
                                    }
                                  }}
                                />
                                <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="check-out-time" className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Check-out Time</Label>
                              <div className="relative">
                                <Input
                                  id="check-out-time"
                                  type="time"
                                  className="h-9 text-xs bg-white dark:bg-slate-950 px-2"
                                  value={bookingData.endDate ? format(bookingData.endDate, 'HH:mm') : '12:00'}
                                  onChange={(e) => {
                                    const [hours, minutes] = e.target.value.split(':').map(Number);
                                    if (bookingData.endDate) {
                                      const newDate = new Date(bookingData.endDate);
                                      newDate.setHours(hours, minutes);
                                      setBookingData(prev => prev ? { ...prev, endDate: newDate } : null);
                                    }
                                  }}
                                />
                                <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label htmlFor="status" className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Status</Label>
                              <Select value={bookingData.status} onValueChange={(value: Booking['status']) => { if (bookingData.status !== value) setBookingData(prev => prev ? { ...prev, status: value } : null) }}>
                                <SelectTrigger id="status" className="h-9 text-xs bg-white dark:bg-slate-950"><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Confirmed" className="text-xs">Confirmed</SelectItem>
                                  <SelectItem value="Pending" className="text-xs">Pending</SelectItem>
                                  <SelectItem value="Maintenance" className="text-xs">Maintenance</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="source" className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Source</Label>
                              <Input id="source" className="h-9 text-xs bg-white dark:bg-slate-950" value={bookingData.source || ''} onChange={e => setBookingData(prev => prev ? { ...prev, source: e.target.value } : null)} placeholder="Source" />
                            </div>
                          </div>

                          {/* Financial Summary Card - EVEN MORE COMPACT */}
                          <div className="bg-slate-900 dark:bg-zinc-950 text-slate-50 p-4 rounded-xl shadow-lg border border-white/5 relative overflow-hidden mt-2">
                            <div className="absolute -right-4 -top-4 opacity-[0.03]">
                              <DollarSign className="h-16 w-16" />
                            </div>

                            {bookingCost ? (
                              <div className="space-y-3 relative z-10">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/5 pb-1.5">
                                  <span>Total Estimate</span>
                                  <span className="text-primary/70">EUR</span>
                                </div>

                                <div className="space-y-1">
                                  {bookingCost.weekdayNights > 0 && (
                                    <div className="flex justify-between text-[10px] text-slate-400">
                                      <span>Weekdays ({bookingCost.weekdayNights}x)</span>
                                      <span>€{(bookingCost.weekdayNights * bookingCost.weekdayPrice).toFixed(2)}</span>
                                    </div>
                                  )}
                                  {bookingCost.weekendNights > 0 && (
                                    <div className="flex justify-between text-[10px] text-slate-400">
                                      <span>Weekends ({bookingCost.weekendNights}x)</span>
                                      <span>€{(bookingCost.weekendNights * bookingCost.weekendPrice).toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>Taxes & Fees</span>
                                    <span>€{bookingCost.tax.toFixed(2)}</span>
                                  </div>
                                </div>

                                <div className="flex justify-between items-end pt-1">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-500 uppercase">Total</span>
                                    <span className="text-xl font-black text-white leading-none">€{bookingCost.total.toFixed(2)}</span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black text-primary/60 uppercase">Due Balance</span>
                                    <span className="text-md font-bold text-primary leading-none">€{(bookingCost.total - (bookingData.initialPaymentAmount || 0)).toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="py-2 text-center">
                                <p className="text-[9px] text-slate-500 font-medium">Calculation updates automatically</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="payments" className="border-0 rounded-xl px-4 bg-slate-50/50 dark:bg-slate-900/20 overflow-hidden">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-6 rounded flex items-center justify-center bg-green-500/10 text-green-500">
                            <CreditCard className="h-3 w-3" />
                          </div>
                          <span className="font-bold text-xs uppercase tracking-wider">Payments & Notes</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-1 pb-4 space-y-4">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label htmlFor="discount" className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Discount (%)</Label>
                              <Input id="discount" className="h-9 text-xs bg-white dark:bg-slate-950" type="number" value={bookingData.discount || ''} onChange={e => setBookingData(prev => prev ? { ...prev, discount: Number(e.target.value) } : null)} placeholder="0" />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="initialPayment" className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Paid (€)</Label>
                              <Input id="initialPayment" className="h-9 text-xs font-bold bg-white dark:bg-slate-950" type="number" value={bookingData.initialPaymentAmount || ''} onChange={e => setBookingData(prev => prev ? { ...prev, initialPaymentAmount: Number(e.target.value) } : null)} placeholder="0.00" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="paymentMethod" className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Payment Method</Label>
                            <Select value={bookingData.initialPaymentMethod} onValueChange={(value) => { if (bookingData.initialPaymentMethod !== value) setBookingData(prev => prev ? { ...prev, initialPaymentMethod: value } : null) }}>
                              <SelectTrigger id="paymentMethod" className="h-9 text-xs bg-white dark:bg-slate-950"><SelectValue placeholder="Method" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Credit Card" className="text-xs">Credit Card</SelectItem>
                                <SelectItem value="Bank Transfer" className="text-xs">Bank Transfer</SelectItem>
                                <SelectItem value="Cash" className="text-xs">Cash</SelectItem>
                                <SelectItem value="Other" className="text-xs">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="notes" className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">General Notes</Label>
                            <Textarea id="notes" className="min-h-[80px] text-xs bg-white dark:bg-slate-950 focus:ring-1" value={bookingData.notes || ''} onChange={e => setBookingData(prev => prev ? { ...prev, notes: e.target.value } : null)} placeholder="Any specific requirements..." />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            )}
            <SheetFooter className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-2 shrink-0">
              <SheetClose asChild>
                <Button variant="ghost" className="h-9 px-4 font-bold text-slate-500 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</Button>
              </SheetClose>
              <Button onClick={handleSaveBooking} disabled={!canEdit} className="h-9 px-6 font-bold text-xs shadow-md rounded-lg transition-all hover:opacity-90 active:scale-95">
                {bookingData?.id ? 'Update Booking' : 'Confirm & Save'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </TooltipProvider>
    </div>
  );
};

export default function HouseboatReservationsPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow min-h-0">
        <GanttChart />
      </div>
    </div>
  );
}
