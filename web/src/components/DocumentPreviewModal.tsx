import { X } from 'lucide-react';

interface Props {
  url:         string;
  title?:      string;
  approved?:   boolean;
  onApprove?:   () => void;
  onUnapprove?: () => void;
  actionLoading?: boolean;
  onClose:     () => void;
}

function isPdf(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

export function DocumentPreviewModal({ url, title, approved, onApprove, onUnapprove, actionLoading, onClose }: Props) {
  const showActions = onApprove && onUnapprove;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{title ?? 'Document'}</h3>
          <div className="flex items-center gap-4">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              Open in new tab
            </a>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center min-h-[300px]">
          {isPdf(url) ? (
            <iframe src={url} title={title ?? 'Document'} className="w-full h-[75vh]" />
          ) : (
            <img src={url} alt={title ?? 'Document'} className="max-w-full max-h-[75vh] object-contain" />
          )}
        </div>

        {showActions && (
          <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100">
            <button
              onClick={onUnapprove}
              disabled={!approved || actionLoading}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors disabled:cursor-default disabled:opacity-60 ${
                approved
                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                  : 'text-gray-400 bg-gray-50'
              }`}
            >
              Unapprove
            </button>
            <button
              onClick={onApprove}
              disabled={approved || actionLoading}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors disabled:cursor-default disabled:opacity-60 ${
                !approved
                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  : 'text-gray-400 bg-gray-50'
              }`}
            >
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
