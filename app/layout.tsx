import type { Metadata } from 'next';
import { CANONICAL_ORIGIN, publicIndexingEnabled } from '@/lib/seo';
import { Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart-context';
import { FavoritesProvider } from '@/lib/favorites-context';

const headerFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-header',
});

const indexingAllowed = publicIndexingEnabled({
  deploymentEnvironment: process.env.VERCEL_ENV,
  underConstruction: process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION === 'true',
});

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  robots: { index: indexingAllowed, follow: indexingAllowed },
  openGraph: { siteName: 'TsuyaNoUchi', type: 'website', locale: 'en_US' },
  title: 'TsuyaNoUchi',
  description: 'A curated collection of luxury lifestyle goods for the discerning individual.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={headerFont.variable}>
        <CartProvider>
          <FavoritesProvider>
            {children}
          </FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  );
}
