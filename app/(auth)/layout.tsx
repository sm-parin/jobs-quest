import { BriefcaseIcon } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-muted px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-brand-500">
          <BriefcaseIcon className="h-7 w-7" aria-hidden="true" />
          <span className="text-2xl font-bold tracking-tight text-text-primary">
            Jobs Quest
          </span>
        </div>
        <p className="text-sm text-text-muted">Your personal job application tracker</p>
      </div>

      <div className="w-full max-w-md rounded-lg border border-border-app bg-surface p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
