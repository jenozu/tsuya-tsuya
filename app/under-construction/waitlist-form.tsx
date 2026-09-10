'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function WaitlistForm() {
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
      setMessage("You're on the list. We'll be in touch soon.");
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={status === 'loading'}
          required
          className={cn(
            'flex-1 min-w-0 px-4 py-3 rounded-none border border-[#E5E0D8] bg-[#F9F8F4]',
            'text-[#2D2A26] placeholder:text-[#786B59]/60',
            'focus:outline-none focus:ring-2 focus:ring-[#2D2A26]/20 focus:border-[#2D2A26]',
            'disabled:opacity-60 disabled:cursor-not-allowed'
          )}
          aria-label="Email address"
        />
        <Button
          type="submit"
          disabled={status === 'loading'}
          className="sm:flex-shrink-0 px-8"
        >
          {status === 'loading' ? 'Joining…' : 'Notify me'}
        </Button>
      </div>
      {message && (
        <p
          className={cn(
            'text-sm',
            status === 'success' ? 'text-[#2D2A26]' : 'text-[#8C3F3F]'
          )}
        >
          {message}
        </p>
      )}
    </form>
  );
}
