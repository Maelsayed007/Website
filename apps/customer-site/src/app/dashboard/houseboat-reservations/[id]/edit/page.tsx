'use client';

import { useParams } from 'next/navigation';
import { BookingFormPage } from '@/features/dashboard/houseboat-reservations/booking-form-page';

export default function EditHouseboatReservationPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params?.id;

  return <BookingFormPage mode="edit" bookingId={bookingId} />;
}

