import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { usePlatforms, type Platform } from '../../context/PlatformsContext';
import { PlatformForm } from './PlatformForm';

export function EditPlatformPage() {
  const { id } = useParams<{ id: string }>();
  const { getById, updatePlatform } = usePlatforms();
  const navigate = useNavigate();

  const platform = id ? getById(id) : undefined;

  if (!platform) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-gray-800 font-semibold">Platform not found</p>
          <p className="text-sm text-gray-500 mt-1">The platform you're looking for doesn't exist.</p>
        </div>
        <button
          onClick={() => navigate('/platforms')}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Back to Platforms
        </button>
      </div>
    );
  }

  function handleSubmit(data: Omit<Platform, 'id' | 'createdAt' | 'campaignCount'>) {
    updatePlatform(platform!.id, data);
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Platform</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Editing <span className="font-medium text-gray-700">{platform.name}</span>
          </p>
        </div>
      </div>
      <PlatformForm initial={platform} onSubmit={handleSubmit} submitLabel="Save Changes" />
    </div>
  );
}
