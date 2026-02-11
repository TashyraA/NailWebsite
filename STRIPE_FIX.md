# Fix Stripe Payment Initialization Issue

## Problem
The payment initialization is failing because the Supabase Edge Function doesn't have access to your Stripe Secret Key.

## Solution

You need to add your Stripe Secret Key to your Supabase project:

### Step 1: Get Your Stripe Secret Key
1. Go to https://dashboard.stripe.com/
2. Click on "Developers" in the left sidebar
3. Click on "API keys"
4. Copy your **Secret key** (starts with `sk_test_...` for test mode)

### Step 2: Add to Supabase
1. Go to https://supabase.com/dashboard
2. Select your project: `welrezlcsksigrqwfcme`
3. Go to **Settings** → **Edge Functions** → **Secrets**
4. Click **Add New Secret**
5. Name: `STRIPE_SECRET_KEY`
6. Value: Paste your Stripe secret key
7. Click **Save**

### Step 3: Redeploy the Edge Function
After adding the secret, you need to redeploy the edge function:

```bash
npx supabase functions deploy create-payment-intent
```

Or if you have the Supabase CLI installed globally:

```bash
supabase functions deploy create-payment-intent
```

## Verify It Works
1. Try to checkout again
2. Check the browser console for any errors
3. The payment form should now appear after clicking "Proceed to Payment"

## Note
- Make sure you're using TEST mode keys for testing
- Never commit secret keys to your repository
- The publishable key in your .env file is correct: `pk_test_...`
