# 📧 Complete Email Setup Guide - Send Real Emails!

Follow these steps to get your appointment confirmation emails actually sending to customers.

---

## ✅ **What Emails Will Send**

Once set up, your customers automatically receive emails for:

1. **Booking Confirmation** - Right after they book an appointment
2. **Appointment Confirmed** - When you click "Confirm" in admin dashboard
3. **Appointment Cancelled** - When you cancel an appointment
4. **Thank You** - When you mark appointment as "Completed"

---

## 🚀 **Setup Instructions (5-10 minutes)**

### **STEP 1: Create Resend Account**

1. Go to: **https://resend.com**
2. Click **"Start Building"** button
3. Sign up with your email: **brianalehota@gmail.com**
4. Check your email for verification link
5. Click the verification link
6. Complete the onboarding (name, company info, etc.)

---

### **STEP 2: Get Your Resend API Key**

1. After logging in, you'll see the **Resend Dashboard**
2. In the left sidebar, click **"API Keys"**
3. Click **"Create API Key"** button
4. Give it a name: `InLoveNailz Production`
5. Click **"Add"** or **"Create"**
6. **COPY THE KEY** immediately (starts with `re_...`)
   - Example: `re_abc123def456ghi789`
   - ⚠️ **SAVE IT SOMEWHERE** - You can only see it once!
   - Paste it in a text file temporarily

---

### **STEP 3: Add API Key to Supabase**

1. Open a new tab and go to: **https://supabase.com/dashboard**
2. Log in if needed
3. Click on your project (your nail salon project)
4. On the left sidebar, scroll down and click **"Settings"** (⚙️ gear icon)
5. In the Settings menu, click **"Edge Functions"**
6. Look for **"Secrets"** section or click **"Manage secrets"**
7. Click **"New secret"** or **"Add new secret"**
8. Fill in the form:
   - **Secret Name**: `RESEND_API_KEY`
   - **Secret Value**: Paste your Resend API key (the `re_...` one you copied)
9. Click **"Save"** or **"Add"**
10. You should see it appear in the secrets list

---

### **STEP 4: Deploy the Updated Edge Function**

The email sending code has been updated. Now it needs to be deployed:

**Option A: Using Supabase Dashboard (Easiest)**
1. The edge function should auto-deploy
2. Wait 1-2 minutes for deployment
3. Check Supabase → Edge Functions → send-email → should show "Active"

**Option B: Manual Deploy (If auto-deploy doesn't work)**

If you have Supabase CLI installed:
```bash
supabase functions deploy send-email
```

If you don't have CLI, you can skip this - the function will deploy automatically when you push changes to Git.

---

### **STEP 5: Test It!**

1. **Go to your website**
2. **Book a test appointment**:
   - Add a service to cart
   - Go to checkout
   - Fill in YOUR email address (so you receive the test email)
   - Select a date/time
   - Use test card: `4242 4242 4242 4242`
   - Complete payment
3. **Check your email inbox** (brianalehota@gmail.com)
4. You should receive a beautiful booking confirmation email! ✉️

---

## 🎯 **Verify Everything Works**

### **Test All Email Types:**

1. **Booking Confirmation** ✅
   - Book an appointment → Check your email

2. **Appointment Confirmed** ✅
   - Go to `/admin/appointments`
   - Click "Confirm" button on an appointment
   - Check email

3. **Appointment Completed** ✅
   - Click "Complete" button in admin
   - Check email

4. **Appointment Cancelled** ✅
   - Click "Cancel" button in admin
   - Check email

---

## 🔍 **Troubleshooting**

### **Email not arriving?**

1. **Check spam folder** - Sometimes first emails go to spam
2. **Check Supabase logs**:
   - Go to Supabase Dashboard
   - Click "Edge Functions"
   - Click "send-email"
   - Click "Logs" tab
   - Look for errors in red

3. **Verify API key is correct**:
   - Go to Supabase → Settings → Edge Functions → Secrets
   - Make sure `RESEND_API_KEY` is there
   - If wrong, delete it and add it again

4. **Check Resend dashboard**:
   - Go to https://resend.com/emails
   - See if emails are being sent
   - Check for any errors

### **Error: "Email service not configured"**
- The API key is missing from Supabase
- Go back to Step 3 and add it

### **Error: "Resend API error: Invalid API key"**
- The API key is wrong
- Get a new key from Resend
- Update it in Supabase secrets

### **Email sends but looks weird**
- Email templates are already beautiful
- If you see plain text, check spam folder
- HTML emails might be blocked by email client

---

## 📊 **Monitor Your Emails**

### **Resend Dashboard**
Go to: https://resend.com/emails

You can see:
- ✅ All emails sent
- ✅ Delivery status
- ✅ Open rates (if enabled)
- ✅ Bounce/error details

### **Supabase Logs**
Go to: Supabase Dashboard → Edge Functions → send-email → Logs

You can see:
- ✅ Every email request
- ✅ Success/failure status
- ✅ Error messages if any

---

## 💰 **Free Tier Limits**

**Resend Free Plan:**
- ✅ 100 emails per day
- ✅ 3,000 emails per month
- ✅ Perfect for small business

**If you exceed:**
- Upgrade to paid plan (starts at $20/month for 50,000 emails)
- Or use a different email service

---

## 🎨 **Customize Email Sender Name (Optional)**

Right now emails come from: `InLoveNailz <onboarding@resend.dev>`

To use your own domain (e.g., `briana@luxenails.com`):

1. Go to Resend → **Domains**
2. Click **"Add Domain"**
3. Follow their DNS setup instructions
4. Update the edge function code to use your domain

For now, the default works perfectly fine!

---

## ✅ **What Your Emails Look Like**

Each email includes:
- 💅 Beautiful pink/rose theme matching your website
- 📅 Appointment date & time
- 🎨 List of services booked
- 💰 Payment details (deposit paid, balance due)
- 📧 Your contact info
- 📱 Instagram link (@briilovesnailz)
- 🔒 Professional layout

---

## 🚀 **You're All Set!**

Once you complete these steps:
- ✅ Customers get instant booking confirmations
- ✅ You can send updates from admin dashboard
- ✅ Professional email communications
- ✅ Automated thank you emails

**Test it now and watch the magic happen!** ✨

---

## 💡 **Quick Reference**

**Resend Dashboard**: https://resend.com  
**Supabase Dashboard**: https://supabase.com/dashboard  
**Test Card**: 4242 4242 4242 4242  
**Your Email**: brianalehota@gmail.com  
**Support**: Ask me if you get stuck!

---

## 📞 **Need Help?**

If something doesn't work:
1. Check the troubleshooting section above
2. Look at Supabase Edge Function logs
3. Check Resend dashboard for errors
4. Ask me and share any error messages you see!

**Good luck!** 🎉💅✨
