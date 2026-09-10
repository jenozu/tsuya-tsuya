'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function OwnerAccessForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/preview-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error ?? 'Unable to verify password.')
        setIsLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-10 border-t border-[#E5E0D8] pt-8">
      <p className="text-xs uppercase tracking-[0.25em] text-[#786B59] mb-4">
        Owner access
      </p>
      <p className="text-sm text-[#4A4036] mb-4">
        Enter the access password to preview the site while it&apos;s under
        construction.
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
      >
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Access password"
          className="flex-1 px-3 py-2 border border-[#E5E0D8] bg-white text-sm focus:outline-none focus:border-[#2D2A26]"
        />
        <button
          type="submit"
          disabled={isLoading || !password}
          className="px-4 py-2 text-sm font-medium bg-[#2D2A26] text-[#F9F8F4] disabled:bg-[#B3ACA1] disabled:cursor-not-allowed"
        >
          {isLoading ? 'Checking…' : 'Enter site'}
        </button>
      </form>

      {error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  )
}
