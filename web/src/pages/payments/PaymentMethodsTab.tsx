import { useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { usePaymentMethods } from '../../context/PaymentMethodsContext';
import { StatusBadge } from '../../components/StatusBadge';
import { PaymentMethodModal } from './PaymentMethodModal';
import type { PaymentMethod } from '../../context/PaymentMethodsContext';

function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-600" />
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center">Delete payment method?</h3>
        <p className="text-sm text-gray-500 text-center mt-2">
          <span className="font-medium text-gray-700">"{name}"</span> will be permanently deleted and cannot be recovered.
        </p>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function PaymentMethodsTab() {
  const { methods, loading, toggleStatus, deleteMethod } = usePaymentMethods();
  const [modalTarget, setModalTarget] = useState<PaymentMethod | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const activeCount = methods.filter((m) => m.status === 'active').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {loading ? 'Loading...' : `${methods.length} total · ${activeCount} shown in app`}
        </p>
        <button
          onClick={() => setModalTarget('new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Add Payment Method
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Icon</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Key</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">In Use</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">Loading…</td>
              </tr>
            )}
            {!loading && methods.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">No payment methods yet.</td>
              </tr>
            )}
            {!loading && methods.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  {m.iconUrl ? (
                    <img src={m.iconUrl} alt={m.name} className="w-10 h-10 rounded-xl object-contain bg-gray-50 border border-gray-200 p-1.5" />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-semibold select-none"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{m.name}</span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{m.key}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-600">{m.usageCount}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={m.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => toggleStatus(m.id)}
                      title={m.status === 'active' ? 'Turn off' : 'Turn on'}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        m.status === 'active'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {m.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      onClick={() => setModalTarget(m)}
                      title="Edit"
                      className="p-1.5 rounded-lg border bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: m.id, name: m.name })}
                      title="Delete"
                      className="p-1.5 rounded-lg border bg-red-50 border-red-200 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalTarget && (
        <PaymentMethodModal
          initial={modalTarget === 'new' ? undefined : modalTarget}
          onClose={() => setModalTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={() => { deleteMethod(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
