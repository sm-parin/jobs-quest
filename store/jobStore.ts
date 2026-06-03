import { create } from 'zustand';
import type { Job, Status } from '@/lib/types';

interface JobStore {
  jobs: Job[];
  statuses: Status[];
  setJobs: (jobs: Job[]) => void;
  setStatuses: (statuses: Status[]) => void;
  updateJobOptimistic: (id: string, patch: Partial<Job>) => void;
}

export const useJobStore = create<JobStore>((set) => ({
  jobs: [],
  statuses: [],

  setJobs: (jobs) => set({ jobs }),

  setStatuses: (statuses) => set({ statuses }),

  /** Apply a local patch immediately; revert by calling setJobs with server data on error. */
  updateJobOptimistic: (id, patch) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    })),
}));
