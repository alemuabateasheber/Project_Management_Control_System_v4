import type { ReactNode } from 'react';
import { AppSidebar } from './app-sidebar';
import { AppTopbar } from './app-topbar';

interface AppShellProps {
  organizationSlug: string;
  organizationName: string;
  children: ReactNode;
}

export function AppShell({ organizationSlug, organizationName, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <a className="skip-link" href="#workspace-content">Skip to main content</a>
      <AppSidebar organizationName={organizationName} organizationSlug={organizationSlug} />
      <div className="min-h-screen lg:pl-72">
        <AppTopbar organizationName={organizationName} organizationSlug={organizationSlug} />
        <main id="workspace-content" className="px-4 py-7 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
