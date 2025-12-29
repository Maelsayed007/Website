'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Ship, Utensils, Calendar, X, CheckCircle, XCircle, Users, Clock } from 'lucide-react';
import { formatDistanceToNow, differenceInHours, format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Booking = {
  id: string;
  clientName: string;
  clientEmail?: string;
  startTime: string; // Mapped from start_time
  endTime?: string; // Mapped from end_time
  adults?: number;
  children?: number;
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Maintenance';
  dismissed?: boolean;
  houseboatId?: string; //Mapped from houseboat_id
  restaurantTableId?: string; //Mapped from restaurant_table_id
  dailyTravelPackageId?: string; //Mapped from daily_travel_package_id
};

const getBookingType = (booking: Booking) => {
  if (booking.houseboatId) return {
    icon: Ship,
    path: `/dashboard/houseboat-reservations?highlight=${booking.id}`,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    label: 'Houseboat'
  };
  if (booking.restaurantTableId) return {
    icon: Utensils,
    path: '/dashboard/restaurant-reservations',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    label: 'Restaurant'
  };
  if (booking.dailyTravelPackageId) return {
    icon: Calendar,
    path: '/dashboard/daily-travel-reservations',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    label: 'Daily Travel'
  };
  return {
    icon: Calendar,
    path: '/dashboard',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    label: 'Booking'
  };
};

const getDateInfo = (booking: Booking) => {
  // Safety check for missing startTime
  if (!booking.startTime) {
    return {
      dateDisplay: 'No date set',
      isUrgent: false,
      timeUntil: 'Date pending',
      hoursUntil: 0
    };
  }

  try {
    const start = parseISO(booking.startTime);
    const hoursUntil = differenceInHours(start, new Date());

    let dateDisplay = format(start, 'MMM dd, yyyy');
    if (booking.endTime) {
      const end = parseISO(booking.endTime);
      dateDisplay = `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
    }

    const isUrgent = hoursUntil > 0 && hoursUntil < 24;
    const timeUntil = formatDistanceToNow(start, { addSuffix: true });

    return { dateDisplay, isUrgent, timeUntil, hoursUntil };
  } catch (error) {
    console.error('Error parsing date:', error);
    return {
      dateDisplay: 'Invalid date',
      isUrgent: false,
      timeUntil: 'Date error',
      hoursUntil: 0
    };
  }
};

export function NotificationsDropdown() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Booking[]>([]);
  const [open, setOpen] = useState(false);

  // Helper to map Supabase data to Booking type
  const mapBooking = (data: any): Booking => ({
    id: data.id,
    clientName: data.client_name || data.clientName,
    clientEmail: data.client_email || data.clientEmail,
    startTime: data.start_time || data.startTime,
    endTime: data.end_time || data.endTime,
    adults: data.adults,
    children: data.children,
    status: data.status,
    dismissed: data.dismissed,
    houseboatId: data.houseboat_id || data.houseboatId,
    restaurantTableId: data.restaurant_table_id || data.restaurantTableId,
    dailyTravelPackageId: data.daily_travel_package_id || data.dailyTravelPackageId,
  });

  // Fetch notifications
  useEffect(() => {
    if (!supabase) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'Pending')
        .limit(50);

      if (data) {
        const mapped = data
          .map(mapBooking)
          .filter(booking => !booking.dismissed && booking.startTime)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          .slice(0, 20);
        setNotifications(mapped);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('notifications-dropdown')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        async (payload) => {
          // Simple refetch for now to keep state consistent
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleNotificationClick = async (notification: Booking) => {
    const { path } = getBookingType(notification);
    setOpen(false);
    router.push(path);
  };

  const handleDismiss = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    if (!supabase) return;

    try {
      await supabase.from('bookings').update({ dismissed: true }).eq('id', notificationId);

      // Optimistic update
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      toast({
        title: 'Notification dismissed',
        description: 'The booking is still pending in your reservations.',
      });
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const handleApprove = async (e: React.MouseEvent, notificationId: string, clientName: string) => {
    e.stopPropagation();
    if (!supabase) return;

    try {
      await supabase.from('bookings').update({
        status: 'Confirmed',
        dismissed: true
      }).eq('id', notificationId);

      // Optimistic update
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      toast({
        title: 'Booking confirmed',
        description: `${clientName}'s reservation has been approved.`,
      });
    } catch (error) {
      console.error('Error approving booking:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve booking.',
      });
    }
  };

  const handleReject = async (e: React.MouseEvent, notificationId: string, clientName: string) => {
    e.stopPropagation();
    if (!supabase) return;

    try {
      await supabase.from('bookings').update({
        status: 'Cancelled',
        dismissed: true
      }).eq('id', notificationId);

      // Optimistic update
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      toast({
        title: 'Booking cancelled',
        description: `${clientName}'s reservation has been rejected.`,
      });
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject booking.',
      });
    }
  };

  const handleDismissAll = async () => {
    if (!supabase || notifications.length === 0) return;

    try {
      // Batch update or loop. Supabase supports update with 'in' filter
      await supabase.from('bookings')
        .update({ dismissed: true })
        .in('id', notifications.map(n => n.id));

      setNotifications([]);

      toast({
        title: 'All notifications dismissed',
        description: 'Bookings are still pending in your reservations.',
      });
    } catch (error) {
      console.error('Error dismissing all:', error);
    }
  };

  // Group notifications
  const urgentNotifications = notifications.filter(n => {
    const { isUrgent, hoursUntil } = getDateInfo(n);
    return isUrgent && hoursUntil > 0;
  });
  const normalNotifications = notifications.filter(n => {
    const { isUrgent, hoursUntil } = getDateInfo(n);
    return !isUrgent || hoursUntil <= 0;
  });

  const totalCount = notifications.length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {totalCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground animate-pulse">
              {totalCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[420px] bg-background border-border">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="font-semibold">Pending Bookings</span>
          {totalCount > 0 && (
            <Badge variant="default" className="font-bold">
              {totalCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-[500px] overflow-y-auto">
          {/* Urgent Notifications */}
          {urgentNotifications.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-red-50 dark:bg-red-900/10">
                🔥 Urgent - Checking in soon
              </div>
              {urgentNotifications.map(notif => {
                const { icon: Icon, color, bg, label } = getBookingType(notif);
                const { dateDisplay, timeUntil } = getDateInfo(notif);
                const guestCount = (notif.adults || 0) + (notif.children || 0);

                return (
                  <div
                    key={notif.id}
                    className="group relative border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                  >
                    <div
                      onClick={() => handleNotificationClick(notif)}
                      className="cursor-pointer p-4"
                    >
                      {/* Header */}
                      <div className="flex items-start gap-3 mb-2">
                        <div className={cn('rounded-lg p-2', bg)}>
                          <Icon className={cn('h-4 w-4', color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm text-foreground">
                              {notif.clientName}
                            </p>
                            <Badge variant="error" className="text-[10px] px-1.5 py-0">
                              URGENT
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {label} • {dateDisplay}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDismiss(e, notif.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Details */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground ml-14">
                        {guestCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{guestCount} {guestCount === 1 ? 'guest' : 'guests'}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{timeUntil}</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 mt-3 ml-14">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs"
                          onClick={(e) => handleApprove(e, notif.id, notif.clientName)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(e) => handleReject(e, notif.id, notif.clientName)}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {normalNotifications.length > 0 && <DropdownMenuSeparator />}
            </>
          )}

          {/* Normal Notifications */}
          {normalNotifications.length > 0 && (
            <>
              {urgentNotifications.length > 0 && (
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Other Pending Bookings
                </div>
              )}
              {normalNotifications.map(notif => {
                const { icon: Icon, color, bg, label } = getBookingType(notif);
                const { dateDisplay, timeUntil } = getDateInfo(notif);
                const guestCount = (notif.adults || 0) + (notif.children || 0);

                return (
                  <div
                    key={notif.id}
                    className="group relative border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                  >
                    <div
                      onClick={() => handleNotificationClick(notif)}
                      className="cursor-pointer p-4"
                    >
                      {/* Header */}
                      <div className="flex items-start gap-3 mb-2">
                        <div className={cn('rounded-lg p-2', bg)}>
                          <Icon className={cn('h-4 w-4', color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground mb-1">
                            {notif.clientName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {label} • {dateDisplay}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDismiss(e, notif.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Details */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground ml-14">
                        {guestCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{guestCount} {guestCount === 1 ? 'guest' : 'guests'}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{timeUntil}</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 mt-3 ml-14">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs"
                          onClick={(e) => handleApprove(e, notif.id, notif.clientName)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(e) => handleReject(e, notif.id, notif.clientName)}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Empty State */}
          {totalCount === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">
                All caught up!
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                No pending bookings at the moment. New reservations from your website will appear here.
              </p>
            </div>
          )}
        </div>

        {totalCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs justify-center"
                onClick={handleDismissAll}
              >
                Dismiss All ({totalCount})
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
