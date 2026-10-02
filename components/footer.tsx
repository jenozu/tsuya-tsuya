'use client'
import Link from 'next/link'
import {
  publicBusinessLocation, verifiedSocialUrl, verifiedSupportAddress,
} from '@/lib/public-business-details'

const support = verifiedSupportAddress(process.env.NEXT_PUBLIC_SUPPORT_EMAIL)
const location = publicBusinessLocation(process.env.NEXT_PUBLIC_BUSINESS_LOCATION)
const socials = [
  { label: 'X', href: verifiedSocialUrl('x', process.env.NEXT_PUBLIC_SOCIAL_X_URL) },
  { label: 'Pinterest', href: verifiedSocialUrl('pinterest', process.env.NEXT_PUBLIC_SOCIAL_PINTEREST_URL) },
  { label: 'Tumblr', href: verifiedSocialUrl('tumblr', process.env.NEXT_PUBLIC_SOCIAL_TUMBLR_URL) },
].filter((link): link is { label: string; href: string } => Boolean(link.href))

export function Footer() {
  return (
    <footer className="bg-[#F2EFE9] border-t border-[#E5E0D8] py-12 text-[#4A4036]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-serif text-lg mb-4 text-[#2D2A26]">TsuyaNoUchi</h4>
            <p className="text-sm leading-relaxed opacity-80">
              Curating exceptional goods for a life well-lived.
              Integrating traditional craftsmanship with modern aesthetics.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-4 uppercase text-xs tracking-wider opacity-60">Navigate</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link href="/" className="hover:text-[#2D2A26]">Home</Link></li>
              <li><Link href="/shop" className="hover:text-[#2D2A26]">Shop</Link></li>
              <li><Link href="/favourites" className="hover:text-[#2D2A26]">Favourites</Link></li>
              <li><Link href="/shipping" className="hover:text-[#2D2A26]">Shipping</Link></li>
              <li><Link href="/faq" className="hover:text-[#2D2A26]">FAQ</Link></li>
            </ul>
          </div>
          {(support || location) && (
            <div>
              <h4 className="font-medium mb-4 uppercase text-xs tracking-wider opacity-60">Contact</h4>
              {location && <p className="text-sm mb-2 opacity-80">{location}</p>}
              {support && <a href={`mailto:${support}`} className="text-sm opacity-80 hover:text-[#2D2A26]">{support}</a>}
            </div>
          )}
          {socials.length > 0 && (
            <div>
              <h4 className="font-medium mb-4 uppercase text-xs tracking-wider opacity-60">Follow Us</h4>
              <ul className="flex flex-wrap gap-4 text-sm opacity-80">
                {socials.map(link => (
                  <li key={link.label}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer"
                       className="hover:text-[#2D2A26]">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-12 pt-8 border-t border-[#DED9D0] flex justify-between items-center text-xs opacity-60">
          <p>&copy; {new Date().getFullYear()} TsuyaNoUchi. All rights reserved.</p>
          <Link href="/admin" className="hover:text-[#2D2A26] transition-colors">Staff Access</Link>
        </div>
      </div>
    </footer>
  )
}
