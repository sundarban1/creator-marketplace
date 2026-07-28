import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api';

export type SuccessStoryStatus = 'active' | 'inactive';

export interface SuccessStory {
  id: string;
  name: string;
  role: string;
  quote: string;
  photoUrl: string | null;
  order: number;
  status: SuccessStoryStatus;
  createdAt: string;
}

type SuccessStoryInput = Omit<SuccessStory, 'id' | 'createdAt'>;

interface SuccessStoriesContextValue {
  stories: SuccessStory[];
  loading: boolean;
  addStory: (data: SuccessStoryInput) => Promise<void>;
  updateStory: (id: string, data: SuccessStoryInput) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  deleteStory: (id: string) => Promise<void>;
  getById: (id: string) => SuccessStory | undefined;
  uploadPhoto: (file: File) => Promise<string>;
}

const SuccessStoriesContext = createContext<SuccessStoriesContextValue | null>(null);

function toStatusApi(status: SuccessStoryStatus): string {
  return status.toUpperCase();
}
function fromStatusApi(status: string): SuccessStoryStatus {
  return status.toLowerCase() as SuccessStoryStatus;
}

export function SuccessStoriesProvider({ children }: { children: ReactNode }) {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const res = await api.admin.successStories();
    setStories(res.data.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      quote: s.quote,
      photoUrl: s.photoUrl,
      order: s.order,
      status: fromStatusApi(s.status),
      createdAt: s.createdAt.slice(0, 10),
    })));
  }, []);

  useEffect(() => {
    setLoading(true);
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  async function addStory(data: SuccessStoryInput) {
    await api.admin.createSuccessStory({
      name: data.name, role: data.role, quote: data.quote, photoUrl: data.photoUrl,
      order: data.order, status: toStatusApi(data.status),
    });
    await refetch();
  }

  async function updateStory(id: string, data: SuccessStoryInput) {
    await api.admin.updateSuccessStory(id, {
      name: data.name, role: data.role, quote: data.quote, photoUrl: data.photoUrl,
      order: data.order, status: toStatusApi(data.status),
    });
    await refetch();
  }

  async function toggleStatus(id: string) {
    const current = stories.find((s) => s.id === id);
    if (!current) return;
    await api.admin.toggleSuccessStoryStatus(id, toStatusApi(current.status === 'active' ? 'inactive' : 'active'));
    await refetch();
  }

  async function deleteStory(id: string) {
    await api.admin.deleteSuccessStory(id);
    await refetch();
  }

  function getById(id: string) {
    return stories.find((s) => s.id === id);
  }

  async function uploadPhoto(file: File) {
    const res = await api.admin.uploadSuccessStoryPhoto(file);
    return res.data.photoUrl;
  }

  return (
    <SuccessStoriesContext.Provider value={{ stories, loading, addStory, updateStory, toggleStatus, deleteStory, getById, uploadPhoto }}>
      {children}
    </SuccessStoriesContext.Provider>
  );
}

export function useSuccessStories() {
  const ctx = useContext(SuccessStoriesContext);
  if (!ctx) throw new Error('useSuccessStories must be used within SuccessStoriesProvider');
  return ctx;
}
