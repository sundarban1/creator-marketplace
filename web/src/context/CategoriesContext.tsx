import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api';

export type CategoryStatus = 'active' | 'inactive';
export type CategoryScope = 'creator' | 'business' | 'both';

export interface Category {
  id: string;
  icon: string;
  iconBg: string;
  color: string;
  name: string;
  key: string;
  scope: CategoryScope;
  status: CategoryStatus;
  createdAt: string;
  itemCount: number;
}

type CategoryInput = Omit<Category, 'id' | 'createdAt' | 'itemCount'>;

interface CategoriesContextValue {
  categories: Category[];
  loading: boolean;
  addCategory: (data: CategoryInput) => Promise<void>;
  updateCategory: (id: string, data: CategoryInput) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getById: (id: string) => Category | undefined;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

function toScopeApi(scope: CategoryScope): string {
  return scope.toUpperCase();
}
function fromScopeApi(scope: string): CategoryScope {
  return scope.toLowerCase() as CategoryScope;
}
function toStatusApi(status: CategoryStatus): string {
  return status.toUpperCase();
}
function fromStatusApi(status: string): CategoryStatus {
  return status.toLowerCase() as CategoryStatus;
}

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const res = await api.admin.categories();
    setCategories(res.data.map((c) => ({
      id: c.id,
      icon: c.icon,
      iconBg: c.iconBg,
      color: c.color,
      name: c.name,
      key: c.key,
      scope: fromScopeApi(c.scope),
      status: fromStatusApi(c.status),
      createdAt: c.createdAt.slice(0, 10),
      itemCount: c.itemCount ?? 0,
    })));
  }, []);

  useEffect(() => {
    setLoading(true);
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  async function addCategory(data: CategoryInput) {
    await api.admin.createCategory({
      icon: data.icon, iconBg: data.iconBg, color: data.color, name: data.name, key: data.key,
      scope: toScopeApi(data.scope), status: toStatusApi(data.status),
    });
    await refetch();
  }

  async function updateCategory(id: string, data: CategoryInput) {
    await api.admin.updateCategory(id, {
      icon: data.icon, iconBg: data.iconBg, color: data.color, name: data.name, key: data.key,
      scope: toScopeApi(data.scope), status: toStatusApi(data.status),
    });
    await refetch();
  }

  async function toggleStatus(id: string) {
    const current = categories.find((c) => c.id === id);
    if (!current) return;
    await api.admin.toggleCategoryStatus(id, toStatusApi(current.status === 'active' ? 'inactive' : 'active'));
    await refetch();
  }

  async function deleteCategory(id: string) {
    await api.admin.deleteCategory(id);
    await refetch();
  }

  function getById(id: string) {
    return categories.find((c) => c.id === id);
  }

  return (
    <CategoriesContext.Provider value={{ categories, loading, addCategory, updateCategory, toggleStatus, deleteCategory, getById }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider');
  return ctx;
}
