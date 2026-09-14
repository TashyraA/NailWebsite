# Stripe-only booking setup

This project uses React + Vite + TypeScript on the frontend and Vercel serverless functions under `api/`. It does not use Cal.com, Supabase, or a database.

## Customer flow

1. The customer chooses services and quantities in the existing cart.
2. `/checkout` displays a local calendar and time slots.
3. Availability is Monday-Friday 9:00 AM-5:00 PM and Saturday 9:00 AM-3:00 PM. Appointments are two hours, have a 15-minute buffer, and require 24 hours' notice.
4. The customer enters contact details and is redirected to Stripe Checkout for the fixed $20 deposit.
5. Stripe calls `/api/stripe-webhook` after successful payment. The webhook sends the customer a pending email and the nail tech an email with signed approve/decline links.
6. Approval calls `/api/approve-appointment`, sends the confirmed appointment email, and creates a Stripe Checkout link for the remaining balance.
7. Stripe calls `/api/stripe-webhook` again after the remaining balance is paid. The customer receives a thank-you email and the nail tech receives a payment notification.

## Environment variables

Configure these in Vercel and local development:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VITE_STRIPE_PUBLISHABLE_KEY` (only needed by any remaining Stripe client UI)
- `RESEND_API_KEY`
- `EMAIL_FROM` using a verified sender domain
- `BUSINESS_EMAIL`
- `BOOKING_LINK_SECRET` using a long random value
- `APP_URL` with the deployed site URL

Cloudinary variables remain available for permanent service images.

## Stripe webhook

In Stripe Dashboard, create a webhook endpoint:

`https://your-live-domain.com/api/stripe-webhook`

Subscribe to:

- `checkout.session.completed`

Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`. Do not use a Stripe secret key in frontend code.

## No database limitation

There is no persistent appointment list or collision protection. Stripe payment events and emails are the source of truth. The signed booking payload travels through Stripe metadata and approval links. If two customers select the same time, both can pay unless an external calendar or database is later introduced.
