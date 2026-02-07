'use client';

import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useToast } from '@/hooks/use-toast';
import { generateActivityReport } from '@/lib/pdf-designs';
import type { Booking } from '@/lib/pdf-designs';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, FileDown, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';

export default function PrintablesPage() {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (!supabase || !dateRange?.from || !dateRange?.to) {
      toast({
        variant: 'destructive',
        title: 'Date Range Required',
        description: 'Please select a start and end date for the report.',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const rangeStart = startOfDay(dateRange.from).toISOString();
      const rangeEnd = endOfDay(dateRange.to).toISOString();

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .gte('start_time', rangeStart)
        .lte('start_time', rangeEnd)
        .order('start_time');

      if (error) throw error;

      const bookingsForRange = (data || []).map(b => ({
        ...b,
        startTime: b.start_time,
        clientName: b.client_name,
        // Map other fields if necessary for generateActivityReport
      })) as Booking[];

      if (bookingsForRange.length === 0) {
        toast({
          title: 'No Bookings Found',
          description: 'There are no activities scheduled for the selected date range.',
        });
        return;
      }

      generateActivityReport(dateRange.from, dateRange.to, bookingsForRange);

    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        variant: 'destructive',
        title: 'Report Generation Failed',
        description: 'There was an error fetching data for the report.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Printables"
        description="Generate PDF reports and documents"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileDown /> Activity Report</CardTitle>
            <CardDescription>Generate a comprehensive report of all arrivals and reservations for a specific date range.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleGenerateReport} disabled={isGenerating || !dateRange?.from || !dateRange?.to}>
              {isGenerating ? 'Generating...' : 'Generate PDF Report'}
            </Button>
          </CardFooter>
        </Card>

        {/* Placeholder for future reports */}
        <Card className="border-dashed flex items-center justify-center text-center bg-muted/50">
          <div className="p-6">
            <CardTitle className="text-muted-foreground">More Reports Coming Soon</CardTitle>
            <CardDescription className="mt-2">Future options like financial summaries and client statistics will be available here.</CardDescription>
          </div>
        </Card>

      </div>
    </div>
  );
}
