import {Trash2, ShieldOff, ShieldCheck, X } from 'lucide-react';

type Variant = 'danger' | 'warning' | 'success';

interface Props {
  open:          boolean;
  title:         string;
  body:          string;
  confirmLabel:  string;
  variant?:      Variant;
  loading?:      boolean;
  onConfirm:     () => void;
  onCancel:      () => void;
}

const VARIANT_CFG: Record<Variant, { icon: typeof Trash2; iconBg: string; iconColor: string; btnClass: string }> = {
  danger:  { icon: Trash2,       iconBg: 'bg-red-50',    iconColor: 'text-red-500',    btnClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500' },
  warning: { icon: ShieldOff,    iconBg: 'bg-orange-50', iconColor: 'text-orange-500', btnClass: 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-400' },
  success: { icon: ShieldCheck,  iconBg: 'bg-green-50',  iconColor: 'text-green-500',  btnClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500' },
};

export function ConfirmModal({ open, title, body, confirmLabel, variant = 'danger', loading, onConfirm, onCancel }: Props) {
  if (!open) return null;
  const cfg = VARIANT_CFG[variant];
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Sheet */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>

        <div className={`w-12 h-12 rounded-xl ${cfg.iconBg} flex items-center justify-center mb-4`}>
          <Icon size={22} className={cfg.iconColor} />
        </div>

        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">{body}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 ${cfg.btnClass}`}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
