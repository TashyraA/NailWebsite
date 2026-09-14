import { loadStripe } from '@stripe/stripe-js';

// Load Stripe with publishable key from environment variables
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

if (!stripePublishableKey) {
  console.warn('⚠️ Stripe publishable key is missing. Payment features will not work.');
  console.warn('Add VITE_STRIPE_PUBLISHABLE_KEY to your .env file');
}

export const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null);

export const STRIPE_CONFIG = {
  currency: 'usd',
  depositPercentage: 0.5, // Legacy setting; Cal.com collects the fixed $20 booking deposit.
  minimumDeposit: 20, // Minimum $20 deposit
};
