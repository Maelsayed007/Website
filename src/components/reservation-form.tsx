'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import {
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const availabilitySchema = z.object({
  dateRange: z.object({
    from: z.date({ required_error: 'Check-in required' }),
    to: z.date({ required_error: 'Check-out required' }),
  }),
  guests: z.string().min(1, 'Select guests'),
});

export default function ReservationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSearching, setIsSearching] = useState(false);

  const form = useForm<z.infer<typeof availabilitySchema>>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      guests: searchParams.get('guests') || '2',
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
    params.append('guests', guests);
    router.push(`/houseboats?${params.toString()}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onAvailabilitySubmit)} className="w-full h-full">
        {/* Compact Strip: h-16 (64px) */}
        <div className="flex flex-col md:flex-row items-center w-full h-full relative">

          {/* CHECK IN */}
          <FormField
            control={form.control}
            name="dateRange"
            render={({ field }) => (
              <>
                <div className="relative flex-1 w-full md:w-auto h-16 md:h-full group">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <button type="button" className="text-left w-full h-full px-6 md:px-8 flex flex-col justify-center rounded-[2rem] hover:bg-gray-50 transition-all outline-none relative z-10">
                          <Label className="block text-[10px] font-extrabold tracking-widest text-gray-800 uppercase mb-0.5 cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity">
                            Check In
                          </Label>
                          <div className={cn("text-sm font-medium text-gray-400 truncate leading-tight", field.value?.from && "text-gray-900 font-bold")}>
                            {field.value?.from ? format(field.value.from, 'MMM dd') : 'Add dates'}
                          </div>
                        </button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white rounded-2xl shadow-2xl border-0" align="start">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={field.value?.from}
                        selected={field.value}
                        onSelect={field.onChange}
                        numberOfMonths={2}
                        className="bg-white rounded-xl"
                      />
                    </PopoverContent>
                  </Popover>
                  {/* Divider */}
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 h-8 w-px bg-gray-200 z-20" />
                </div>

                {/* CHECK OUT */}
                <div className="relative flex-1 w-full md:w-auto h-16 md:h-full group">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <button type="button" className="text-left w-full h-full px-6 md:px-8 flex flex-col justify-center rounded-[2rem] hover:bg-gray-50 transition-all outline-none relative z-10">
                          <Label className="block text-[10px] font-extrabold tracking-widest text-gray-800 uppercase mb-0.5 cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity">
                            Check Out
                          </Label>
                          <div className={cn("text-sm font-medium text-gray-400 truncate leading-tight", field.value?.to && "text-gray-900 font-bold")}>
                            {field.value?.to ? format(field.value.to, 'MMM dd') : 'Add dates'}
                          </div>
                        </button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white rounded-2xl shadow-2xl border-0" align="start">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={field.value?.from}
                        selected={field.value}
                        onSelect={field.onChange}
                        numberOfMonths={2}
                        className="bg-white rounded-xl"
                      />
                    </PopoverContent>
                  </Popover>
                  {/* Divider */}
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 h-8 w-px bg-gray-200 z-20" />
                </div>
              </>
            )}
          />

          {/* GUESTS */}
          <FormField
            control={form.control}
            name="guests"
            render={({ field }) => (
              <div className="relative flex-1 w-full md:w-40 h-16 md:h-full group">
                <div className="w-full h-full px-6 md:px-8 flex flex-col justify-center rounded-[2rem] hover:bg-gray-50 transition-all relative z-10 cursor-pointer">
                  <Label className="block text-[10px] font-extrabold tracking-widest text-gray-800 uppercase mb-0.5 cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity">
                    Guests
                  </Label>
                  <div className="flex items-center justify-between w-full">
                    <FormControl>
                      <select
                        {...field}
                        className={cn(
                          "w-full bg-transparent text-sm font-medium text-gray-400 outline-none appearance-none cursor-pointer p-0 m-0 border-none leading-tight",
                          field.value && "text-gray-900 font-bold"
                        )}
                      >
                        {[...Array(12)].map((_, i) => (
                          <option key={i + 1} value={`${i + 1}`}>
                            {i + 1} {i === 0 ? 'Guest' : 'Guests'}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                  </div>
                </div>
              </div>
            )}
          />

          {/* SEARCH BUTTON - Compact Circle */}
          <div className="p-1.5 pr-2 flex items-center justify-center">
            <Button
              type="submit"
              size="icon"
              className="rounded-full w-12 h-12 bg-green-600 hover:bg-green-700 text-white shadow-xl hover:shadow-green-500/40 transition-all flex items-center justify-center"
              disabled={isSearching}
            >
              <Search className="w-5 h-5 stroke-[2.5px]" />
            </Button>
          </div>

        </div>
      </form>
    </Form>
  );
}
