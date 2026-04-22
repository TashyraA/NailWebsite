# 📧 Email Setup - Quick Checklist

Follow these steps IN ORDER:

---

## ☑️ **Step 1: Sign Up for Resend (2 minutes)**

1. Go to: https://resend.com
2. Click "Start Building"
3. Sign up with: **brianalehota@gmail.com**
4. Verify email (check inbox)
5. Complete onboarding

---

## ☑️ **Step 2: Get API Key (1 minute)**

1. In Resend dashboard, click **"API Keys"** (left sidebar)
2. Click **"Create API Key"**
3. Name it: `InLoveNailz`
4. Click **"Create"**
5. **COPY THE KEY** (starts with `re_...`)
6. Save it in a text file

---

## ☑️ **Step 3: Add to Supabase (2 minutes)**

1. Go to: https://supabase.com/dashboard
2. Open your project
3. Click **Settings** (⚙️ bottom left)
4. Click **Edge Functions**
5. Click **"New secret"**
6. Name: `RESEND_API_KEY`
7. Value: Paste your Resend key
8. Click **"Save"**

---

## ☑️ **Step 4: Test It! (2 minutes)**

1. Go to your website
2. Book a test appointment (use your email)
3. Use test card: **4242 4242 4242 4242**
4. Complete booking
5. **Check your email!** ✉️

---

## ✅ **Done!**

Emails are now sending automatically! 🎉

**Total Time**: ~7 minutes

**Files to Read**:
- `EMAIL_COMPLETE_SETUP.md` - Full detailed instructions
- `EMAIL_QUICKSTART.md` - This file (quick checklist)

---

## 🆘 **Not Working?**

1. Check spam folder
2. Go to Supabase → Edge Functions → send-email → Logs
3. Look for error messages
4. Read `EMAIL_COMPLETE_SETUP.md` troubleshooting section
5. Ask me for help!
