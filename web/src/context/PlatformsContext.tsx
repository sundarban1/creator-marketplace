import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api';

export type PlatformStatus = 'active' | 'inactive';

export interface Platform {
  id: string;
  icon: string;
  iconBg: string;
  color: string;
  name: string;
  key: string;
  status: PlatformStatus;
  createdAt: string;
  campaignCount: number;
}

type PlatformInput = Omit<Platform, 'id' | 'createdAt' | 'campaignCount'>;

interface PlatformsContextValue {
  platforms: Platform[];
  loading: boolean;
  addPlatform: (data: PlatformInput) => Promise<void>;
  updatePlatform: (id: string, data: PlatformInput) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  deletePlatform: (id: string) => Promise<void>;
  getById: (id: string) => Platform | undefined;
}

const PlatformsContext = createContext<PlatformsContextValue | null>(null);

function toStatusApi(status: PlatformStatus): string {
  return status.toUpperCase();
}
function fromStatusApi(status: string): PlatformStatus {
  return status.toLowerCase() as PlatformStatus;
}

export function PlatformsProvider({ children }: { children: ReactNode }) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const res = await api.admin.platforms();
    setPlatforms(res.data.map((p) => ({
      id: p.id,
      icon: p.icon,
      iconBg: p.iconBg,
      color: p.color,
      name: p.name,
      key: p.key,
      status: fromStatusApi(p.status),
      createdAt: p.createdAt.slice(0, 10),
      campaignCount: p.campaignCount ?? 0,
    })));
  }, []);

  useEffect(() => {
    setLoading(true);
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  async function addPlatform(data: PlatformInput) {
    await api.admin.createPlatform({
      icon: data.icon, iconBg: data.iconBg, color: data.color, name: data.name, key: data.key,
      status: toStatusApi(data.status),
    });
    await refetch();
  }

  async function updatePlatform(id: string, data: PlatformInput) {
    await api.admin.updatePlatform(id, {
      icon: data.icon, iconBg: data.iconBg, color: data.color, name: data.name, key: data.key,
      status: toStatusApi(data.status),
    });
    await refetch();
  }

  async function toggleStatus(id: string) {
    const current = platforms.find((p) => p.id === id);
    if (!current) return;
    await api.admin.togglePlatformStatus(id, toStatusApi(current.status === 'active' ? 'inactive' : 'active'));
    await refetch();
  }

  async function deletePlatform(id: string) {
    await api.admin.deletePlatform(id);
    await refetch();
  }

  function getById(id: string) {
    return platforms.find((p) => p.id === id);
  }

  return (
    <PlatformsContext.Provider value={{ platforms, loading, addPlatform, updatePlatform, toggleStatus, deletePlatform, getById }}>
      {children}
    </PlatformsContext.Provider>
  );
}

export function usePlatforms() {
  const ctx = useContext(PlatformsContext);
  if (!ctx) throw new Error('usePlatforms must be used within PlatformsProvider');
  return ctx;
}
