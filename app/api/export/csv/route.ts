import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Wrap a single CSV field: escape quotes and wrap in quotes when necessary. */
function csvField(value: string | null | undefined): string {
  const str = value == null ? '' : String(value);
  // Must quote if contains comma, newline, double-quote, or carriage return
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const HEADERS = [
  'Company', 'Role', 'Location', 'Status', 'Priority', 'Platform',
  'Source (manual)', 'Salary', 'Stage Date', 'Stage Date Label', 'Job URL',
  'Is Archived', 'Date Created', 'Last Updated',
  'Contact 1 Name', 'Contact 1 Designation', 'Contact 1 Email', 'Contact 1 Phone',
  'Contact 2 Name', 'Contact 2 Designation', 'Contact 2 Email', 'Contact 2 Phone',
  'Contact 3 Name (max shown)', 'Contact 3 Designation', 'Contact 3 Email', 'Contact 3 Phone',
  'Notes', 'Job Description',
];

/** GET /api/export/csv — download all jobs as CSV */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch all jobs (active + archived) with relations
  type JobRow = {
    company: string; role: string; location: string | null;
    status: { label: string } | null; priority: string;
    platform: { name: string } | null; source: string | null;
    salary: string | null; stage_date: string | null; stage_date_label: string | null;
    url: string | null; is_archived: boolean; created_at: string; updated_at: string;
    notes: string | null; job_description: string | null;
    contacts: Array<{ name: string; designation: string | null; email: string | null; phone: string | null }>;
  };

  const { data: rawJobs, error } = await supabase
    .from('jobs')
    .select(
      'company, role, location, status:statuses(label), priority, platform:platforms(name), ' +
      'source, salary, stage_date, stage_date_label, url, is_archived, created_at, updated_at, ' +
      'notes, job_description, contacts(name, designation, email, phone)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const jobs = (rawJobs ?? []) as unknown as JobRow[];
  const rows: string[] = [HEADERS.map(csvField).join(',')];

  for (const job of jobs) {
    const contacts = job.contacts ?? [];
    const c1 = contacts[0];
    const c2 = contacts[1];
    const c3 = contacts[2];

    const row = [
      job.company,
      job.role,
      job.location,
      job.status?.label ?? null,
      job.priority,
      job.platform?.name ?? null,
      job.source,
      job.salary,
      job.stage_date,
      job.stage_date_label,
      job.url,
      job.is_archived ? 'Yes' : 'No',
      job.created_at,
      job.updated_at,
      c1?.name ?? null,   c1?.designation ?? null, c1?.email ?? null, c1?.phone ?? null,
      c2?.name ?? null,   c2?.designation ?? null, c2?.email ?? null, c2?.phone ?? null,
      c3?.name ?? null,   c3?.designation ?? null, c3?.email ?? null, c3?.phone ?? null,
      job.notes,
      job.job_description,
    ].map(csvField).join(',');

    rows.push(row);
  }

  const csv = rows.join('\r\n');
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="job-tracker-export-${today}.csv"`,
    },
  });
}
