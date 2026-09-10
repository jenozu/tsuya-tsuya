# Tsuyanouchi — House of Lustre

A luxury e-commerce platform built with Next.js 15, featuring a curated collection of Japanese-inspired lifestyle goods.

![Tsuyanouchi](https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&q=80&w=1200&h=400)

## Features

### Customer Features
- 🛍️ **Product Catalog** - Browse beautifully curated products with detailed descriptions
- 🔍 **Search & Filter** - Find products by category and search terms
- ❤️ **Favorites** - Save products to favorites with localStorage persistence
- 🛒 **Shopping Cart** - Full-featured cart with quantity management
- 💳 **Secure Checkout** - Stripe-powered payment processing
- 📧 **Order Confirmation** - Automated email notifications via Resend
- 📦 **Multiple Shipping Options** - Domestic and international shipping rates

### Admin Features
- 🔐 **Password-Protected Admin** - Secure access with middleware protection
- 📊 **Executive Dashboard** - Real-time analytics and KPIs
- 📈 **Interactive Charts** - Sales, inventory, and valuation visualizations using Recharts
- ✏️ **Product Management** - Full CRUD operations with image upload
- 🤖 **AI Descriptions** - Generate product descriptions using Google Gemini AI
- 📥 **CSV Import** - Bulk product import functionality
- 🎨 **Size Variations** - Support for multiple sizes with different prices
- 📋 **Order Management** - View and manage customer orders
- 🚚 **Shipping Configuration** - Manage shipping rates per country

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Email**: Resend
- **AI**: Google Gemini API
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Deployment**: Vercel

## Design Philosophy

Tsuyanouchi embodies minimalist Japanese aesthetics with a focus on:
- Clean, serif typography
- Muted, luxury color palette (dark browns, beiges, and whites)
- Spacious layouts with intentional white space
- High-quality product imagery
- Smooth transitions and subtle animations

### Color Palette
- Primary Dark: `#2D2A26`
- Background Light: `#F9F8F4`
- Accent Beige: `#E5E0D8`
- Text Muted: `#786B59`
- Error Red: `#8C3F3F`
- Success Green: `#5C7C66`

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Accounts for: Supabase, Stripe, Resend, Google AI Studio

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd gemini/tsuyanouchi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - See `ENV_TEMPLATE.md` for all required variables
   - Follow `SETUP.md` for detailed configuration instructions

4. **Run database migrations**
   - Execute the SQL in `SUPABASE_SCHEMA.sql` in your Supabase SQL Editor

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Visit [http://localhost:3000](http://localhost:3000)
   - Admin portal: [http://localhost:3000/admin](http://localhost:3000/admin)

## Project Structure

```
gemini/tsuyanouchi/
├── app/                        # Next.js App Router
│   ├── page.tsx               # Homepage
│   ├── shop/                  # Shop pages
│   │   ├── page.tsx          # Product listing
│   │   └── [slug]/page.tsx   # Product detail
│   ├── cart/                  # Shopping cart
│   ├── checkout/              # Checkout flow
│   ├── favourites/            # Favorites page
│   ├── thank-you/             # Order confirmation
│   ├── admin/                 # Admin dashboard
│   │   ├── login/            # Admin authentication
│   │   └── page.tsx          # Dashboard with analytics
│   └── api/                   # API routes
│       ├── products/          # Product CRUD
│       ├── orders/            # Order management
│       ├── payments/          # Stripe integration
│       ├── shipping/          # Shipping rates
│       ├── webhooks/          # Stripe webhooks
│       └── admin/             # Admin auth
├── components/                # React components
│   ├── navbar.tsx            # Navigation bar
│   ├── footer.tsx            # Footer
│   ├── cart-drawer.tsx       # Sliding cart drawer
│   ├── product-card.tsx      # Product card
│   └── ui/                   # UI components
├── lib/                       # Utilities
│   ├── supabase-client.ts    # Supabase setup
│   ├── supabase-helpers.ts   # Database operations
│   ├── stripe.ts             # Stripe utilities
│   ├── email.ts              # Email via Resend
│   ├── cart-context.tsx      # Cart state management
│   ├── favorites-context.tsx # Favorites management
│   └── utils.ts              # Helper functions
├── services/                  # External services
│   └── gemini.ts             # AI description generation
├── middleware.ts              # Route protection
└── SETUP.md                   # Detailed setup guide
```

## Key Routes

### Public Routes
- `/` - Homepage with hero and featured products
- `/shop` - Full product catalog with search and filters
- `/shop/[slug]` - Product detail page
- `/cart` - Shopping cart
- `/checkout` - Secure checkout flow
- `/favourites` - Saved favorites
- `/thank-you` - Order confirmation
- `/account` - Account page (coming soon)

### Admin Routes (Protected)
- `/admin/login` - Admin authentication
- `/admin` - Dashboard with analytics
  - Products tab - Manage inventory
  - Orders tab - View and manage orders
  - Shipping tab - Configure shipping rates
  - Settings tab - System settings

### API Routes
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `GET /api/products/[id]` - Get product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product
- `POST /api/orders` - Create order
- `GET /api/shipping/rates` - Get shipping rates
- `POST /api/payments/create-intent` - Create Stripe payment intent
- `POST /api/webhooks/stripe` - Handle Stripe events
- `POST /api/admin/auth` - Admin login
- `DELETE /api/admin/auth` - Admin logout

## Environment Variables

All environment variables are documented in `ENV_TEMPLATE.md`. Key categories:
- Supabase credentials
- Stripe API keys
- Admin password
- Resend API key
- Gemini AI key

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect repository to Vercel
3. Set root directory to: `gemini/tsuyanouchi`
4. Add all environment variables
5. Deploy!

See `SETUP.md` for detailed deployment instructions.

## Testing

### Test Cards (Stripe)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

Use any future expiry date and any 3-digit CVC.

### Admin Access
Default admin password is set via `ADMIN_PASSWORD` environment variable.

## Development

### Scripts
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
```

### Code Style
- Use TypeScript for type safety
- Follow existing component patterns
- Maintain the luxury design aesthetic
- Keep UI components reusable

## Features Roadmap

- [ ] User accounts and authentication
- [ ] Order history for customers
- [ ] Product reviews and ratings
- [ ] Wishlist sharing
- [ ] Gift cards
- [ ] Multi-currency support
- [ ] Advanced inventory management
- [ ] Email marketing integration
- [ ] Product recommendations
- [ ] Live chat support

## License

All rights reserved © 2026 Tsuyanouchi

## Support

For setup assistance or issues:
1. Check `SETUP.md` for detailed instructions
2. Review `SUPABASE_SCHEMA.sql` for database setup
3. Consult service documentation:
   - [Next.js Docs](https://nextjs.org/docs)
   - [Supabase Docs](https://supabase.com/docs)
   - [Stripe Docs](https://stripe.com/docs)
   - [Resend Docs](https://resend.com/docs)

---

Built with care and attention to detail, embodying the Japanese principle of *mono no aware* — the beauty of impermanence and mindful craftsmanship.
