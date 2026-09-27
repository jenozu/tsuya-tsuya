import type { ReactNode } from 'react'
import { privatePageMetadata } from '@/lib/private-page-metadata'

export const metadata = privatePageMetadata

export default function PrivateRouteLayout({ children }: { children: ReactNode }) {
  return children
}
