import { create } from 'zustand';
import type { Platform, PlatformStatusOption } from '@/lib/types';
import type { PlatformValues } from '@/lib/schemas';

interface PlatformStore {
  platforms: Platform[];
  platformStatusOptions: PlatformStatusOption[];
  isLoading: boolean;
  setPlatforms: (platforms: Platform[]) => void;
  fetchPlatforms: () => Promise<void>;
  fetchStatusOptions: () => Promise<void>;
  addPlatform: (values: PlatformValues) => Promise<Platform | null>;
  updatePlatform: (id: string, values: PlatformValues) => Promise<Platform | null>;
  deletePlatform: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export const usePlatformStore = create<PlatformStore>((set) => ({
  platforms: [],
  platformStatusOptions: [],
  isLoading: false,

  setPlatforms: (platforms) => set({ platforms }),

  async fetchPlatforms() {
    set({ isLoading: true });
    const res = await fetch('/api/platforms');
    const body = await res.json().catch(() => ({}));
    set({ platforms: body.data ?? [], isLoading: false });
  },

  async fetchStatusOptions() {
    const res = await fetch('/api/platform-status-options');
    const body = await res.json().catch(() => ({}));
    set({ platformStatusOptions: body.data ?? [] });
  },

  async addPlatform(values) {
    const res = await fetch('/api/platforms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    const platform: Platform = body.data;
    set((s) => ({ platforms: [...s.platforms, platform] }));
    return platform;
  },

  async updatePlatform(id, values) {
    const res = await fetch(`/api/platforms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    const platform: Platform = body.data;
    set((s) => ({ platforms: s.platforms.map((p) => (p.id === id ? platform : p)) }));
    return platform;
  },

  async deletePlatform(id) {
    const res = await fetch(`/api/platforms/${id}`, { method: 'DELETE' });
    if (res.status === 204) {
      set((s) => ({ platforms: s.platforms.filter((p) => p.id !== id) }));
      return { ok: true };
    }
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error ?? 'Delete failed' };
  },
}));
