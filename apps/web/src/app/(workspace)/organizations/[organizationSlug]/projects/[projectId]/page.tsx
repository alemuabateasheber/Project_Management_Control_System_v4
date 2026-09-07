import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, CircleAlert, WalletCards } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { DemoNotice } from '@/components/common/demo-notice';
import { HealthBadge, ProjectStatusBadge } from '@/components/common/status-badge';
import { MetricCard } from '@/components/common/metric-card';
import { PageHeading } from '@/components/common/page-heading';
import { demoOrganization, getDemoProject } from '@/lib/mock-data';
import { formatCurrency, formatDate, formatPercentage } from '@/lib/format';

interface ProjectPageProps {
  params: Promise<{ organizationSlug: string; projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { organizationSlug, projectId } = await params;
  const project = getDemoProject(projectId);
  if (!project) {
    notFound();
  }
  const organizationName = organizationSlug === demoOrganization.slug ? demoOrganization.name : organizationSlug;
  const projectsPath = `/organizations/${organizationSlug}/projects`;

  return (
    <AppShell organizationName={organizationName} organizationSlug={organizationSlug}>
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900" href={projectsPath}><ArrowLeft aria-hidden="true" className="h-4 w-4" />All projects</Link>
      <div className="mt-5">
        <PageHeading
          eyebrow={project.code}
          title={project.name}
          description={project.description}
          actions={<><ProjectStatusBadge status={project.status} /><HealthBadge health={project.health} /></>}
        />
      </div>
      <DemoNotice className="mt-6" />
      <section aria-label="Project metrics" className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard detail={`Planned finish ${formatDate(project.plannedEndDate)}`} icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />} label="Delivery progress" value={formatPercentage(project.completion)} />
        <MetricCard detail={`Forecast ${formatCurrency(project.forecastCost)}`} icon={<WalletCards aria-hidden="true" className="h-5 w-5" />} label="Actual cost" value={formatCurrency(project.actualCost)} />
        <MetricCard detail={`${project.overdueTasks} overdue task${project.overdueTasks === 1 ? '' : 's'}`} icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />} label="Open risks" tone={project.openRisks > 3 ? 'warning' : 'default'} value={String(project.openRisks)} />
      </section>
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-bold text-slate-950">Accountability</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-slate-500">Project manager</dt><dd className="mt-1 font-semibold text-slate-900">{project.manager}</dd></div>
          <div><dt className="text-slate-500">Executive sponsor</dt><dd className="mt-1 font-semibold text-slate-900">{project.sponsor}</dd></div>
          <div><dt className="text-slate-500">Department</dt><dd className="mt-1 font-semibold text-slate-900">{project.department}</dd></div>
        </dl>
      </section>
    </AppShell>
  );
}
