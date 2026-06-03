import { redirect } from 'next/navigation';
import { PlusIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <section aria-labelledby="dashboard-heading">
      <div className="flex items-center justify-between">
        <div>
          <h1 id="dashboard-heading" className="text-2xl font-semibold text-text-primary">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-text-muted">{user.email}</p>
        </div>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          Add Job
        </Button>
      </div>

      <div className="mt-10 flex flex-col items-center justify-center rounded-lg border border-dashed border-border-app py-20 text-center">
        <p className="text-text-muted">Your jobs will appear here.</p>
      </div>
    </section>
  );
}
