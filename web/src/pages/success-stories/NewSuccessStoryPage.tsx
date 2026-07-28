import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSuccessStories, type SuccessStory } from '../../context/SuccessStoriesContext';
import { SuccessStoryForm } from './SuccessStoryForm';

export function NewSuccessStoryPage() {
  const { addStory } = useSuccessStories();
  const navigate = useNavigate();

  async function handleSubmit(data: Omit<SuccessStory, 'id' | 'createdAt'>) {
    try {
      await addStory(data);
      navigate('/success-stories');
    } catch (e) {
      window.alert((e as Error).message ?? 'Failed to create success story.');
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
          <h1 className="text-2xl font-bold text-gray-900">Add Success Story</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a new testimonial for the landing page.</p>
        </div>
      </div>

      <SuccessStoryForm onSubmit={handleSubmit} submitLabel="Create Success Story" />
    </div>
  );
}
