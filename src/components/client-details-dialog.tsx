'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Mail,
  Phone,
  Calendar,
  Ship,
  Utensils,
  Calendar as CalendarIcon,
  Pencil,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  bookingIds?: string[];
};

type Booking = {
  id: string;
  clientName: string;
  startTime: string;
  endTime?: string;
  status: string;
  houseboatId?: string;
  restaurantTableId?: string;
  dailyTravelPackageId?: string;
};

type ClientDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onEdit: () => void;
  onDelete: () => void;
};

export function ClientDetailsDialog({
  open,
  onOpenChange,
  client,
  onEdit,
  onDelete
}: ClientDetailsDialogProps) {
  const { supabase } = useSupabase();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  useEffect(() => {
    if (!supabase || !client?.email || !open) return;

    const fetchBookings = async () => {
      setIsLoadingBookings(true);
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_email', client.email);

      if (data) {
        setBookings(data.map((b: any) => ({
          id: b.id,
          clientName: b.client_name,
          startTime: b.start_time,
          endTime: b.end_time,
          status: b.status,
          houseboatId: b.houseboat_id,
          restaurantTableId: b.restaurant_table_id,
          dailyTravelPackageId: b.daily_travel_package_id,
        })));
      }
      setIsLoadingBookings(false);
    };

    fetchBookings();
  }, [supabase, client?.email, open]);

  if (!client) return null;

  const getBookingIcon = (booking: Booking) => {
    if (booking.houseboatId) return Ship;
    if (booking.restaurantTableId) return Utensils;
    return CalendarIcon;
  };

  const getBookingType = (booking: Booking) => {
    if (booking.houseboatId) return 'Houseboat';
    if (booking.restaurantTableId) return 'Restaurant';
    return 'Daily Travel';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{client.name}</DialogTitle>
              <DialogDescription className="mt-1">
                Member since {format(new Date(client.createdAt), 'MMMM dd, yyyy')}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Contact Information
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${client.email}`}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {client.email}
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${client.phone}`}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {client.phone}
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Joined {format(new Date(client.createdAt), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Booking History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Booking History
              </h3>
              <Badge variant="secondary">
                {bookings?.length || 0} {bookings?.length === 1 ? 'booking' : 'bookings'}
              </Badge>
            </div>

            {isLoadingBookings ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : bookings && bookings.length > 0 ? (
              <div className="space-y-2">
                {bookings.map((booking) => {
                  const Icon = getBookingIcon(booking);
                  return (
                    <div
                      key={booking.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {getBookingType(booking)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(booking.startTime), 'MMM dd, yyyy')}
                          {booking.endTime && ` - ${format(new Date(booking.endTime), 'MMM dd, yyyy')}`}
                        </p>
                      </div>
                      <Badge variant={
                        booking.status === 'Confirmed' ? 'success' :
                          booking.status === 'Pending' ? 'warning' :
                            'error'
                      }>
                        {booking.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No bookings yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This client hasn't made any reservations
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
