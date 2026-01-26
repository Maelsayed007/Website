'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import {
  Search,
  CalendarDays,
  Users,
  Shield,
  Ship,
  Minus,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const availabilitySchema = z.object({
  guests: z.string().optional(),
  boats: z.string().optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }),
});

interface ReservationFormProps {
  activeTab?: string;
}

export default function ReservationForm({ activeTab = 'houseboats' }: ReservationFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSearching, setIsSearching] = useState(false);

  // Default values
  const defaultGuests = searchParams.get('guests') || '2';
  const defaultBoats = searchParams.get('boats') || '1';

  const form = useForm<z.infer<typeof availabilitySchema>>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      guests: defaultGuests,
      boats: defaultBoats,
      dateRange: {
        from: searchParams.get('from') ? parseISO(searchParams.get('from')!) : undefined,
        to: searchParams.get('to') ? parseISO(searchParams.get('to')!) : undefined,
      },
    },
  });

  async function onAvailabilitySubmit(values: z.infer<typeof availabilitySchema>) {
    setIsSearching(true);
    const { dateRange, guests, boats } = values;
    const params = new URLSearchParams();
    if (dateRange.from) params.append('from', dateRange.from.toISOString().split('T')[0]);
    if (dateRange.to) params.append('to', dateRange.to.toISOString().split('T')[0]);
    if (guests) params.append('guests', guests);
    if (boats) params.append('boats', boats);

    if (activeTab === 'houseboats') {
      router.push(`/houseboats?${params.toString()}`);
    } else if (activeTab === 'river-cruise') {
      router.push(`/daily-travel?${params.toString()}`);
    } else if (activeTab === 'restaurant') {
      router.push(`/restaurant?${params.toString()}`);
    } else {
      router.push(`/contact`);
    }
  }

  const getLocationLabel = () => {
    switch (activeTab) {
      case 'houseboats': return 'Alqueva Lake, Portugal';
      case 'river-cruise': return 'Amieira Marina';
      case 'restaurant': return 'Marina Restaurant';
      default: return 'Alqueva Lake';
    }
  };

  if (activeTab === 'contact') {
    return null;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onAvailabilitySubmit)} className="w-full relative">

        {/* Wrapper Card */}
        <div className="bg-white rounded-3xl shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)] p-2 md:p-5 pb-5 md:pb-5 relative z-10">



          {/* Main Inputs Row - Separated Cards */}
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr,1fr,1fr,0.6fr,0.6fr,auto] gap-3 items-end">

            {/* Box 1: Location */}
            <div className="bg-white rounded-2xl border border-[#dadce0] p-0 flex items-center relative group transition-all duration-200 hover:border-[#dadce0] hover:bg-[#f1f3f4] cursor-text h-[44px]">
              <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                <div className="w-4 h-4 rounded-full border-[1.5px] border-[#5f6368] flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-[#5f6368]" />
                </div>
              </div>
              <div className="w-full pl-10 md:pl-12 pr-3 h-full flex items-center">
                <div className="text-[#3c4043] font-normal text-sm md:text-base truncate">
                  {getLocationLabel()}
                </div>
              </div>
            </div>

            {/* Box 2: Dates (Check-in) */}
            <div className="bg-white rounded-2xl border border-[#dadce0] transition-all duration-200 hover:border-[#dadce0] hover:bg-[#f1f3f4] relative h-[44px]">
              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full h-full flex items-center px-3 md:px-4 text-left gap-2 md:gap-3 group"
                      >
                        <CalendarDays className="w-4 h-4 text-[#5f6368] flex-shrink-0" />
                        <span className={cn(
                          "text-sm md:text-base font-normal truncate",
                          field.value?.from ? "text-[#3c4043]" : "text-[#70757a]"
                        )}>
                          {field.value?.from ? format(field.value.from, 'EEE, MMM d') : 'Check-in'}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white rounded-xl shadow-xl border-0 z-[10001]" align="start">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={field.value?.from}
                        selected={{ from: field.value?.from, to: field.value?.to }}
                        onSelect={field.onChange}
                        numberOfMonths={2}
                        className="bg-white rounded-xl"
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>

            {/* Box 3: Dates (Check-out) */}
            <div className="bg-white rounded-2xl border border-[#dadce0] transition-all duration-200 hover:border-[#dadce0] hover:bg-[#f1f3f4] relative h-[44px]">
              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full h-full flex items-center px-3 md:px-4 text-left gap-2 md:gap-3 group"
                      >
                        <CalendarDays className="w-4 h-4 text-[#5f6368] flex-shrink-0" />
                        <span className={cn(
                          "text-sm md:text-base font-normal truncate",
                          field.value?.to ? "text-[#3c4043]" : "text-[#70757a]"
                        )}>
                          {field.value?.to ? format(field.value.to, 'EEE, MMM d') : 'Check-out'}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white rounded-xl shadow-xl border-0 z-[10001]" align="end">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={field.value?.from}
                        selected={{ from: field.value?.from, to: field.value?.to }}
                        onSelect={field.onChange}
                        numberOfMonths={2}
                        className="bg-white rounded-xl"
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>

            {/* Box 4: Guests */}
            <div className="bg-white rounded-2xl border border-[#dadce0] transition-all duration-200 hover:border-[#dadce0] hover:bg-[#f1f3f4] relative h-[44px] group">
              <FormField
                control={form.control}
                name="guests"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full h-full flex items-center px-3 md:px-4 text-left gap-2 md:gap-3">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-[#5f6368] flex-shrink-0" />
                        <div className="flex flex-col items-start min-w-0">
                          <span className={cn(
                            "text-sm md:text-base font-normal truncate",
                            field.value ? "text-[#3c4043]" : "text-[#70757a]"
                          )}>
                            {field.value || '2'} {parseInt(field.value || '2') === 1 ? 'Guest' : 'Guests'}
                          </span>
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-4 bg-white rounded-xl shadow-xl border-none z-[10001]" align="center">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-medium text-gray-700">Adults & Children</span>
                          <div className="flex items-center gap-3 bg-gray-50 rounded-full p-1 border border-gray-100">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm"
                              onClick={() => {
                                const current = parseInt(field.value || '0');
                                const newVal = Math.max(1, current - 1);
                                field.onChange(newVal.toString());
                              }}
                              disabled={parseInt(field.value || '0') <= 1}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-6 text-center font-semibold text-gray-900">{field.value || '2'}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm"
                              onClick={() => {
                                const current = parseInt(field.value || '0');
                                const newVal = Math.min(20, current + 1);
                                field.onChange(newVal.toString());
                              }}
                              disabled={parseInt(field.value || '0') >= 20}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 text-center">Max capacity varies by boat.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>

            {/* Box 5: Boats (NEW) */}
            <div className="bg-white rounded-2xl border border-[#dadce0] transition-all duration-200 hover:border-[#dadce0] hover:bg-[#f1f3f4] relative h-[44px] px-3 md:px-4 flex items-center group">
              <FormField
                control={form.control}
                name="boats"
                render={({ field }) => (
                  <div className="flex items-center gap-2 md:gap-3 w-full">
                    <Ship className="w-4 h-4 md:w-5 md:h-5 text-[#5f6368] flex-shrink-0" />
                    <div className="flex items-center flex-1 min-w-0">
                      <input
                        type="number"
                        value={field.value || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const numVal = parseInt(val) || 0;
                          if (val === '') field.onChange('');
                          else if (numVal >= 1 && numVal <= 5) field.onChange(val);
                        }}
                        onBlur={() => {
                          if (!field.value || parseInt(field.value) < 1) field.onChange('1');
                        }}
                        className="w-8 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm md:text-base font-bold text-[#18230F] p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="1"
                        min="1"
                        max="5"
                      />
                      <span className="text-sm md:text-base font-normal text-[#3c4043] ml-0.5 truncate">
                        {parseInt(field.value || '0') === 1 ? 'Boat' : 'Boats'}
                      </span>
                    </div>
                  </div>
                )}
              />
            </div>

            {/* Box 6: Search Button */}
            <div className="flex items-center h-[44px]">
              <Button
                type="submit"
                className="bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-bold h-full px-6 rounded-2xl flex items-center gap-2 shadow-sm text-base transition-all hover:shadow-md w-full md:w-auto min-w-[120px]"
                disabled={isSearching}
              >
                <Search className="w-5 h-5 flex-shrink-0" />
                <span>Explore</span>
              </Button>
            </div>

          </div>



        </div>
      </form>
    </Form>
  );
}
