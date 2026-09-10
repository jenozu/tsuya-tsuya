import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase-client';
import { Resend } from 'resend';

const bodySchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Tsuyanouchi <orders@tsuyanouchi.com>';
const ADMIN_EMAIL = process.env.ORDER_NOTIFICATION_EMAIL || 'admin@tsuyanouchi.com';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Invalid email';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { email } = parsed.data;

    const { error } = await supabase.from('waitlist').insert({ email });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This email is already on the list.' },
          { status: 409 }
        );
      }
      console.error('Waitlist insert error:', error);
      return NextResponse.json(
        { error: 'Could not add you to the waitlist. Please try again.' },
        { status: 500 }
      );
    }

    // Notify admin of new waitlist signup — fire and forget
    if (resend) {
      resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: 'New Waitlist Signup — Tsuyanouchi',
        html: `<p style="font-family: Georgia, serif; color: #2D2A26;">A new visitor has joined the waitlist:</p>
               <p style="font-family: Georgia, serif; font-size: 18px; color: #2D2A26;"><strong>${email}</strong></p>`,
      }).catch((err: unknown) => console.error('Waitlist notification email error:', err));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Waitlist API error:', e);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
