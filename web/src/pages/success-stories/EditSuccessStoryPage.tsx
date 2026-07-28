import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useSuccessStories, type SuccessStory } from '../../context/SuccessStoriesContext';
import { SuccessStoryForm } from './SuccessStoryForm';

export function EditSuccessStoryPage() {
  const { id } = useParams<{ id: string }>();
  const { getById, updateStory, loading } = useSuccessStories();
  const navigate = useNavigate();

  const story = id ? getById(id) : undefined;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading…</div>;
  }

  if (!story) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-gray-800 font-semibold">Success story not found</p>
          <p className="text-sm text-gray-500 mt-1">The success story you're looking for doesn't exist.</p>
        </div>
        <button
          onClick={() => navigate('/success-stories')}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Back to Success Stories
        </button>
      </div>
    );
  }

  async function handleSubmit(data: Omit<SuccessStory, 'id' | 'createdAt'>) {
    try {
      await updateStory(story!.id, data);
      navigate('/success-stories');
    } catch (e) {
      window.alert((e as Error).message ?? 'Failed to update success story.');
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/success-stories')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Success Story</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Editing <span className="font-medium text-gray-700">{story.name}</span>
          </p>
        </div>
      </div>

      <SuccessStoryForm initial={story} onSubmit={handleSubmit} submitLabel="Save Changes" />
    </div>
  );
}
