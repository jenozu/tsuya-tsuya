'use client'

import { useState } from 'react'

type Status = { kind: 'idle' | 'sending' | 'sent' } | { kind: 'error'; message: string }

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const error = status.kind === 'error' ? status.message : null
  const field = 'w-full border border-[#D6CFC4] bg-white px-3 py-2 text-[#2D2A26] focus:outline-none focus:ring-2 focus:ring-[#2D2A26]'

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget))
    setStatus({ kind: 'sending' })
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
      })
      if (res.ok) return setStatus({ kind: 'sent' })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      setStatus({ kind: 'error', message: body.error ?? 'Something went wrong. Please try again.' })
    } catch {
      setStatus({ kind: 'error', message: 'Something went wrong. Please try again.' })
    }
  }

  if (status.kind === 'sent') {
    return <p role="status" className="text-[#2D2A26]">Thank you. Your message has been sent and we will reply by email.</p>
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" aria-describedby={error ? 'contact-error' : undefined}>
      {error && <p id="contact-error" role="alert" className="text-red-700">{error}</p>}
      <div>
        <label htmlFor="contact-name" className="block text-sm mb-1">Name</label>
        <input id="contact-name" name="name" required maxLength={100} autoComplete="name" aria-invalid={!!error} className={field} />
      </div>
      <div>
        <label htmlFor="contact-email" className="block text-sm mb-1">Email</label>
        <input id="contact-email" name="email" type="email" required maxLength={254} autoComplete="email" aria-invalid={!!error} className={field} />
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-sm mb-1">Message</label>
        <textarea id="contact-message" name="message" required minLength={10} maxLength={3000} rows={6} aria-invalid={!!error} className={field} />
      </div>
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px' }}>
        <label htmlFor="contact-website">Leave this field empty</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" disabled={status.kind === 'sending'} className="bg-[#2D2A26] text-white px-6 py-2 disabled:opacity-60">
        {status.kind === 'sending' ? 'Sending...' : 'Send message'}
      </button>
    </form>
  )
}
