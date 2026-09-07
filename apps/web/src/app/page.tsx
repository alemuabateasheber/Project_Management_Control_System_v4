import { redirect } from 'next/navigation';
import { demoOrganization } from '@/lib/mock-data';

export default function HomePage() {
  redirect(`/organizations/${demoOrganization.slug}/projects`);
}
