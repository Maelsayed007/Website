'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Users, Clock, Search, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/components/providers/supabase-provider';
import { cn } from '@/lib/utils';
import { sendBookingRequestEmail } from '@/lib/email';
import { Label } from './ui/label';

const reservationSchema = z.object({
    date: z.date({
        required_error: 'A date is required.',
    }),
    time: z.string({ required_error: 'A time is required.' }).min(1, 'A time is required.'),
    guests: z.string({ required_error: 'Number of guests is required.' }).min(1, 'Number of guests is required.'),
});

const findOrCreateClient = async (supabase: any, name: string, email: string, phone: string) => {
    if (!supabase) return;

    const { data: existingClients, error: queryError } = await supabase
        .from('clients')
        .select('id')
        .eq('email', email.toLowerCase())
        .limit(1);

    if (queryError) throw queryError;

    const now = new Date().toISOString();
    let clientId: string;

    if (!existingClients || existingClients.length === 0) {
        const { data: newClient, error: insertError } = await supabase
            .from('clients')
            .insert({
                name,
                email: email.toLowerCase(),
                phone,
                status: 'Lead',
                last_contact: now,
                created_at: now,
                contact_history: [],
            })
            .select('id')
            .single();

        if (insertError) throw insertError;
        clientId = newClient.id;
    } else {
        const client = existingClients[0];
        const { error: updateError } = await supabase
            .from('clients')
            .update({ last_contact: now, phone })
            .eq('id', client.id);

        if (updateError) throw updateError;
        clientId = client.id;
    }
    return clientId;
};

const fullyBookedRestaurantDays: Date[] = [];

type RestaurantReservationFormProps = {
    dictionary: {
        form: {
            title: string;
            name: string; namePlaceholder: string;
            email: string; emailPlaceholder: string;
            phone: string;
            date: string; datePlaceholder: string;
            time: string; timePlaceholder: string;
            guests: string; guestsPlaceholder: string;
            guestLabel: string; guestsLabel: string;
            submit: string; submitting: string;
            success: { title: string; description: string; };
            error: { title: string; description: string; };
        };
    };
};

export default function RestaurantReservationForm({ dictionary }: RestaurantReservationFormProps) {
    const { toast } = useToast();
    const { supabase } = useSupabase();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof reservationSchema>>({
        resolver: zodResolver(reservationSchema),
        defaultValues: {
            time: "",
            guests: "2",
        }
    });

    async function onSubmit(values: z.infer<typeof reservationSchema>) {
        if (!supabase) {
            toast({
                variant: 'destructive',
                title: "Database Error",
                description: "Could not connect to the database. Please try again later.",
            });
            return;
        }
        setIsSubmitting(true);

        try {
            const [hours, minutes] = values.time.split(':').map(Number);
            const startTime = new Date(values.date);
            startTime.setHours(hours, minutes, 0, 0);

            const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

            const clientName = "Restaurant Guest"; // Placeholder
            const clientEmail = "placeholder@example.com"; // Placeholder
            const clientPhone = ""; // Placeholder

            const clientId = await findOrCreateClient(supabase, clientName, clientEmail, clientPhone);

            const bookingData = {
                client_name: clientName,
                client_email: clientEmail,
                client_phone: clientPhone,
                client_id: clientId,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: 'Pending',
                notes: `Restaurant reservation for ${values.guests} guest(s).`,
                source: 'Website - Restaurant',
                restaurant_table_id: 'unknown',
                number_of_guests: parseInt(values.guests, 10),
            };

            const { error: bookingError } = await supabase
                .from('bookings')
                .insert(bookingData);

            if (bookingError) throw bookingError;

            await sendBookingRequestEmail({
                ...bookingData,
                clientName: bookingData.client_name,
                clientEmail: bookingData.client_email,
                clientPhone: bookingData.client_phone,
                clientId: bookingData.client_id,
                startTime: bookingData.start_time,
                endTime: bookingData.end_time,
                restaurantTableId: bookingData.restaurant_table_id,
                numberOfGuests: bookingData.number_of_guests,
            } as any);

            router.push('/payment-instructions');

        } catch (error) {
            console.error("Reservation submission error:", error);
            toast({
                variant: 'destructive',
                title: dictionary.form.error.title,
                description: dictionary.form.error.description,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex flex-col md:flex-row gap-2 items-end justify-center">
                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem className="w-full md:w-auto">
                                <Label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: '#010a1f' }}>
                                    {dictionary.form.date}
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <button
                                                type="button"
                                                style={{ backgroundColor: 'white' }}
                                                className={cn(
                                                    'w-full md:w-48 h-11 justify-start text-left font-semibold border-2 border-gray-300 rounded-full bg-white hover:border-green-600 transition-colors flex items-center px-4',
                                                    !field.value && 'text-gray-500'
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                                                <span className="text-sm font-semibold" style={{ color: field.value ? '#010a1f' : undefined }}>
                                                    {field.value ? (
                                                        format(field.value, 'MMM dd')
                                                    ) : (
                                                        <span>{dictionary.form.datePlaceholder}</span>
                                                    )}
                                                </span>
                                            </button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-white rounded-2xl" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date < new Date(new Date().setHours(0, 0, 0, 0)) || fullyBookedRestaurantDays.some(d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
                                            }
                                            initialFocus
                                            className="bg-white rounded-2xl"
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                            <FormItem className="w-full md:w-48">
                                <Label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: '#010a1f' }}>
                                    {dictionary.form.time}
                                </Label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600 pointer-events-none z-10" />
                                    <FormControl>
                                        <select
                                            {...field}
                                            style={{ backgroundColor: 'white', color: '#010a1f' }}
                                            className="w-full h-11 pl-11 pr-8 bg-white border-2 border-gray-300 rounded-full text-sm font-semibold hover:border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20 transition-all outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="" disabled>{dictionary.form.timePlaceholder}</option>
                                            <option value="19:00">7:00 PM</option>
                                            <option value="19:30">7:30 PM</option>
                                            <option value="20:00">8:00 PM</option>
                                            <option value="20:30">8:30 PM</option>
                                            <option value="21:00">9:00 PM</option>
                                        </select>
                                    </FormControl>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="guests"
                        render={({ field }) => (
                            <FormItem className="w-full md:w-48">
                                <Label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: '#010a1f' }}>
                                    {dictionary.form.guests}
                                </Label>
                                <div className="relative">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600 pointer-events-none z-10" />
                                    <FormControl>
                                        <select
                                            {...field}
                                            style={{ backgroundColor: 'white', color: '#010a1f' }}
                                            className="w-full h-11 pl-11 pr-8 bg-white border-2 border-gray-300 rounded-full text-sm font-semibold hover:border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20 transition-all outline-none appearance-none cursor-pointer"
                                        >
                                            {[...Array(8)].map((_, i) => (
                                                <option key={i + 1} value={`${i + 1}`}>
                                                    {i + 1} {i + 1 > 1 ? dictionary.form.guestsLabel : dictionary.form.guestLabel}
                                                </option>
                                            ))}
                                        </select>
                                    </FormControl>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        className="w-12 h-12 md:mb-0 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-full shadow-lg hover:shadow-xl transition-all flex-shrink-0 flex items-center justify-center"
                        disabled={isSubmitting}
                    >
                        <Search className="w-6 h-6 text-white" />
                    </Button>
                </div>
            </form>
        </Form>
    );
}
