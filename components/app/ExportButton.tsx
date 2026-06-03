'use client';

import { useState } from 'react';
import { DownloadIcon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function ExportButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch('/api/export/csv');
      if (!res.ok) { toast.error('Export failed. Please try again.'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `job-tracker-export-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading} className="gap-1.5">
      {loading
        ? <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
        : <DownloadIcon className="h-4 w-4" aria-hidden="true" />}
      Export
    </Button>
  );
}
