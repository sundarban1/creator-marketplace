import { createContext, useContext, useState, type ReactNode } from 'react';

export type CategoryStatus = 'active' | 'inactive';

export interface Category {
  id: string;
  icon: string;
  iconBg: string;
  name: string;
  key: string;
  status: CategoryStatus;
  createdAt: string;
  itemCount: number;
}

interface CategoriesContextValue {
  categories: Category[];
  addCategory: (data: Omit<Category, 'id' | 'createdAt' | 'itemCount'>) => void;
  updateCategory: (id: string, data: Omit<Category, 'id' | 'createdAt' | 'itemCount'>) => void;
  toggleStatus: (id: string) => void;
  deleteCategory: (id: string) => void;
  getById: (id: string) => Category | undefined;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

const SEED: Category[] = [
  { id: 'cat1', icon: '👗', iconBg: '#f3e8ff', name: 'Fashion', key: 'fashion', status: 'active', createdAt: '2024-01-10', itemCount: 38 },
  { id: 'cat2', icon: '💄', iconBg: '#fce7f3', name: 'Beauty', key: 'beauty', status: 'active', createdAt: '2024-01-12', itemCount: 24 },
  { id: 'cat3', icon: '📱', iconBg: '#dbeafe', name: 'Technology', key: 'technology', status: 'active', createdAt: '2024-01-15', itemCount: 19 },
  { id: 'cat4', icon: '🍔', iconBg: '#fef9c3', name: 'Food & Beverage', key: 'food-beverage', status: 'active', createdAt: '2024-01-18', itemCount: 31 },
  { id: 'cat5', icon: '✈️', iconBg: '#e0f2fe', name: 'Travel', key: 'travel', status: 'active', createdAt: '2024-01-22', itemCount: 17 },
  { id: 'cat6', icon: '💪', iconBg: '#dcfce7', name: 'Fitness', key: 'fitness', status: 'active', createdAt: '2024-02-01', itemCount: 22 },
  { id: 'cat7', icon: '🏠', iconBg: '#fef3c7', name: 'Home & Living', key: 'home-living', status: 'inactive', createdAt: '2024-02-05', itemCount: 11 },
  { id: 'cat8', icon: '🎮', iconBg: '#ede9fe', name: 'Gaming', key: 'gaming', status: 'active', createdAt: '2024-02-10', itemCount: 9 },
];

function uid() {
  return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(SEED);

  function addCategory(data: Omit<Category, 'id' | 'createdAt' | 'itemCount'>) {
    const newCat: Category = {
      ...data,
      id: uid(),
      createdAt: new Date().toISOString().slice(0, 10),
      itemCount: 0,
    };
    setCategories((prev) => [newCat, ...prev]);
  }

  function updateCategory(id: string, data: Omit<Category, 'id' | 'createdAt' | 'itemCount'>) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
  }

  function toggleStatus(id: string) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c
      )
    );
  }

  function deleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  function getById(id: string) {
    return categories.find((c) => c.id === id);
  }

  return (
    <CategoriesContext.Provider value={{ categories, addCategory, updateCategory, toggleStatus, deleteCategory, getById }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider');
  return ctx;
}
