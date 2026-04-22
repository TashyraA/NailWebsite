# 💳 Stripe Payment Integration - Setup Guide

Your Stripe payment system is now integrated! Follow these steps to get it working.

---

## ✅ What's Integrated

- **Secure Stripe Checkout** - PCI-compliant payment processing
- **Deposit Payments** - 50% deposit required at booking
- **Payment Success** → Appointment saved + Email sent
- **Payment Modal** - Beautiful popup payment form
- **Supabase Edge Function** - Server-side payment intent creation

---

## 🔧 Setup Steps

### **Step 1: Add Stripe Keys to .env File**

1. Create a `.env` file in your project root (if it doesn't exist)
2. Add these lines:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51Spbm6Af3Z7zU2MLy7N2URaSpO2e9jaZZOOC0h4bCCeoe3DSZ3MOmhGpM8GABytBdM9RbVOWhgWK3r0Nfa30O4QZ005SHRW7eP
```

**⚠️ IMPORTANT**: Never commit `.env` to Git! It's in `.gitignore` by default.

### **Step 2: Add Secret Key to Supabase**

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Edge Functions** → **Manage secrets**
4. Click **"New secret"**
5. Add:
   - **Name**: `STRIPE_SECRET_KEY`
   - **Value**: `sk_test_51Spbm6Af3Z7zU2MLvweRdSivp1Aqh8kSxg39ZX2suU61rPHLb7SVPibGUsdocbdhQi1DE2h88JlAyRvfzW8lZF2x00r1JOa7nd`
6. Click **"Save"**

### **Step 3: Deploy Edge Function**

The `create-payment-intent` edge function needs to be deployed. You have two options:

**Option A: Auto-deploy (if configured)**
- Edge functions auto-deploy when you push to Git

**Option B: Manual deploy via Supabase CLI**
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy create-payment-intent
```

---

## 🧪 Testing Payments

### **Test Card Numbers (Stripe Test Mode)**

Use these cards to test:

✅ **Successful Payment**:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

❌ **Card Declined**:
- Card: `4000 0000 0000 0002`

🔄 **Requires Authentication**:
- Card: `4000 0025 0000 3155`

[More test cards](https://stripe.com/docs/testing#cards)

### **Testing Flow**:

1. Add services to cart
2. Go to checkout
3. Fill in customer information
4. Select date & time
5. Click "Proceed to Payment"
6. Payment modal opens
7. Enter test card: `4242 4242 4242 4242`
8. Complete payment
9. ✅ Appointment saved
10. ✅ Email sent
11. ✅ Confirmation page shown

---

## 💰 Payment Flow

**Customer Journey:**
1. Selects services → Adds to cart
2. Goes to checkout
3. Fills contact info & selects appointment time
4. Clicks "Proceed to Payment"
5. **Secure payment modal opens**
6. Enters card details
7. Pays 50% deposit
8. **Stripe processes payment**
9. Appointment saved to database
10. Confirmation email sent
11. Confirmation page displayed

**What You See:**
- All payments in Stripe Dashboard
- Automatic payouts to your bank account
- Detailed transaction history
- Customer email receipts

---

## 📊 Stripe Dashboard

Access your Stripe Dashboard: https://dashboard.stripe.com

**Features:**
- 💵 **Payments** - View all transactions
- 👥 **Customers** - See customer payment history
- 📈 **Reports** - Revenue tracking
- 🔄 **Refunds** - Issue refunds for cancellations
- ⚙️ **Settings** - Configure business info

---

## 🔐 Security Features

✅ **PCI Compliant** - Stripe handles all card data  
✅ **No card data touches your server** - Client-side only  
✅ **3D Secure** - Additional authentication when needed  
✅ **Fraud detection** - Stripe's machine learning  
✅ **Encrypted** - All data encrypted in transit  

---

## 💸 Deposit Configuration

Current settings (in `src/lib/stripe.ts`):
- **Deposit Percentage**: 50%
- **Minimum Deposit**: $20
- **Currency**: USD

To change:
```typescript
export const STRIPE_CONFIG = {
  currency: 'usd',
  depositPercentage: 0.5, // Change to 0.3 for 30%, etc.
  minimumDeposit: 20, // Minimum deposit amount
};
```

---

## 🚀 Going Live (Production)

When ready for real payments:

1. **Complete Stripe Account Activation**:
   - Verify business info
   - Add bank account for payouts
   - Complete identity verification

2. **Switch to Live Keys**:
   - Get live keys from Stripe (start with `pk_live_...` and `sk_live_...`)
   - Update `.env` with live publishable key
   - Update Supabase secrets with live secret key

3. **Test thoroughly** in test mode before going live!

4. **Go live** by switching Stripe dashboard to "Live mode"

---

## 🆘 Troubleshooting

**Payment modal doesn't open?**
- Check browser console for errors
- Verify `.env` file has VITE_STRIPE_PUBLISHABLE_KEY
- Restart dev server after adding env variables

**"Payment intent creation failed"?**
- Check Supabase Edge Function logs
- Verify STRIPE_SECRET_KEY is in Supabase secrets
- Ensure edge function is deployed

**Payment succeeds but appointment not created?**
- Check browser console
- Verify database table exists
- Check Supabase logs for errors

**Need Help?**
- Stripe Docs: https://stripe.com/docs
- Supabase Docs: https://supabase.com/docs
- Test mode is free - test as much as you need!

---

## 📧 Email + Payment Integration

**Current Flow:**
1. Customer pays deposit → Payment succeeds
2. Appointment saved to database
3. Confirmation email sent automatically
4. Customer receives email with appointment details

**All working together!** 🎉
