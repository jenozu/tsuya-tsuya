# Tsuyanouchi Setup Guide

This guide will help you set up the Tsuyanouchi e-commerce platform with all necessary services.

## Prerequisites

- Node.js 20+ installed
- npm installed
- Accounts on:
  - [Supabase](https://supabase.com) (free tier)
  - [Stripe](https://stripe.com) (test mode)
  - [Resend](https://resend.com) (free tier)
  - [Google AI Studio](https://makersuite.google.com/app/apikey) (for Gemini API)

## Step 1: Install Dependencies

```bash
cd gemini/tsuyanouchi
npm install
```

## Step 2: Set Up Supabase

### Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details
4. Wait for project to be ready

### Run Database Migrations

1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the SQL from `SUPABASE_SCHEMA.sql` (see below)
3. Click "Run"

### Get API Credentials

1. Go to Project Settings → API
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### Create Storage Bucket

1. Go to Storage → Create new bucket
2. Name: `product-images`
3. Public bucket: Yes
4. Allowed MIME types: `image/*`

## Step 3: Set Up Stripe

### Get API Keys

1. Go to [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. Copy:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`

### Set Up Webhook (Local Development)

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This command will output a webhook signing secret. Copy it to `STRIPE_WEBHOOK_SECRET`.

### Set Up Webhook (Production)

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
4. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

## Step 4: Set Up Resend

1. Go to [https://resend.com](https://resend.com)
2. Create API Key
3. Copy API Key → `RESEND_API_KEY`
4. Set your email for order notifications → `ORDER_NOTIFICATION_EMAIL`

## Step 5: Get Gemini API Key

1. Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Create API key
3. Copy it → `GEMINI_API_KEY`

## Step 6: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in all the values in `.env.local` with the credentials from above

## Step 7: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 8: Test the Application

1. Browse products at `/shop`
2. Add items to cart
3. Go through checkout at `/checkout`
4. Test Stripe payment (use test card: `4242 4242 4242 4242`)
5. Access admin at `/admin` (use password from `.env.local`)

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your repository
4. Set Root Directory to: `gemini/tsuyanouchi`
5. Add all environment variables from `.env.local`
6. Use **live** Stripe keys for production (not test keys)
7. Click "Deploy"

### 3. Configure Production Stripe Webhook

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.vercel.app/api/webhooks/stripe`
3. Select the same events as above
4. Update `STRIPE_WEBHOOK_SECRET` in Vercel with the new signing secret

## Troubleshooting

### Products not loading

- Check that Supabase credentials are correct
- Verify database migrations ran successfully
- Check browser console for errors

### Payment not working

- Verify Stripe keys are correct
- Check that webhook is configured properly
- Use Stripe test card numbers for testing

### Emails not sending

- Verify Resend API key is correct
- Check Resend dashboard for delivery logs
- Emails will fail gracefully without breaking checkout

### Admin login not working

- Check that `ADMIN_PASSWORD` is set in `.env.local`
- Restart dev server after adding environment variables

## Support

For issues, check:
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Resend Documentation](https://resend.com/docs)
