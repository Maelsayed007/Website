'use client';

import { useMemo, useEffect, useState } from 'react';
import { useAuth, useSupabase } from '@/components/providers/supabase-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Ship, Utensils, Euro, Mail, LogOut, Package, Loader2, Key, Check, Clock, Phone, User, ChevronRight, LayoutGrid, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { isFuture, format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// Booking status milestones for Amazon-style tracking
const BOOKING_MILESTONES = [
  { key: 'Pending', label: 'Pending', description: 'Awaiting confirmation' },
  { key: 'Contacted', label: 'Contacted', description: 'We reached out to you' },
  { key: 'Confirmed', label: 'Confirmed', description: 'Booking confirmed' },
  { key: 'CheckIn', label: 'Check-In', description: 'Ready for your arrival' },
  { key: 'Completed', label: 'Completed', description: 'Thank you for visiting' },
];

const statusToMilestone: Record<string, number> = {
  'Pending': 0,
  'Contacted': 1,
  'Confirmed': 2,
  'CheckIn': 3,
  'Completed': 4,
  'Cancelled': -1,
};

export default function MyBookingsPage() {
  const { user, isUserLoading, signOut } = useAuth();
  const { supabase } = useSupabase();
  const router = useRouter();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  // Profile Settings State
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const fetchBookings = async () => {
    if (!supabase || !user?.email) return;
    setIsLoadingBookings(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_email', user.email)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      fetchBookings();
      fetchProfile();
    }
  }, [user?.email, supabase]);

  const fetchProfile = async () => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) setUserProfile(data);
  };

  const upcoming = useMemo(() => bookings.filter(b => b.start_time && isFuture(new Date(b.start_time))), [bookings]);
  const past = useMemo(() => bookings.filter(b => b.start_time && !isFuture(new Date(b.start_time))), [bookings]);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Password must be at least 6 characters' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
      setIsPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const getBookingIcon = (b: any) => {
    if (b.houseboat_id) return <Ship className="h-5 w-5" />;
    if (b.restaurant_table_id) return <Utensils className="h-5 w-5" />;
    return <Calendar className="h-5 w-5" />;
  };

  const getBookingType = (b: any) => {
    if (b.houseboat_id) return 'Houseboat Rental';
    if (b.restaurant_table_id) return 'Restaurant Reservation';
    return 'Daily Travel Package';
  };

  const getMilestoneIndex = (status: string) => statusToMilestone[status] ?? 0;

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto max-w-4xl px-6 py-12">
          <Skeleton className="h-10 w-56 mb-2" />
          <Skeleton className="h-5 w-80 mb-10" />
          <Skeleton className="h-32 w-full rounded-2xl mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const displayName = user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0];

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto max-w-4xl px-6 py-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            Welcome back, {displayName}
          </h1>
          <p className="text-muted-foreground">
            Manage your reservations and account
          </p>
        </div>

        {/* Profile Card */}
        <Card className="mb-8 border-border">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {displayName?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{displayName}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(userProfile?.permissions?.isSuperAdmin || userProfile?.permissions?.canViewDashboard || user?.email === 'myasserofficial@gmail.com') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      asChild
                      className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none shadow-none"
                    >
                      <Link href="/dashboard">
                        <LayoutGrid className="h-4 w-4 mr-1.5" />
                        Staff Dashboard
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPasswordDialogOpen(true)}
                  >
                    <Key className="h-4 w-4 mr-1.5" />
                    Password
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { signOut(); router.push('/'); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-1.5" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="p-4 text-center">
                <p className="text-2xl font-bold">{upcoming.length}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-2xl font-bold">{past.length}</p>
                <p className="text-xs text-muted-foreground">Past</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-2xl font-bold">{bookings.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings Section */}
        <div className="space-y-6">
          {isLoadingBookings ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : bookings.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="h-14 w-14 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Package className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No bookings yet</h3>
                <p className="text-muted-foreground text-sm mb-6">Start your adventure with Amieira Getaways</p>
                <Button asChild>
                  <Link href="/houseboats">Browse Houseboats</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Ongoing Bookings with Amazon-style tracking */}
              {upcoming.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Ongoing Reservations
                  </h2>
                  <div className="space-y-4">
                    {upcoming.map((b) => {
                      const currentMilestone = getMilestoneIndex(b.status);
                      const isCancelled = b.status === 'Cancelled';

                      return (
                        <Card key={b.id} className="overflow-hidden">
                          <CardContent className="p-0">
                            {/* Booking Header */}
                            <div className="p-5 border-b border-border">
                              <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                  {getBookingIcon(b)}
                                </div>
                                <div className="flex-grow">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-semibold">{getBookingType(b)}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {b.start_time && format(new Date(b.start_time), 'EEEE, MMMM d, yyyy')}
                                      </p>
                                    </div>
                                    {b.price && (
                                      <span className="font-bold text-lg">€{Number(b.price).toFixed(0)}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Amazon-style Milestone Tracker */}
                            {!isCancelled && (
                              <div className="p-5 bg-muted/30">
                                <div className="flex items-center justify-between">
                                  {BOOKING_MILESTONES.map((milestone, idx) => {
                                    const isCompleted = idx <= currentMilestone;
                                    const isCurrent = idx === currentMilestone;

                                    return (
                                      <div key={milestone.key} className="flex-1 relative">
                                        {/* Connector Line */}
                                        {idx < BOOKING_MILESTONES.length - 1 && (
                                          <div className={cn(
                                            "absolute top-3 left-1/2 h-0.5 w-full",
                                            isCompleted ? "bg-primary" : "bg-border"
                                          )} />
                                        )}

                                        {/* Milestone Point */}
                                        <div className="flex flex-col items-center relative z-10">
                                          <div className={cn(
                                            "h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all",
                                            isCompleted
                                              ? "bg-primary border-primary text-primary-foreground"
                                              : "bg-background border-border",
                                            isCurrent && "ring-2 ring-primary/30 ring-offset-2"
                                          )}>
                                            {isCompleted ? (
                                              <Check className="h-3 w-3" />
                                            ) : (
                                              <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                                            )}
                                          </div>
                                          <span className={cn(
                                            "text-[10px] mt-1.5 text-center font-medium",
                                            isCompleted ? "text-foreground" : "text-muted-foreground"
                                          )}>
                                            {milestone.label}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {isCancelled && (
                              <div className="p-4 bg-destructive/10 text-destructive text-sm font-medium text-center">
                                This booking has been cancelled
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Past Bookings */}
              {past.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Past Reservations
                  </h2>
                  <div className="space-y-2">
                    {past.slice(0, 5).map((b) => (
                      <div key={b.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
                        <div className="h-10 w-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                          {getBookingIcon(b)}
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-medium text-sm">{getBookingType(b)}</h4>
                          <p className="text-xs text-muted-foreground">
                            {b.start_time && format(new Date(b.start_time), 'MMM d, yyyy')}
                          </p>
                        </div>
                        {b.price && <span className="font-medium text-sm">€{Number(b.price).toFixed(0)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter a new password for your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} disabled={isUpdatingPassword}>
              Cancel
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={isUpdatingPassword || newPassword.length < 6 || newPassword !== confirmPassword}
            >
              {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
