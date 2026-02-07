
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSupabase, useAuth } from '@/components/providers/supabase-provider';
import { Utensils, User, Clock, Users, Calendar, Mail, Phone, MoreVertical, Edit, Trash2, CheckCircle, PlusCircle, XCircle, AlertCircle, ChevronsUpDown, Ship } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logActivity } from '@/lib/actions';
import { sendBookingStatusUpdateEmail } from '@/lib/email';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';

type Booking = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_time: string;
  notes?: string;
  status: 'Confirmed' | 'Pending' | 'Maintenance' | 'Cancelled';
  daily_travel_package_id?: string;
  number_of_guests?: number;
};

type DailyTravelPackage = {
  id: string;
  name: string;
}

type UserPermissions = {
  isSuperAdmin?: boolean;
  canEditDailyTravelReservations?: boolean;
}

type UserProfile = {
  id: string;
  username: string;
  permissions: UserPermissions;
}

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const statusStyles: Record<Booking['status'], { icon: React.ElementType, className: string }> = {
  Confirmed: { icon: CheckCircle, className: 'bg-green-500/10 text-green-600 border-green-500/80' },
  Pending: { icon: Clock, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/80' },
  Maintenance: { icon: AlertCircle, className: 'bg-slate-500/10 text-slate-600 border-slate-500/80' },
  Cancelled: { icon: XCircle, className: 'bg-red-500/10 text-red-600 border-red-500/80' },
};

export default function DailyTravelReservationsPage() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [newBooking, setNewBooking] = useState<Partial<Booking & { date?: Date, time?: string }>>({});

  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchPopover, setClientSearchPopover] = useState(false);
  const [searchedClients, setSearchedClients] = useState<Client[]>([]);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<DailyTravelPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch User Profile and Permissions
  useEffect(() => {
    if (!supabase || !user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setUserProfile(data as UserProfile);
    };
    fetchProfile();
  }, [supabase, user]);

  // Fetch Bookings and Packages
  const fetchData = async () => {
    if (!supabase) return;
    setIsLoading(true);

    const [bookingsRes, packagesRes] = await Promise.all([
      supabase.from('bookings').select('*').not('daily_travel_package_id', 'is', null).order('start_time', { ascending: false }),
      supabase.from('daily_travel_packages').select('*')
    ]);

    if (bookingsRes.data) setAllBookings(bookingsRes.data as Booking[]);
    if (packagesRes.data) setPackages(packagesRes.data as DailyTravelPackage[]);

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Realtime subscription
    if (!supabase) return;
    const channel = supabase.channel('daily_travel_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // Client Search
  useEffect(() => {
    if (!supabase || clientSearch.length < 2) {
      setSearchedClients([]);
      return;
    }
    const searchClients = async () => {
      const { data } = await supabase.from('clients')
        .select('*')
        .ilike('name', `%${clientSearch}%`)
        .limit(5);
      if (data) setSearchedClients(data as Client[]);
    };
    searchClients();
  }, [supabase, clientSearch]);

  const isHardcodedAdmin = user?.email === 'myasserofficial@gmail.com';
  const canEdit = isHardcodedAdmin || userProfile?.permissions?.isSuperAdmin || userProfile?.permissions?.canEditDailyTravelReservations;

  useEffect(() => {
    if (searchParams.get('action') === 'new' && canEdit) {
      openNewDialog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canEdit]);

  const packageMap = useMemo(() => {
    return new Map(packages.map(p => [p.id, p.name]));
  }, [packages]);

  const showPermissionDeniedToast = () => {
    toast({
      variant: 'destructive',
      title: 'Permission Denied',
      description: "You don't have permission to perform this action.",
    });
  }

  const handleStatusChange = async (booking: Booking, status: Booking['status']) => {
    if (!canEdit) {
      showPermissionDeniedToast();
      return;
    }
    if (!supabase || !user || !userProfile) return;
    try {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', booking.id);
      if (error) throw error;

      toast({ title: 'Success', description: `Booking status updated to ${status}.` });

      logActivity({
        userId: user.id,
        username: userProfile.username,
        action: 'update_daily_travel_status',
        details: `Set status to ${status} for ${booking.client_name}'s daily travel booking`
      });

      if (status === 'Confirmed' || status === 'Cancelled') {
        // Map to expected internal names for email
        const emailBooking = {
          ...booking,
          clientName: booking.client_name,
          clientEmail: booking.client_email,
          clientPhone: booking.client_phone,
          startTime: booking.start_time
        };
        sendBookingStatusUpdateEmail(emailBooking as any, status);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update booking status.' });
    }
  };

  const handleDelete = async () => {
    if (!canEdit) {
      showPermissionDeniedToast();
      setDeletingId(null);
      return;
    }
    if (!supabase || !deletingId || !user || !userProfile) return;

    const bookingToDelete = allBookings.find(r => r.id === deletingId);
    if (!bookingToDelete) return;

    try {
      const { error } = await supabase.from('bookings').delete().eq('id', deletingId);
      if (error) throw error;

      toast({ title: 'Success', description: 'Booking deleted.' });
      logActivity({
        userId: user.id,
        username: userProfile.username,
        action: 'delete_daily_travel_booking',
        details: `Deleted daily travel booking for ${bookingToDelete.client_name}`
      });
      setDeletingId(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete booking.' });
      setDeletingId(null);
    }
  };

  const handleSaveNewBooking = async () => {
    if (!canEdit) {
      showPermissionDeniedToast();
      return;
    }
    if (!supabase || !newBooking.client_name || !newBooking.date || !newBooking.time || !newBooking.daily_travel_package_id || !user || !userProfile) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all required fields.' });
      return;
    }

    const [hours, minutes] = newBooking.time.split(':').map(Number);
    const startTime = new Date(newBooking.date);
    startTime.setHours(hours, minutes, 0, 0);

    const bookingData = {
      client_name: newBooking.client_name,
      client_email: newBooking.client_email,
      client_phone: newBooking.client_phone,
      daily_travel_package_id: newBooking.daily_travel_package_id,
      start_time: startTime.toISOString(),
      end_time: startTime.toISOString(), // Placeholder for daily trips
      status: newBooking.status || 'Pending',
      number_of_guests: newBooking.number_of_guests || 1,
      source: 'Manual',
      notes: newBooking.notes,
    };

    try {
      const { data, error } = await supabase.from('bookings').insert([bookingData]).select().single();
      if (error) throw error;

      toast({ title: 'Success', description: 'New daily travel reservation created.' });
      logActivity({
        userId: user.id,
        username: userProfile.username,
        action: 'create_daily_travel_booking',
        details: `Created new daily travel booking for ${bookingData.client_name}`
      });
      setIsNewDialogOpen(false);
      setNewBooking({});
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create reservation.' });
    }
  };

  const openNewDialog = () => {
    if (!canEdit) {
      showPermissionDeniedToast();
      return;
    }
    setNewBooking({ status: 'Pending' });
    setClientSearch('');
    setIsNewDialogOpen(true);
  }

  const handleClientSelect = (client: Client) => {
    setNewBooking(prev => ({
      ...prev,
      client_name: client.name,
      client_email: client.email,
      client_phone: client.phone
    }));
    setClientSearch(client.name);
    setClientSearchPopover(false);
  }


  return (
    <>
      <div>
        <div className="flex justify-between items-start mb-8">
          <h1 className="text-3xl font-bold">Daily Travel Reservations</h1>
          <Button onClick={openNewDialog} disabled={!canEdit}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Reservation
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking List
            </CardTitle>
            <CardDescription>
              A list of all incoming reservations for daily travel packages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : allBookings && allBookings.length > 0 ? (
                  allBookings.map((res) => {
                    const StatusIcon = statusStyles[res.status].icon;
                    return (
                      <TableRow key={res.id}>
                        <TableCell className="font-medium">{res.client_name}</TableCell>
                        <TableCell>{res.daily_travel_package_id ? (packageMap.get(res.daily_travel_package_id) || 'Unknown Package') : ''}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            {format(new Date(res.start_time), 'E, MMM dd, yyyy')}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Clock size={14} />
                            {format(new Date(res.start_time), 'h:mm a')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail size={14} />
                            {res.client_email}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Phone size={14} />
                            {res.client_phone}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant="outline" className={cn('font-medium flex items-center gap-1.5 w-fit', statusStyles[res.status].className)}>
                              <StatusIcon size={14} />
                              {res.status}
                            </Badge>
                            {res.status === 'Pending' && (
                              <span className="text-xs text-muted-foreground">
                                ({formatDistanceToNow(new Date(res.start_time), { addSuffix: true })})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={!canEdit}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {res.status === 'Pending' && (
                                <DropdownMenuItem onSelect={() => handleStatusChange(res, 'Confirmed')}>
                                  <CheckCircle className="mr-2 h-4 w-4" /> Confirm
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onSelect={() => toast({ title: 'Coming Soon', description: 'Editing functionality will be added in a future update.' })}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setDeletingId(res.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No daily travel reservations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the booking.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New Daily Travel Reservation</DialogTitle>
            <DialogDescription>
              Manually create a new booking for a daily travel excursion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 border rounded-lg space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Client Details</h3>
              <div className="space-y-2">
                <Label>Client</Label>
                <Popover open={clientSearchPopover} onOpenChange={setClientSearchPopover}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={clientSearchPopover} className="w-full justify-between font-normal">
                      {newBooking.client_name || "Select or create client..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search client name..."
                        value={clientSearch}
                        onValueChange={(search) => {
                          setClientSearch(search);
                          setNewBooking(prev => ({ ...prev, client_name: search }));
                        }}
                      />
                      <CommandEmpty>{clientSearch.length > 0 ? 'No client found.' : 'Type a name to search or create.'}</CommandEmpty>
                      <CommandGroup>
                        {searchedClients?.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => handleClientSelect(client)}
                          >
                            {client.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={newBooking.client_email || ''} onChange={e => setNewBooking(p => ({ ...p, client_email: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={newBooking.client_phone || ''} onChange={e => setNewBooking(p => ({ ...p, client_phone: e.target.value }))} /></div>
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Ship className="h-5 w-5 text-primary" /> Booking Details</h3>
              <div className="space-y-2"><Label>Package</Label>
                <Select value={newBooking.daily_travel_package_id} onValueChange={id => setNewBooking(p => ({ ...p, daily_travel_package_id: id }))}>
                  <SelectTrigger><SelectValue placeholder="Select a package..." /></SelectTrigger>
                  <SelectContent>
                    {packages?.map(pkg => <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Date</Label>
                  <Popover><PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !newBooking.date && 'text-muted-foreground')}>
                      <Calendar className="mr-2 h-4 w-4" />{newBooking.date ? format(newBooking.date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger><PopoverContent className="w-auto p-0"><CalendarPicker mode="single" selected={newBooking.date} onSelect={d => setNewBooking(p => ({ ...p, date: d }))} /></PopoverContent></Popover>
                </div>
                <div className="space-y-2"><Label>Time</Label>
                  <Select value={newBooking.time} onValueChange={time => setNewBooking(p => ({ ...p, time }))}>
                    <SelectTrigger><SelectValue placeholder="Select time..." /></SelectTrigger>
                    <SelectContent>
                      {/* Example times, can be made more dynamic */}
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                      <SelectItem value="14:00">2:00 PM</SelectItem>
                      <SelectItem value="18:00">6:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Number of Guests</Label><Input type="number" min="1" value={newBooking.number_of_guests || ''} onChange={e => setNewBooking(p => ({ ...p, number_of_guests: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={newBooking.notes || ''} onChange={e => setNewBooking(p => ({ ...p, notes: e.target.value }))} placeholder="Any special requests or details..." /></div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveNewBooking} disabled={!canEdit}>Save Reservation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
