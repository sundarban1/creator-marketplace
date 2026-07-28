import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { useSuccessStories } from '../../context/SuccessStoriesContext';
import { StatusBadge } from '../../components/StatusBadge';
import { PageHeader } from '../../components/PageHeader';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-600" />
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center">Delete success story?</h3>
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

export function SuccessStoriesPage() {
  const { stories, loading, toggleStatus, deleteStory } = useSuccessStories();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = stories.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = stories.filter((s) => s.status === 'active').length;

  return (
    <div>
      <PageHeader
        title="Success Stories"
        subtitle={`${stories.length} total · ${activeCount} active`}
        action={
          <button
            onClick={() => navigate('/success-stories/new')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Add Success Story
          </button>
        }
      />

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or role…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Photo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Quote</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Order</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                  No success stories found.
                </td>
              </tr>
            )}
            {!loading && filtered.map((story) => (
              <tr key={story.id} className="hover:bg-gray-50 transition-colors">
                {/* Photo */}
                <td className="px-4 py-3">
                  {story.photoUrl ? (
                    <img src={story.photoUrl} alt={story.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xs font-semibold select-none">
                      {initials(story.name)}
                    </div>
                  )}
                </td>

                {/* Name */}
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{story.name}</span>
                </td>

                {/* Role */}
                <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                  {story.role}
                </td>

                {/* Quote excerpt */}
                <td className="px-4 py-3 hidden md:table-cell text-gray-500 max-w-xs truncate">
                  {story.quote}
                </td>

                {/* Order */}
                <td className="px-4 py-3 hidden lg:table-cell text-gray-500">
                  {story.order}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge status={story.status} />
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Toggle status */}
                    <button
                      onClick={() => toggleStatus(story.id)}
                      title={story.status === 'active' ? 'Deactivate' : 'Activate'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        story.status === 'active'
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {story.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => navigate(`/success-stories/edit/${story.id}`)}
                      title="Edit"
                      className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteTarget({ id: story.id, name: story.name })}
                      title="Delete"
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
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

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={() => { deleteStory(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
