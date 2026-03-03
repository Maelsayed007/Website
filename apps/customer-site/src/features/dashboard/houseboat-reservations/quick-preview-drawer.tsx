'use client';

import { format, parseISO } from 'date-fns';
import { CalendarDays, Clock, Mail, Phone, Pencil, Trash2, UserRound, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { MappedBooking } from './types';
import { getReservationBlockClass } from './calendar-utils';

type QuickPreviewDrawerProps = {
  open: boolean;
  booking: MappedBooking | null;
  getBoatName: (id: string | undefined) => string;
  onOpenChange: (open: boolean) => void;
  onEdit: (booking: MappedBooking) => void;
  onDelete: (booking: MappedBooking) => void;
  onCustomer360: (booking: MappedBooking) => void;
};

function paymentStatusLabel(booking: MappedBooking) {
  const total = booking.price || booking.totalPrice || 0;
  const paid = booking.amount_paid || 0;
  if (paid >= total) return 'Fully paid';
  if (paid > 0) return 'Deposit paid';
  if (booking.payment_status === 'failed') return 'Payment failed';
  return 'Pending payment';
}

export function QuickPreviewDrawer(props: QuickPreviewDrawerProps) {
  const { open, booking, getBoatName, onOpenChange, onEdit, onDelete, onCustomer360 } = props;
  if (!booking) return null;

  return (
    <Sheet modal={false} open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[440px] max-w-[96vw] border-l border-border bg-card p-0">
        <SheetHeader className={cn('border-b border-border px-5 py-4 text-left', getReservationBlockClass(booking))}>
          <Badge className="w-fit border-none bg-black/15 text-white">{booking.status}</Badge>
          <SheetTitle className="mt-2 text-xl font-semibold text-white">{booking.clientName || 'Unnamed client'}</SheetTitle>
          <SheetDescription className="text-white/90">
            {getBoatName(booking.houseboatId)} - Ref {booking.id.slice(0, 8).toUpperCase()}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest</p>
              <div className="space-y-2 text-sm text-foreground">
                <p className="flex items-center gap-2"><UserRound className="h-4 w-4 text-muted-foreground" /> {booking.clientName || 'N/A'}</p>
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {booking.clientEmail || 'N/A'}</p>
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {booking.clientPhone || 'N/A'}</p>
                <p className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-muted-foreground" /> {booking.numberOfGuests || 0} guests</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule</p>
              <div className="space-y-2 text-sm text-foreground">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {format(parseISO(booking.startTime), 'EEE, MMM dd yyyy')}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {format(parseISO(booking.startTime), 'HH:mm')} - {format(parseISO(booking.endTime), 'HH:mm')}
                </p>
                <p className="font-semibold">
                  {format(parseISO(booking.startTime), 'MMM dd')} - {format(parseISO(booking.endTime), 'MMM dd')}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Financial</p>
              <Badge variant="outline" className="border-border bg-muted/40 text-foreground">{paymentStatusLabel(booking)}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-semibold text-foreground">EUR {(booking.price || booking.totalPrice || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-semibold text-foreground">EUR {(booking.amount_paid || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Due</p>
                <p className="font-semibold text-foreground">
                  EUR {Math.max(0, (booking.price || booking.totalPrice || 0) - (booking.amount_paid || 0)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {booking.notes ? (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="mt-2 text-sm text-foreground">{booking.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-auto border-t border-border bg-card px-5 py-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => onCustomer360(booking)}
              title="Open customer history"
            >
              Customer
            </Button>
            <Button className="h-10 rounded-xl" onClick={() => onEdit(booking)} title="Edit reservation details">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(booking)}
              title="Delete reservation"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}



