import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { checkHouseboatAvailability } from '@/lib/availability';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            dates,
            houseboatId,
            houseboatName,
            clientDetails,
            totalPrice,
            paymentOption, // 'deposit' | 'full'
            numberOfGuests,
            checkInTime, // New: "HH:mm"
            selectedExtras // New: string[]
        } = body;

        // 1. Calculate Payment Amount
        // Deposit is 30% of total
        const depositAmount = Math.round(totalPrice * 0.3 * 100) / 100;
        const amountToCharge = paymentOption === 'deposit' ? depositAmount : totalPrice;

        // Stripe expects amount in cents
        const unitAmount = Math.round(amountToCharge * 100);

        // Validate Dates
        const fromDate = new Date(dates.from);
        const toDate = new Date(dates.to);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return NextResponse.json(
                { error: 'Invalid dates selected' },
                { status: 400 }
            );
        }

        // Apply Time if provided
        if (checkInTime) {
            const [hours, minutes] = checkInTime.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
                fromDate.setHours(hours, minutes, 0, 0);
                toDate.setHours(hours, minutes, 0, 0);
            }
        } else {
            // Default to 15:00 if not specified (though frontend enforces it)
            fromDate.setHours(15, 0, 0, 0);
            toDate.setHours(11, 0, 0, 0);
        }

        // 2. Smart Availability Check & Auto-Assignment
        const { available, boatId } = await checkHouseboatAvailability(houseboatId, dates.from, dates.to);

        if (!available || !boatId) {
            return NextResponse.json(
                { error: 'No boats available for the selected dates' },
                { status: 409 }
            );
        }

        const formattedFrom = fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const formattedTo = toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // 3. Create Stripe Session with ALL booking details in metadata
        // Booking will be created by the webhook ONLY after successful payment
        console.log('Creating Stripe session for boat:', boatId);

        try {
            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                automatic_payment_methods: { enabled: true },
                line_items: [
                    {
                        price_data: {
                            currency: 'eur',
                            product_data: {
                                name: `Houseboat: ${houseboatName}`,
                                description: paymentOption === 'deposit'
                                    ? `Deposit (30%) • ${formattedFrom} to ${formattedTo}`
                                    : `Full Payment • ${formattedFrom} to ${formattedTo}`,
                            },
                            unit_amount: unitAmount,
                        },
                        quantity: 1,
                    },
                ],
                success_url: `${request.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${request.headers.get('origin')}/houseboats?canceled=true`,
                metadata: {
                    // All booking details - will be used to create booking on payment success
                    boatId: boatId,
                    modelId: houseboatId,
                    boatName: houseboatName,
                    clientName: clientDetails.name,
                    clientEmail: clientDetails.email,
                    clientPhone: clientDetails.phone || '',
                    startTime: fromDate.toISOString(), // Sent with time component
                    endTime: toDate.toISOString(),     // Sent with time component
                    totalPrice: totalPrice.toString(),
                    depositAmount: depositAmount.toString(),
                    numberOfGuests: numberOfGuests?.toString() || '2',
                    paymentOption: paymentOption,
                    billingNif: clientDetails.nif || '',
                    billingAddress: clientDetails.address || '',
                    selectedExtras: selectedExtras ? JSON.stringify(selectedExtras) : '[]', // Pass extras as JSON string
                },
                customer_email: clientDetails.email,
            } as any);

            console.log('Stripe session created:', session.id);

            return NextResponse.json({
                sessionId: session.id,
                url: session.url
            });
        } catch (stripeErr: any) {
            console.error('Stripe Session Creation Error:', stripeErr);
            return NextResponse.json(
                { error: `Stripe Error: ${stripeErr.message}` },
                { status: 500 }
            );
        }
    } catch (err: any) {
        console.error('General Checkout Error:', err);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
