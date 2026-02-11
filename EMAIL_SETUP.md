# Email Setup Guide

Your appointment booking system is now integrated with Supabase and includes automatic email notifications!

## ✅ What's Already Working

- **Database**: Appointments are saved to Supabase
- **Email Templates**: Beautiful HTML emails for all appointment stages
- **Email Triggers**: Automatic emails when status changes
- **Edge Function**: Ready to send emails

## 📧 Email Notifications

Emails are automatically sent for:

1. **Booking Confirmation** - When customer books appointment (status: pending)
2. **Appointment Confirmed** - When you confirm the appointment  
3. **Appointment Cancelled** - When appointment is cancelled
4. **Appointment Completed** - Thank you email after service

## 🔧 Production Email Setup

To send real emails in production, you need to configure an email service:

### Option 1: Resend (Recommended - Simple & Affordable)

1. **Sign up**: https://resend.com (Free tier: 100 emails/day)

2. **Get API Key**: Dashboard → API Keys → Create

3. **Add to Supabase**:
   - Go to Supabase Dashboard
   - Project Settings → Edge Functions → Secrets
   - Add secret: `RESEND_API_KEY` = your_api_key

4. **Update Edge Function**:
   Uncomment the Resend code in `supabase/functions/send-email/index.ts`

### Option 2: SendGrid

1. Sign up: https://sendgrid.com
2. Get API key
3. Add to Supabase secrets: `SENDGRID_API_KEY`
4. Update edge function to use SendGrid API

### Option 3: AWS SES

1. Set up AWS SES
2. Get credentials
3. Add to Supabase secrets
4. Update edge function

## 🧪 Testing Emails (Development)

Currently, emails are logged to console. To test:

1. **Book an appointment** on your site
2. **Check Supabase logs**: Edge Functions → send-email → Logs
3. You'll see the email content that would be sent

## 📝 Environment Variables

Make sure these are set in your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 🎨 Customizing Email Templates

Email templates are in `src/services/emailService.ts`:

- Edit HTML/CSS for styling
- Change text content
- Add your logo/branding
- Modify colors to match your theme

## 🔐 Security Notes

- ✅ Customer emails are validated
- ✅ All database operations use RLS (Row Level Security)
- ✅ Email sending is server-side only
- ✅ API keys never exposed to client

## 📱 Admin Dashboard

Use the Admin Dashboard to manage appointments:

1. Go to `/admin` (you'll need to set up auth)
2. View all appointments
3. Change status → Automatic email sent!
4. Track bookings, confirmations, completions

## 🆘 Troubleshooting

**Emails not sending?**
- Check Supabase Edge Function logs
- Verify API key is set in secrets
- Check email service quota/limits

**Database errors?**
- Verify migration ran successfully
- Check Supabase table permissions

**Need help?**
- Supabase docs: https://supabase.com/docs
- Resend docs: https://resend.com/docs
