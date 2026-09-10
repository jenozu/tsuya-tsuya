'use client';

import React from 'react';
import Link from 'next/link';

const APP_NAME = "Tsuyanouchi";

export function Footer() {
  return (
    <footer className="bg-[#F2EFE9] border-t border-[#E5E0D8] py-12 text-[#4A4036]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <h4 className="font-serif text-lg mb-4 text-[#2D2A26]">{APP_NAME}</h4>
            <p className="text-sm leading-relaxed opacity-80">
              Curating exceptional goods for a life well-lived. 
              Integrating traditional craftsmanship with modern aesthetics.
            </p>
          </div>
          
          <div className="col-span-1">
            <h4 className="font-medium mb-4 uppercase text-xs tracking-wider opacity-60">Navigate</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link href="/" className="hover:text-[#2D2A26]">Home</Link></li>
              <li><Link href="/shop" className="hover:text-[#2D2A26]">Shop</Link></li>
              <li><Link href="/favourites" className="hover:text-[#2D2A26]">Favourites</Link></li>
            </ul>
          </div>

          <div className="col-span-1">
            <h4 className="font-medium mb-4 uppercase text-xs tracking-wider opacity-60">Contact</h4>
            <p className="text-sm mb-2 opacity-80">Tokyo, Japan</p>
            <p className="text-sm opacity-80">concierge@tsuyanouchi.com</p>
          </div>

          <div className="col-span-1">
            <h4 className="font-medium mb-4 uppercase text-xs tracking-wider opacity-60">Follow Us</h4>
            <div className="flex space-x-4">
              {/* Twitter / X */}
              <a href="https://x.com/TsuyaNoUchi" target="_blank" rel="noopener noreferrer" className="text-[#4A4036] hover:text-[#2D2A26] transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* Pinterest */}
              <a href="https://www.pinterest.com/TsuyaNoUchi/" target="_blank" rel="noopener noreferrer" className="text-[#4A4036] hover:text-[#8C3F3F] transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.399.165-1.487-.695-2.419-2.873-2.419-4.624 0-3.772 2.75-7.229 7.924-7.229 4.163 0 7.398 2.967 7.398 6.931 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.62 0 12.017 0z" />
                </svg>
              </a>
              {/* Tumblr */}
              <a href="https://tsuyanouchi.tumblr.com/" target="_blank" rel="noopener noreferrer" className="text-[#4A4036] hover:text-[#2D2A26] transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H5.116V6.648c3.606-.374 5.103-2.696 5.373-5.385h3.018v5.386h4.838v3.101h-4.838v6.173c0 1.683.664 2.546 2.213 2.546.96 0 1.637-.29 1.956-.505l.847 2.923c-.767.577-2.016 1.113-3.96 1.113z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-[#DED9D0] flex justify-between items-center text-xs opacity-60">
          <p>&copy; {new Date().getFullYear()} Tsuyanouchi. All rights reserved.</p>
          <Link href="/admin" className="hover:text-[#2D2A26] transition-colors">Staff Access</Link>
        </div>
      </div>
    </footer>
  );
}
