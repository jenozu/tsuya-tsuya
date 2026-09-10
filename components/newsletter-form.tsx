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
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
          disabled={status === 'loading'}
          className="flex-1 bg-[#F9F8F4]/10 border border-[#F9F8F4]/20 px-4 py-3 text-[#F9F8F4] placeholder-[#888] focus:outline-none focus:border-[#F9F8F4] focus:ring-1 focus:ring-[#F9F8F4] disabled:opacity-60"
        />
        <Button
          type="submit"
          disabled={status === 'loading'}
          className="bg-[#F9F8F4] text-[#2D2A26] hover:bg-[#E5E0D8]"
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
