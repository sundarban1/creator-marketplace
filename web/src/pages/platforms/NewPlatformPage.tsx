import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePlatforms, type Platform } from '../../context/PlatformsContext';
import { PlatformForm } from './PlatformForm';

export function NewPlatformPage() {
  const { addPlatform } = usePlatforms();
  const navigate = useNavigate();

  function handleSubmit(data: Omit<Platform, 'id' | 'createdAt' | 'campaignCount'>) {
    addPlatform(data);
    navigate('/platforms');
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/platforms')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Platform</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a new social media platform for events.</p>
        </div>
      </div>
      <PlatformForm onSubmit={handleSubmit} submitLabel="Create Platform" />
    </div>
  );
}
