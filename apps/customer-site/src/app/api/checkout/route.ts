import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { checkUnifiedAvailability } from '@/lib/availability';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            dates,
            houseboatId,
            houseboatName,
            clientDetails,
            totalPrice,
            numberOfGuests,
            checkInTime,
            selectedExtras,
            bookingType,
        } = body;

        // Deposit-only policy: all confirmations use 30%.
        const depositAmount = Math.round(Number(totalPrice || 0) * 0.3 * 100) / 100;
        const unitAmount = Math.round(depositAmount * 100);

        const fromDate = new Date(dates?.from);
        const toDate = new Date(dates?.to);

        if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
            return NextResponse.json({ error: 'Invalid dates selected' }, { status: 400 });
        }

        if (bookingType === 'day_charter') {
            fromDate.setHours(9, 0, 0, 0);
            toDate.setHours(17, 0, 0, 0);
        } else {
            if (checkInTime) {
                const [hours, minutes] = checkInTime.split(':').map(Number);
                if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
                    fromDate.setHours(hours, minutes, 0, 0);
                } else {
                    fromDate.setHours(15, 0, 0, 0);
                }
            } else {
                fromDate.setHours(15, 0, 0, 0);
            }
            toDate.setHours(11, 0, 0, 0);
        }

        const { available, boat } = await checkUnifiedAvailability({
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            numberOfGuests: parseInt(numberOfGuests?.toString() || '2', 10),
            bookingType: bookingType === 'day_charter' ? 'daily' : 'overnight',
            allowedModelIds: [houseboatId],
        });

        const boatId = boat?.id;
        if (!available || !boatId) {
            return NextResponse.json(
                { error: 'No boats available for the selected dates or capacity' },
                { status: 409 }
            );
        }

        const formattedFrom = fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const formattedTo = toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            automatic_payment_methods: { enabled: true },
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Houseboat: ${houseboatName}`,
                            description: `Deposit (30%) | ${formattedFrom} to ${formattedTo}`,
                        },
                        unit_amount: unitAmount,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${request.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.headers.get('origin')}/houseboats?canceled=true`,
            metadata: {
                boatId,
                modelId: houseboatId,
                boatName: houseboatName,
                clientName: clientDetails.name,
                clientEmail: clientDetails.email,
                clientPhone: clientDetails.phone || '',
                startTime: fromDate.toISOString(),
                endTime: toDate.toISOString(),
                totalPrice: String(totalPrice || 0),
                depositAmount: String(depositAmount),
                numberOfGuests: numberOfGuests?.toString() || '2',
                paymentOption: 'deposit',
                billingNif: clientDetails.nif || '',
                billingAddress: clientDetails.address || '',
                selectedExtras: selectedExtras ? JSON.stringify(selectedExtras) : '[]',
                bookingType: bookingType || 'overnight',
            },
            customer_email: clientDetails.email,
        } as any);

        return NextResponse.json({
            sessionId: session.id,
            url: session.url,
        });
    } catch (err: any) {
        return NextResponse.json(
            { error: err?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

