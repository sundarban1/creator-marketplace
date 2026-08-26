import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api';

export type PaymentMethodStatus = 'active' | 'inactive';

export interface PaymentMethod {
  id: string;
  key: string;
  name: string;
  iconUrl: string | null;
  color: string;
  order: number;
  status: PaymentMethodStatus;
  createdAt: string;
  usageCount: number;
}

type PaymentMethodInput = Omit<PaymentMethod, 'id' | 'createdAt' | 'usageCount'>;

interface PaymentMethodsContextValue {
  methods: PaymentMethod[];
  loading: boolean;
  addMethod: (data: PaymentMethodInput) => Promise<void>;
  updateMethod: (id: string, data: PaymentMethodInput) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  deleteMethod: (id: string) => Promise<void>;
  uploadIcon: (file: File) => Promise<string>;
  getById: (id: string) => PaymentMethod | undefined;
}

const PaymentMethodsContext = createContext<PaymentMethodsContextValue | null>(null);

function toStatusApi(status: PaymentMethodStatus): string {
  return status.toUpperCase();
}
function fromStatusApi(status: string): PaymentMethodStatus {
  return status.toLowerCase() as PaymentMethodStatus;
}

export function PaymentMethodsProvider({ children }: { children: ReactNode }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const res = await api.admin.paymentMethods();
    setMethods(res.data.map((m) => ({
      id: m.id,
      key: m.key,
      name: m.name,
      iconUrl: m.iconUrl,
      color: m.color,
      order: m.order,
      status: fromStatusApi(m.status),
      createdAt: m.createdAt.slice(0, 10),
      usageCount: m.usageCount ?? 0,
    })));
  }, []);

  useEffect(() => {
    setLoading(true);
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  async function addMethod(data: PaymentMethodInput) {
    await api.admin.createPaymentMethod({
      key: data.key, name: data.name, iconUrl: data.iconUrl, color: data.color, order: data.order,
      status: toStatusApi(data.status),
    });
    await refetch();
  }

  async function updateMethod(id: string, data: PaymentMethodInput) {
    await api.admin.updatePaymentMethod(id, {
      key: data.key, name: data.name, iconUrl: data.iconUrl, color: data.color, order: data.order,
      status: toStatusApi(data.status),
    });
    await refetch();
  }

  async function toggleStatus(id: string) {
    const current = methods.find((m) => m.id === id);
    if (!current) return;
    await api.admin.togglePaymentMethodStatus(id, toStatusApi(current.status === 'active' ? 'inactive' : 'active'));
    await refetch();
  }

  async function deleteMethod(id: string) {
    await api.admin.deletePaymentMethod(id);
    await refetch();
  }

  async function uploadIcon(file: File) {
    const res = await api.admin.uploadPaymentMethodIcon(file);
    return res.data.iconUrl;
  }

  function getById(id: string) {
    return methods.find((m) => m.id === id);
  }

  return (
    <PaymentMethodsContext.Provider value={{ methods, loading, addMethod, updateMethod, toggleStatus, deleteMethod, uploadIcon, getById }}>
      {children}
    </PaymentMethodsContext.Provider>
  );
}

export function usePaymentMethods() {
  const ctx = useContext(PaymentMethodsContext);
  if (!ctx) throw new Error('usePaymentMethods must be used within PaymentMethodsProvider');
  return ctx;
}
