import { FlaskConical } from 'lucide-react';

export function DemoNotice({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-950 ${className}`}>
      <FlaskConical aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
      <p>
        <span className="font-semibold">Demo workspace.</span> Display data is typed mock data until the PMCS API is connected.
      </p>
    </div>
  );
}
