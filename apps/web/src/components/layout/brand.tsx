import { Layers3 } from 'lucide-react';
import Link from 'next/link';

export function Brand({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-700 text-white shadow-sm transition group-hover:bg-blue-800">
        <Layers3 aria-hidden="true" className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-sm font-bold tracking-tight text-slate-950">PMCS</span>
        <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Control Centre</span>
      </span>
    </Link>
  );
}
