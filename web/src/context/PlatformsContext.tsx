import { createContext, useContext, useState, type ReactNode } from 'react';

export type PlatformStatus = 'active' | 'inactive';

export interface Platform {
  id: string;
  icon: string;
  iconBg: string;
  name: string;
  key: string;
  status: PlatformStatus;
  createdAt: string;
  campaignCount: number;
}

interface PlatformsContextValue {
  platforms: Platform[];
  addPlatform: (data: Omit<Platform, 'id' | 'createdAt' | 'campaignCount'>) => void;
  updatePlatform: (id: string, data: Omit<Platform, 'id' | 'createdAt' | 'campaignCount'>) => void;
  toggleStatus: (id: string) => void;
  deletePlatform: (id: string) => void;
  getById: (id: string) => Platform | undefined;
}

const PlatformsContext = createContext<PlatformsContextValue | null>(null);

const SEED: Platform[] = [
  { id: 'plt1', icon: '📸', iconBg: '#fce7f3', name: 'Instagram', key: 'instagram', status: 'active', createdAt: '2024-01-10', campaignCount: 54 },
  { id: 'plt2', icon: '🎵', iconBg: '#f3e8ff', name: 'TikTok', key: 'tiktok', status: 'active', createdAt: '2024-01-11', campaignCount: 41 },
  { id: 'plt3', icon: '▶️', iconBg: '#fee2e2', name: 'YouTube', key: 'youtube', status: 'active', createdAt: '2024-01-12', campaignCount: 29 },
  { id: 'plt4', icon: '💼', iconBg: '#dbeafe', name: 'LinkedIn', key: 'linkedin', status: 'active', createdAt: '2024-01-15', campaignCount: 14 },
  { id: 'plt5', icon: '🐦', iconBg: '#e0f2fe', name: 'Twitter / X', key: 'twitter-x', status: 'active', createdAt: '2024-01-18', campaignCount: 22 },
  { id: 'plt6', icon: '📌', iconBg: '#fef3c7', name: 'Pinterest', key: 'pinterest', status: 'active', createdAt: '2024-02-01', campaignCount: 9 },
  { id: 'plt7', icon: '👻', iconBg: '#fef9c3', name: 'Snapchat', key: 'snapchat', status: 'inactive', createdAt: '2024-02-05', campaignCount: 3 },
];

function uid() {
  return `plt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function PlatformsProvider({ children }: { children: ReactNode }) {
  const [platforms, setPlatforms] = useState<Platform[]>(SEED);

  function addPlatform(data: Omit<Platform, 'id' | 'createdAt' | 'campaignCount'>) {
    setPlatforms((prev) => [
      { ...data, id: uid(), createdAt: new Date().toISOString().slice(0, 10), campaignCount: 0 },
      ...prev,
    ]);
  }

  function updatePlatform(id: string, data: Omit<Platform, 'id' | 'createdAt' | 'campaignCount'>) {
    setPlatforms((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }

  function toggleStatus(id: string) {
    setPlatforms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p))
    );
  }

  function deletePlatform(id: string) {
    setPlatforms((prev) => prev.filter((p) => p.id !== id));
  }

  function getById(id: string) {
    return platforms.find((p) => p.id === id);
  }

  return (
    <PlatformsContext.Provider value={{ platforms, addPlatform, updatePlatform, toggleStatus, deletePlatform, getById }}>
      {children}
    </PlatformsContext.Provider>
  );
}

export function usePlatforms() {
  const ctx = useContext(PlatformsContext);
  if (!ctx) throw new Error('usePlatforms must be used within PlatformsProvider');
  return ctx;
}
