'use client';

import {
  BarChart3,
  BriefcaseBusiness,
  FolderKanban,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brand } from './brand';

interface AppSidebarProps {
  organizationSlug: string;
  organizationName: string;
}

export function AppSidebar({ organizationSlug, organizationName }: AppSidebarProps) {
  const pathname = usePathname();
  const projectPath = `/organizations/${organizationSlug}/projects`;
  const navigation = [
    { label: 'Portfolio', href: projectPath, icon: LayoutDashboard, exact: true },
    { label: 'Projects', href: projectPath, icon: FolderKanban, exact: false },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="border-b border-slate-200 px-6 py-5">
        <Brand href={projectPath} />
      </div>
      <div className="border-b border-slate-200 px-4 py-4">
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Organization</p>
        <p className="mt-1 truncate px-2 text-sm font-semibold text-slate-900" title={organizationName}>{organizationName}</p>
      </div>
      <nav aria-label="Primary navigation" className="flex-1 space-y-1 px-3 py-5">
        {navigation.map(({ label, href, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${active ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              href={href}
              key={label}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <Link className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" href={projectPath}>
          <Settings aria-hidden="true" className="h-4 w-4" />
          Organization settings
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">MT</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900">Mekdes Tadesse</span>
            <span className="block truncate text-xs text-slate-500">Project manager</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
