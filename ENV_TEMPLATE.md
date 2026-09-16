# Tsuyanouchi environment variables

# Neon PostgreSQL
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require

# Cloudflare R2 object storage
# Preferred: bare Cloudflare account ID only (not the bucket name or public r2.dev URL).
# The app also tolerates the full S3 endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
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
NEXT_PUBLIC_UNDER_CONSTRUCTION=false

# Email
RESEND_API_KEY=re_...
ORDER_NOTIFICATION_EMAIL=admin@tsuyanouchi.com
RESEND_FROM_EMAIL=Tsuyanouchi <orders@tsuyanouchi.com>

# Gemini descriptions
GEMINI_API_KEY=...
