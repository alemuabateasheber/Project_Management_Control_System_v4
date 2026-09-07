import { Bell, ChevronDown, Search } from 'lucide-react';
import Link from 'next/link';

interface AppTopbarProps {
  organizationSlug: string;
  organizationName: string;
}

export function AppTopbar({ organizationSlug, organizationName }: AppTopbarProps) {
  const projectsPath = `/organizations/${organizationSlug}/projects`;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="text-sm font-semibold text-slate-900 lg:hidden" href={projectsPath}>PMCS</Link>
        <nav aria-label="Mobile navigation" className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
          <Link className="rounded-md px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950" href={projectsPath}>Projects</Link>
          <span aria-hidden="true" className="text-slate-300">/</span>
          <span className="truncate font-semibold text-slate-900">{organizationName}</span>
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex" aria-label="Search will be available when connected to the API">
            <Search aria-hidden="true" className="h-4 w-4" />
            <span>Search is coming with API data</span>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500" title="Notifications will be available when connected to the API">
            <Bell aria-hidden="true" className="h-4 w-4" />
          </span>
          <span className="hidden items-center gap-1 text-sm font-semibold text-slate-700 sm:flex">
            MT <ChevronDown aria-hidden="true" className="h-4 w-4 text-slate-400" />
          </span>
        </div>
      </div>
    </header>
  );
}
