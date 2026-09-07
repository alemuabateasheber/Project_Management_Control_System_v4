import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon?: ReactNode;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

const detailTone = {
  default: 'text-slate-500',
  warning: 'text-amber-800',
  danger: 'text-rose-800',
  success: 'text-emerald-800',
};

export function MetricCard({ label, value, detail, icon, tone = 'default' }: MetricCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {icon ? <span className="text-slate-400">{icon}</span> : null}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className={`mt-2 text-xs font-medium ${detailTone[tone]}`}>{detail}</p>
    </section>
  );
}
