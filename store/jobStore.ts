import { create } from 'zustand';
import type { Job, Status } from '@/lib/types';

interface JobStore {
  jobs: Job[];
  statuses: Status[];
  isLoading: boolean;
  hydrated: boolean;
  setJobs: (jobs: Job[]) => void;
  setStatuses: (statuses: Status[]) => void;
  updateJobOptimistic: (id: string, patch: Partial<Job>) => void;
  addJobOptimistic: (job: Job) => void;
  removeJobOptimistic: (id: string) => void;
  fetchJobs: () => Promise<void>;
  fetchStatuses: () => Promise<void>;
}

export const useJobStore = create<JobStore>((set) => ({
  jobs: [],
  statuses: [],
  isLoading: false,
  hydrated: false,

  setJobs: (jobs) => set({ jobs, hydrated: true }),
  setStatuses: (statuses) => set({ statuses }),

  updateJobOptimistic: (id, patch) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    })),

  addJobOptimistic: (job) =>
    set((state) => ({ jobs: [job, ...state.jobs] })),

  removeJobOptimistic: (id) =>
    set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),

  fetchJobs: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const { data } = await res.json();
        set({ jobs: data ?? [] });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  fetchStatuses: async () => {
    const res = await fetch('/api/statuses');
    if (res.ok) {
      const { data } = await res.json();
      set({ statuses: data ?? [] });
    }
  },
}));
