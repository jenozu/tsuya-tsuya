import { WaitlistForm } from './waitlist-form';
import { OwnerAccessForm } from './owner-access-form';

export const metadata = {
  title: 'Coming Soon | Tsuyanouchi',
  description: 'Tsuyanouchi is under construction. Join the waitlist to be notified when we launch.',
};

export default function UnderConstructionPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F8F4] px-4">
      <div className="max-w-lg w-full text-center space-y-10">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif text-[#2D2A26] font-medium leading-tight">
            TsuyaNoUchi
          </h1>
          <p className="uppercase tracking-[0.3em] text-xs font-medium text-[#786B59]">
            ukiye-o inspired anime art prints
          </p>
          <p className="text-[#4A4036] leading-relaxed">
            We&apos;re putting the finishing touches on our collection. Leave your email and
            we&apos;ll notify you as soon as we&apos;re ready.
          </p>
        </div>

        <WaitlistForm />

        <p className="text-sm text-[#786B59]/80">
          Thank you for your patience.
        </p>

        <OwnerAccessForm />
      </div>
    </div>
  );
}
