import type { HealthStatus, ProjectStatus, TaskStatus } from '@/lib/mock-data';

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'slate';

const toneClasses: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-700/20',
  amber: 'bg-amber-50 text-amber-900 ring-amber-700/20',
  red: 'bg-rose-50 text-rose-800 ring-rose-700/20',
  blue: 'bg-blue-50 text-blue-800 ring-blue-700/20',
  slate: 'bg-slate-100 text-slate-700 ring-slate-600/20',
};

const dotClasses: Record<Tone, string> = {
  green: 'bg-emerald-600',
  amber: 'bg-amber-500',
  red: 'bg-rose-600',
  blue: 'bg-blue-600',
  slate: 'bg-slate-500',
};

function Badge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneClasses[tone]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`} />
      {label}
    </span>
  );
}

export function HealthBadge({ health }: { health: HealthStatus }) {
  const labels: Record<HealthStatus, string> = {
    green: 'On track',
    amber: 'Needs attention',
    red: 'At risk',
  };

  return <Badge label={labels[health]} tone={health} />;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const tones: Record<ProjectStatus, Tone> = {
    Active: 'blue',
    Planning: 'slate',
    'At risk': 'red',
    Completed: 'green',
  };

  return <Badge label={status} tone={tones[status]} />;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const tones: Record<TaskStatus, Tone> = {
    Complete: 'green',
    'In progress': 'blue',
    Blocked: 'red',
    'Not started': 'slate',
  };

  return <Badge label={status} tone={tones[status]} />;
}

export function NeutralBadge({ children }: { children: React.ReactNode }) {
  return <Badge label={String(children)} tone="slate" />;
}
