
'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth, useSupabase } from '@/components/providers/supabase-provider';
import { Utensils, User, Clock, Users, Calendar, Mail, Phone, Info, MoreVertical, Edit, Trash2, CheckCircle, PlusCircle, XCircle, AlertCircle, ChevronsUpDown } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
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
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  startTime: string; // ISO string
  notes?: string;
  status: 'Confirmed' | 'Pending' | 'Maintenance' | 'Cancelled';
  restaurantTableId?: string;
  houseboatId?: string;
  numberOfGuests?: number;
};

type UserPermissions = {
  isSuperAdmin?: boolean;
  canEditRestaurantReservations?: boolean;
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


export default function RestaurantReservationsPage() {
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

  // Supabase state
  const [reservations, setReservations] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ permissions: UserPermissions, username: string } | null>(null);


  // Fetch Profile
  useEffect(() => {
    if (!supabase || !user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('permissions, username').eq('id', user.id).single();
      if (data) setUserProfile(data as any);
    };
    fetchProfile();
  }, [supabase, user]);

  const isHardcodedAdmin = user?.email === 'myasserofficial@gmail.com';
  const canEdit = isHardcodedAdmin || userProfile?.permissions?.isSuperAdmin || userProfile?.permissions?.canEditRestaurantReservations;

  useEffect(() => {
    if (searchParams.get('action') === 'new' && canEdit) {
      openNewDialog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canEdit]);


  // Search clients
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
      if (data) setSearchedClients(data);
    }
    // Debounce could be added here
    const timeout = setTimeout(searchClients, 300);
    return () => clearTimeout(timeout);
  }, [supabase, clientSearch]);


  // Fetch Bookings
  const fetchBookings = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .not('restaurant_table_id', 'is', null)
      .order('start_time', { ascending: false });

    if (data) {
      const mapped: Booking[] = data.map((b: any) => ({
        id: b.id,
        clientName: b.client_name,
        clientEmail: b.client_email,
        clientPhone: b.client_phone,
        startTime: b.start_time,
        notes: b.notes,
        status: b.status,
        restaurantTableId: b.restaurant_table_id,
        houseboatId: b.houseboat_id,
        numberOfGuests: b.number_of_guests || 1 // Assuming schema might not represent this directly yet or uses notes
      }));
      setReservations(mapped);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchBookings();

    // Realtime subscription
    if (!supabase) return;
    const channel = supabase.channel('restaurant-reservations-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel) };
  }, [supabase, fetchBookings]);


  const getGuestsFromNotes = (booking: Booking) => {
    if (booking.numberOfGuests) return String(booking.numberOfGuests);
    if (!booking.notes) return '?';
    const match = booking.notes.match(/for (\d+) guest/);
    return match ? match[1] : '?';
  };

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
      await supabase.from('bookings').update({ status }).eq('id', booking.id);
      toast({ title: 'Success', description: `Booking status updated to ${status}.` });
      logActivity({
        userId: user.id,
        username: userProfile.username,
        action: 'update_restaurant_status',
        details: `Set status to ${status} for ${booking.clientName}'s restaurant booking`,
        path: `/bookings/${booking.id}` // Placeholder path
      });
      if (status === 'Confirmed' || status === 'Cancelled') {
        const updatedBooking = { ...booking, status };
        sendBookingStatusUpdateEmail(updatedBooking, status);
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

    const bookingToDelete = reservations.find(r => r.id === deletingId);
    if (!bookingToDelete) return;

    try {
      await supabase.from('bookings').delete().eq('id', deletingId);
      toast({ title: 'Success', description: 'Booking deleted.' });
      logActivity({
        userId: user.id,
        username: userProfile.username,
        action: 'delete_restaurant_booking',
        details: `Deleted restaurant booking for ${bookingToDelete.clientName}`,
        path: `/bookings/${deletingId}`
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
    if (!supabase || !newBooking.clientName || !newBooking.date || !newBooking.time || !user || !userProfile) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all required fields.' });
      return;
    }

    const [hours, minutes] = newBooking.time.split(':').map(Number);
    const startTime = new Date(newBooking.date);
    startTime.setHours(hours, minutes, 0, 0);

    const bookingData = {
      id: crypto.randomUUID(), // Generate UUID for Supabase
      client_name: newBooking.clientName,
      client_email: newBooking.clientEmail,
      client_phone: newBooking.clientPhone,
      restaurant_table_id: 'manual',
      start_time: startTime.toISOString(),
      end_time: new Date(startTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      status: newBooking.status || 'Pending',
      // number_of_guests: newBooking.numberOfGuests || 1, // Add if schema supports
      source: 'Manual',
      notes: newBooking.notes,
    };

    try {
      await supabase.from('bookings').insert(bookingData);
      toast({ title: 'Success', description: 'New restaurant reservation created.' });
      logActivity({
        userId: user.id,
        username: userProfile.username,
        action: 'create_restaurant_booking',
        details: `Created new restaurant booking for ${bookingData.client_name}`,
        path: `/bookings/${bookingData.id}`
      });
      setIsNewDialogOpen(false);
      setNewBooking({});
      fetchBookings(); // Manual refresh although realtime should catch it
    } catch (error) {
      console.error(error);
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
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone
    }));
    setClientSearch(client.name);
    setClientSearchPopover(false);
  }


  return (
    <>
      <div>
        <div className="flex justify-between items-start mb-8">
          <h1 className="text-3xl font-bold">Restaurant Reservations</h1>
          <Button onClick={openNewDialog} disabled={!canEdit}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Reservation
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Booking List
            </CardTitle>
            <CardDescription>
              A list of all incoming reservations made for the restaurant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead className="text-center">Guests</TableHead>
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
                ) : reservations && reservations.length > 0 ? (
                  reservations.map((res) => {
                    const StatusIcon = statusStyles[res.status].icon;
                    return (
                      <TableRow key={res.id}>
                        <TableCell className="font-medium">{res.clientName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            {format(parseISO(res.startTime), 'E, MMM dd, yyyy')}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Clock size={14} />
                            {format(parseISO(res.startTime), 'h:mm a')}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{getGuestsFromNotes(res)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail size={14} />
                            {res.clientEmail}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Phone size={14} />
                            {res.clientPhone}
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
                                ({formatDistanceToNow(parseISO(res.startTime), { addSuffix: true })})
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
                      No restaurant reservations found.
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Restaurant Reservation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Popover open={clientSearchPopover} onOpenChange={setClientSearchPopover}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={clientSearchPopover} className="w-full justify-between">
                    {newBooking.clientName || "Select or create client..."}
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
                        setNewBooking(prev => ({ ...prev, clientName: search }));
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
              <div className="space-y-2"><Label>Client Email</Label><Input type="email" value={newBooking.clientEmail || ''} onChange={e => setNewBooking(p => ({ ...p, clientEmail: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Client Phone</Label><Input value={newBooking.clientPhone || ''} onChange={e => setNewBooking(p => ({ ...p, clientPhone: e.target.value }))} /></div>
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
                    <SelectItem value="19:00">7:00 PM</SelectItem>
                    <SelectItem value="19:30">7:30 PM</SelectItem>
                    <SelectItem value="20:00">8:00 PM</SelectItem>
                    <SelectItem value="20:30">8:30 PM</SelectItem>
                    <SelectItem value="21:00">9:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Number of Guests</Label><Input type="number" value={newBooking.numberOfGuests || ''} onChange={e => setNewBooking(p => ({ ...p, numberOfGuests: Number(e.target.value) }))} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={newBooking.notes || ''} onChange={e => setNewBooking(p => ({ ...p, notes: e.target.value }))} /></div>
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
