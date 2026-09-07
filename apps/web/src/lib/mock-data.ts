export type HealthStatus = 'green' | 'amber' | 'red';
export type ProjectStatus = 'Active' | 'Planning' | 'At risk' | 'Completed';
export type TaskStatus = 'Complete' | 'In progress' | 'Blocked' | 'Not started';

export interface DemoProject {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;
  health: HealthStatus;
  manager: string;
  sponsor: string;
  department: string;
  startDate: string;
  plannedEndDate: string;
  completion: number;
  budget: number;
  actualCost: number;
  forecastCost: number;
  openRisks: number;
  overdueTasks: number;
}

export interface ScheduleItem {
  id: string;
  wbs: string;
  name: string;
  owner: string;
  startDate: string;
  finishDate: string;
  progress: number;
  status: TaskStatus;
  predecessor?: string;
}

export interface Milestone {
  id: string;
  name: string;
  baselineDate: string;
  forecastDate: string;
  actualDate?: string;
  owner: string;
  health: HealthStatus;
  status: 'On track' | 'At risk' | 'Complete';
}

export interface Baseline {
  id: string;
  name: string;
  approvedOn: string;
  approvedBy: string;
  scheduleVarianceDays: number;
  costVariance: number;
  scopeItems: number;
  status: 'Current' | 'Superseded';
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  subject: string;
  occurredAt: string;
  detail: string;
  type: 'schedule' | 'financial' | 'risk' | 'approval' | 'project';
}

export const demoOrganization = {
  name: 'Atlas Project Office',
  shortName: 'Atlas PO',
  slug: 'atlas-project-office',
};

export const demoProjects: readonly DemoProject[] = [
  {
    id: 'digital-service-modernisation',
    code: 'DSM-2026',
    name: 'Digital Service Modernisation',
    description: 'Replace fragmented case-management workflows with a secure, unified service platform.',
    status: 'Active',
    health: 'amber',
    manager: 'Mekdes Tadesse',
    sponsor: 'Samuel Desta',
    department: 'Digital Transformation',
    startDate: '2026-01-12',
    plannedEndDate: '2026-12-18',
    completion: 42,
    budget: 2500000,
    actualCost: 1018000,
    forecastCost: 2625000,
    openRisks: 4,
    overdueTasks: 3,
  },
  {
    id: 'regional-health-data-exchange',
    code: 'RHDX-2026',
    name: 'Regional Health Data Exchange',
    description: 'Establish interoperable health reporting between regional facilities and central services.',
    status: 'Active',
    health: 'green',
    manager: 'Hana Worku',
    sponsor: 'Dr. Abel Girma',
    department: 'Health Systems',
    startDate: '2026-02-02',
    plannedEndDate: '2026-10-30',
    completion: 56,
    budget: 1800000,
    actualCost: 932000,
    forecastCost: 1765000,
    openRisks: 2,
    overdueTasks: 0,
  },
  {
    id: 'national-skills-programme',
    code: 'NSP-2026',
    name: 'National Skills Programme',
    description: 'Coordinate curriculum design, instructor readiness, and phased regional delivery.',
    status: 'At risk',
    health: 'red',
    manager: 'Yonas Bekele',
    sponsor: 'Liya Mulugeta',
    department: 'Program Delivery',
    startDate: '2026-01-05',
    plannedEndDate: '2026-09-25',
    completion: 37,
    budget: 3200000,
    actualCost: 1409000,
    forecastCost: 3560000,
    openRisks: 7,
    overdueTasks: 8,
  },
  {
    id: 'procurement-assurance-upgrade',
    code: 'PAU-2026',
    name: 'Procurement Assurance Upgrade',
    description: 'Improve purchase approval controls, supplier evidence, and compliance reporting.',
    status: 'Planning',
    health: 'green',
    manager: 'Saron Fikru',
    sponsor: 'Fikadu Assefa',
    department: 'Corporate Services',
    startDate: '2026-09-14',
    plannedEndDate: '2027-04-30',
    completion: 12,
    budget: 950000,
    actualCost: 74000,
    forecastCost: 935000,
    openRisks: 1,
    overdueTasks: 0,
  },
];

