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

  const form = useForm<z.infer<typeof availabilitySchema>>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      guests: defaultGuests,
      dateRange: {
        from: searchParams.get('from') ? parseISO(searchParams.get('from')!) : undefined,
        to: searchParams.get('to') ? parseISO(searchParams.get('to')!) : undefined,
      },
    },
  });

  async function onAvailabilitySubmit(values: z.infer<typeof availabilitySchema>) {
    setIsSearching(true);
    const { dateRange, guests } = values;
    const params = new URLSearchParams();
    if (dateRange.from) params.append('from', dateRange.from.toISOString().split('T')[0]);
    if (dateRange.to) params.append('to', dateRange.to.toISOString().split('T')[0]);
    if (guests) params.append('guests', guests);

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
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr,1fr,1fr,0.8fr,auto] gap-3 items-end">

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
            <div className="bg-white rounded-2xl border border-[#dadce0] transition-all duration-200 hover:border-[#dadce0] hover:bg-[#f1f3f4] relative h-[44px]">
              <FormField
                control={form.control}
                name="guests"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full h-full flex items-center px-3 md:px-4 text-left gap-2 md:gap-3 group"
                      >
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-[#5f6368] flex-shrink-0" />
                        <div className="text-sm md:text-base font-normal text-[#3c4043] truncate">
                          {field.value} {field.value === '1' ? 'Guest' : 'Guests'}
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-2 z-[10001]" align="end">
                      <div className="grid gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <div
                            key={num}
                            className={cn(
                              "px-3 py-2 hover:bg-gray-100 rounded cursor-pointer text-sm flex justify-between",
                              field.value === String(num) && "bg-lime-50 text-lime-800 font-semibold"
                            )}
                            onClick={() => {
                              field.onChange(String(num));
                            }}
                          >
                            <span>{num} {num === 1 ? 'Guest' : 'Guests'}</span>
                            {field.value === String(num) && <div className="w-2 h-2 rounded-full bg-[#34C759] self-center border border-green-400" />}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>

            {/* Box 5: Search Button - Now inside the grid */}
            <div className="flex items-center h-[44px]">
              <Button
                type="submit"
                className="bg-[#34C759] hover:bg-[#2DA64D] text-black font-bold h-full px-6 rounded-2xl flex items-center gap-2 shadow-sm text-base transition-all hover:shadow-md w-full md:w-auto min-w-[120px]"
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
