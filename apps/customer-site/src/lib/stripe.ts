import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build', {
    apiVersion: '2025-12-15.clover',
    typescript: true,
});
