import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export type DetailField = { label: string; value: ReactNode };
export type DetailSection = { heading?: string; fields: DetailField[] };

interface Props {
  open:     boolean;
  onClose:  () => void;
  avatar?:  ReactNode;
  title:    string;
  subtitle?: string;
  badges?:  ReactNode;
  sections: DetailSection[];
  footer?:  ReactNode;
}

export function DetailModal({ open, onClose, avatar, title, subtitle, badges, sections, footer }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X size={18} />
        </button>

        <div className="p-6 pb-4 border-b border-gray-100 flex items-start gap-4">
          {avatar}
          <div className="min-w-0 flex-1 pr-6">
            <h3 className="text-base font-semibold text-gray-900 truncate">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
            {badges && <div className="flex flex-wrap gap-1.5 mt-2">{badges}</div>}
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {sections.map((section, i) => (
            <div key={i}>
              {section.heading && (
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{section.heading}</h4>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {section.fields.map((f) => (
                  <div key={f.label} className={typeof f.value === 'string' && f.value.length > 40 ? 'col-span-2' : ''}>
                    <dt className="text-xs text-gray-400 mb-0.5">{f.label}</dt>
                    <dd className="text-sm text-gray-800 break-words">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        {footer && <div className="p-6 pt-4 border-t border-gray-100 flex gap-3">{footer}</div>}
      </div>
    </div>
  );
}
