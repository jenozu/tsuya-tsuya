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
  description: 'TsuyaNoUchi — House of Lustre. An evolving collection of considered art prints for the everyday.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body data-tsuya-preview={process.env.VERCEL_ENV === "preview" ? "true" : "false"} className={headerFont.variable}>
        <CartProvider>
          <FavoritesProvider>
            {process.env.VERCEL_ENV === 'preview' && (
              <div className="fixed z-[90] bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 bg-[#2D2A26] text-[#F9F8F4] shadow-xl px-5 py-3 max-w-md text-[11px] leading-relaxed">
                <strong className="block text-xs mb-1 uppercase tracking-[.2em]">Design preview only</strong>
                Illustrative artwork and sample prices. No orders, payments, emails or database operations are enabled.
              </div>
            )}
            {children}
          </FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  );
}
