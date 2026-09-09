import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { PaymentTransactionsTab } from './payments/PaymentTransactionsTab';
import { PaymentMethodsTab } from './payments/PaymentMethodsTab';
import { WithdrawalsTab } from './payments/WithdrawalsTab';
import { WithdrawalLimitsTab } from './payments/WithdrawalLimitsTab';
import { DisputesTab } from './payments/DisputesTab';

const TABS = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'disputes',     label: 'Disputes' },
  { key: 'withdrawals',  label: 'Withdrawal Requests' },
  { key: 'methods',      label: 'Payment Methods' },
  { key: 'limits',       label: 'Creator Withdrawal Limit' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function Payments() {
  // `?tab=` keeps the active tab in the URL so notification links (and shared
  // links) can deep-link straight to Disputes / Withdrawal Requests.
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab');
  const tab: TabKey = TABS.some((t) => t.key === paramTab) ? (paramTab as TabKey) : 'transactions';
  const setTab = (key: TabKey) =>
    setSearchParams(key === 'transactions' ? {} : { tab: key }, { replace: true });

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

      {tab === 'transactions' && <PaymentTransactionsTab />}
      {tab === 'disputes'     && <DisputesTab />}
      {tab === 'withdrawals'  && <WithdrawalsTab />}
      {tab === 'methods'      && <PaymentMethodsTab />}
      {tab === 'limits'       && <WithdrawalLimitsTab />}
    </div>
  );
}
