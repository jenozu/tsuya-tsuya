'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setStatus('success');
      setMessage("You're on the list.");
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-stretch">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
          disabled={status === 'loading'}
          className="flex-1 min-w-0 bg-transparent border-b border-[#D4CEC5]/60 px-1 py-4 text-[#F9F8F4] placeholder-[#D4CEC5]/60 focus:outline-none focus:border-white disabled:opacity-60"
        />
        <Button
          type="submit"
          disabled={status === 'loading'}
          className="bg-[#F9F8F4] text-[#2D2A26] hover:bg-[#E5E0D8] rounded-none min-h-12 px-6 tracking-[.14em] uppercase text-xs"
        >
          {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
        </Button>
      </div>
      {message && (
        <p className={`text-sm ${
          status === 'success'
            ? 'text-[#F9F8F4]/70'
            : 'text-[#F9F8F4]/70 bg-[#8C3F3F]/40 px-3 py-1'
        }`}>
          {message}
        </p>
      )}
    </form>
  );
}
