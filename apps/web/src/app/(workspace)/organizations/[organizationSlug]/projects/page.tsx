import Link from 'next/link';
import { ArrowUpRight, BriefcaseBusiness, CircleAlert, WalletCards } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { DemoNotice } from '@/components/common/demo-notice';
import { HealthBadge, ProjectStatusBadge } from '@/components/common/status-badge';
import { MetricCard } from '@/components/common/metric-card';
import { PageHeading } from '@/components/common/page-heading';
import { demoOrganization, demoProjects } from '@/lib/mock-data';
import { formatCurrency, formatDate, formatPercentage } from '@/lib/format';

interface ProjectsPageProps {
  params: Promise<{ organizationSlug: string }>;
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { organizationSlug } = await params;
  const organizationName = organizationSlug === demoOrganization.slug ? demoOrganization.name : organizationSlug;
  const totalBudget = demoProjects.reduce((total, project) => total + project.budget, 0);
  const openRisks = demoProjects.reduce((total, project) => total + project.openRisks, 0);

  return (
    <AppShell organizationName={organizationName} organizationSlug={organizationSlug}>
      <PageHeading
        eyebrow="Project portfolio"
        title="Digital Service & High-Tech Incubation Project 2026"
        description="Track delivery health, schedule, cost, risks, and accountable ownership across the portfolio."
      />
      <DemoNotice className="mt-6" />
      <section aria-label="Portfolio metrics" className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard detail="Current portfolio" icon={<BriefcaseBusiness aria-hidden="true" className="h-5 w-5" />} label="Active projects" value={String(demoProjects.filter((project) => project.status === 'Active').length)} />
        <MetricCard detail="Approved portfolio budget" icon={<WalletCards aria-hidden="true" className="h-5 w-5" />} label="Planned investment" value={formatCurrency(totalBudget)} />
        <MetricCard detail="Requires active mitigation" icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />} label="Open risks" tone="warning" value={String(openRisks)} />
      </section>
      <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-950">Projects</h2>
        </div>
        <ul className="divide-y divide-slate-200">
          {demoProjects.map((project) => (
            <li className="p-5" key={project.id}>
              <Link className="group flex flex-col gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:flex-row sm:items-center sm:justify-between" href={`/organizations/${organizationSlug}/projects/${project.id}`}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950 group-hover:text-blue-800">{project.name}</p>
                    <ProjectStatusBadge status={project.status} />
                    <HealthBadge health={project.health} />
                  </div>
                  <p className="mt-2 max-w-3xl text-sm text-slate-600">{project.description}</p>
                  <p className="mt-3 text-xs font-medium text-slate-500">{project.code} · {project.manager} · Planned finish {formatDate(project.plannedEndDate)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-sm sm:text-right">
                  <span><span className="block text-xs text-slate-500">Progress</span><span className="font-semibold text-slate-900">{formatPercentage(project.completion)}</span></span>
                  <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-slate-400 group-hover:text-blue-700" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
