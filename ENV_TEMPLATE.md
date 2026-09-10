# Tsuyanouchi environment variables

# Neon PostgreSQL
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require

# Cloudflare R2 object storage
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=tsuya-tsuya-images
# Public custom domain or r2.dev URL, no trailing slash
R2_PUBLIC_URL=https://images.example.com

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin
ADMIN_PASSWORD=choose-a-strong-password
ADMIN_SESSION_SECRET=generate-a-long-random-secret

# Owner preview
PREVIEW_PASSWORD=choose-a-preview-password

# Email
RESEND_API_KEY=re_...
ORDER_NOTIFICATION_EMAIL=admin@tsuyanouchi.com
RESEND_FROM_EMAIL=Tsuyanouchi <orders@tsuyanouchi.com>

# Gemini descriptions
GEMINI_API_KEY=...

# Temporary migration-only source credentials. Remove after migration.
LEGACY_SUPABASE_URL=https://your-old-project.supabase.co
LEGACY_SUPABASE_SERVICE_ROLE_KEY=your-old-service-role-key
