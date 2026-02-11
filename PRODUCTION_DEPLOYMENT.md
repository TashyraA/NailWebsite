# 🚀 Production Deployment Guide

## Step 1: Configure Stripe Live Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Switch to **LIVE** mode (toggle in the left sidebar)
3. Copy your **Publishable Key** (starts with `pk_live_`)
4. Copy your **Secret Key** (starts with `sk_live_`)

### Update Environment Variables:
```bash
# In your .env file:
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_LIVE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_LIVE_KEY
APP_URL=https://your-actual-domain.com
```

### Update Supabase Secrets:
```bash
supabase secrets set STRIPE_SECRET_KEY="sk_live_YOUR_ACTUAL_LIVE_KEY" --project-ref welrezlcsksigrqwfcme
supabase secrets set APP_URL="https://your-actual-domain.com" --project-ref welrezlcsksigrqwfcme
supabase secrets set ADMIN_EMAIL="your-admin@email.com" --project-ref welrezlcsksigrqwfcme
```

## Step 2: Apply Database Schema
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/welrezlcsksigrqwfcme/sql)
2. Copy the entire contents of `COMPLETE_DATABASE_SETUP.sql`
3. Paste and click **"RUN"**

## Step 3: Verify Email Domain
1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add your custom domain (e.g., `mail.your-domain.com`)
3. Configure DNS records as shown
4. Update the `from` field in `send-email` function:
```typescript
from: 'Your Business Name <noreply@your-domain.com>',
```

## Step 4: Deploy Edge Functions
```bash
supabase functions deploy --project-ref welrezlcsksigrqwfcme
```

## Step 5: Build and Deploy Frontend
```bash
npm run build
```
Then deploy the `dist` folder to your hosting provider (Vercel, Netlify, etc.)

## Step 6: Test Production
1. ✅ Test a real booking with live Stripe
2. ✅ Verify emails are delivered
3. ✅ Check admin panel functionality
4. ✅ Test balance payment flow

## ⚠️ Important Notes
- **Stripe Webhooks**: Configure webhook endpoints in Stripe Dashboard
- **Domain**: Update all localhost references to your live domain
- **SSL**: Ensure your domain has valid SSL certificate
- **DNS**: Configure domain to point to your hosting provider

## 🔄 Rollback Plan (If Issues)
```bash
# Switch back to test mode temporarily:
supabase secrets set STRIPE_SECRET_KEY="sk_test_YOUR_TEST_KEY" --project-ref welrezlcsksigrqwfcme
```

## 🎯 Post-Launch Checklist
- [ ] Monitor Stripe Dashboard for real payments
- [ ] Check Edge Function logs in Supabase
- [ ] Verify email delivery rates in Resend
- [ ] Test booking flow end-to-end
- [ ] Monitor database performance