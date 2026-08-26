import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { PaymentTransactionsTab } from './payments/PaymentTransactionsTab';
import { PaymentMethodsTab } from './payments/PaymentMethodsTab';

const TABS = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'methods',      label: 'Payment Methods' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function Payments() {
  const [tab, setTab] = useState<TabKey>('transactions');

  return (
    <div>
      <PageHeader title="Payments" />

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'transactions' ? <PaymentTransactionsTab /> : <PaymentMethodsTab />}
    </div>
  );
}
