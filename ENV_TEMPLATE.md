# Environment Variables Template

Create a `.env.local` file in the `gemini/tsuyanouchi` directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Admin Configuration
ADMIN_PASSWORD=your-secure-admin-password

# Owner Access (under-construction page - "Enter site" password)
PREVIEW_PASSWORD=your-preview-password

# Resend Email Configuration
RESEND_API_KEY=re_your-resend-api-key
ORDER_NOTIFICATION_EMAIL=admin@tsuyanouchi.com
RESEND_FROM_EMAIL=Tsuyanouchi <orders@tsuyanouchi.com>

# Gemini AI Configuration (for product descriptions)
GEMINI_API_KEY=your-gemini-api-key
```

Refer to `SETUP.md` for detailed instructions on obtaining these credentials.