export const demoSchedule: readonly ScheduleItem[] = [
  { id: 'sch-1', wbs: '1.0', name: 'Initiation and governance', owner: 'Mekdes Tadesse', startDate: '2026-01-12', finishDate: '2026-02-06', progress: 100, status: 'Complete' },
  { id: 'sch-2', wbs: '2.0', name: 'Service design', owner: 'Selam Ayele', startDate: '2026-02-09', finishDate: '2026-04-30', progress: 82, status: 'In progress', predecessor: '1.0' },
  { id: 'sch-3', wbs: '2.1', name: 'User research synthesis', owner: 'Mesfin Kebede', startDate: '2026-02-09', finishDate: '2026-03-20', progress: 100, status: 'Complete', predecessor: '1.0' },
  { id: 'sch-4', wbs: '2.2', name: 'Target operating model', owner: 'Selam Ayele', startDate: '2026-03-23', finishDate: '2026-04-30', progress: 64, status: 'In progress', predecessor: '2.1' },
  { id: 'sch-5', wbs: '3.0', name: 'Platform delivery', owner: 'Dawit Nigatu', startDate: '2026-05-04', finishDate: '2026-09-25', progress: 18, status: 'In progress', predecessor: '2.0' },
  { id: 'sch-6', wbs: '3.1', name: 'Identity integration', owner: 'Dawit Nigatu', startDate: '2026-05-04', finishDate: '2026-06-19', progress: 8, status: 'Blocked', predecessor: '2.2' },
  { id: 'sch-7', wbs: '4.0', name: 'Pilot and transition', owner: 'Hana Worku', startDate: '2026-09-28', finishDate: '2026-12-18', progress: 0, status: 'Not started', predecessor: '3.0' },
];

export const demoMilestones: readonly Milestone[] = [
  { id: 'ms-1', name: 'Business case approved', baselineDate: '2026-02-06', forecastDate: '2026-02-05', actualDate: '2026-02-05', owner: 'Samuel Desta', health: 'green', status: 'Complete' },
  { id: 'ms-2', name: 'Target operating model signed off', baselineDate: '2026-04-30', forecastDate: '2026-05-13', owner: 'Selam Ayele', health: 'amber', status: 'At risk' },
  { id: 'ms-3', name: 'Identity integration complete', baselineDate: '2026-06-19', forecastDate: '2026-07-03', owner: 'Dawit Nigatu', health: 'red', status: 'At risk' },
  { id: 'ms-4', name: 'Pilot launch', baselineDate: '2026-09-25', forecastDate: '2026-09-25', owner: 'Hana Worku', health: 'green', status: 'On track' },
  { id: 'ms-5', name: 'Programme closure', baselineDate: '2026-12-18', forecastDate: '2026-12-18', owner: 'Mekdes Tadesse', health: 'green', status: 'On track' },
];

export const demoBaselines: readonly Baseline[] = [
  { id: 'bl-2', name: 'Baseline 2 — approved plan', approvedOn: '2026-02-06', approvedBy: 'Samuel Desta', scheduleVarianceDays: 13, costVariance: 125000, scopeItems: 47, status: 'Current' },
  { id: 'bl-1', name: 'Baseline 1 — initiation', approvedOn: '2026-01-16', approvedBy: 'Samuel Desta', scheduleVarianceDays: 26, costVariance: 185000, scopeItems: 41, status: 'Superseded' },
];

export const demoActivity: readonly ActivityItem[] = [
  { id: 'act-1', actor: 'Mekdes Tadesse', action: 'updated the forecast finish date for', subject: 'Target operating model', occurredAt: 'Today, 10:24', detail: 'Forecast moved from 30 Apr to 13 May after review feedback.', type: 'schedule' },
  { id: 'act-2', actor: 'Dawit Nigatu', action: 'reported a blocker on', subject: 'Identity integration', occurredAt: 'Yesterday, 16:45', detail: 'Awaiting a test-tenant certificate from the identity provider.', type: 'risk' },
  { id: 'act-3', actor: 'Aster Getachew', action: 'recorded an actual cost of', subject: 'ETB 72,000', occurredAt: '28 Aug, 09:10', detail: 'Professional services invoice INV-0628 was posted to the platform-delivery budget line.', type: 'financial' },
  { id: 'act-4', actor: 'Samuel Desta', action: 'approved', subject: 'Baseline 2 — approved plan', occurredAt: '06 Feb, 14:32', detail: 'Schedule, cost, and scope snapshot approved for project control.', type: 'approval' },
];

export function getDemoProject(projectId: string): DemoProject | undefined {
  return demoProjects.find((project) => project.id === projectId);
}
