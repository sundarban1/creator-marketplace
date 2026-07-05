import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useCategories, type Category } from '../../context/CategoriesContext';
import { CategoryForm } from './CategoryForm';

export function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const { getById, updateCategory, loading } = useCategories();
  const navigate = useNavigate();

  const category = id ? getById(id) : undefined;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading…</div>;
  }

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-gray-800 font-semibold">Category not found</p>
          <p className="text-sm text-gray-500 mt-1">The category you're looking for doesn't exist.</p>
        </div>
        <button
          onClick={() => navigate('/categories')}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Back to Categories
        </button>
      </div>
    );
  }

  async function handleSubmit(data: Omit<Category, 'id' | 'createdAt' | 'itemCount'>) {
    try {
      await updateCategory(category!.id, data);
      navigate('/categories');
    } catch (e) {
      window.alert((e as Error).message ?? 'Failed to update category.');
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/categories')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Category</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Editing <span className="font-medium text-gray-700">{category.name}</span>
          </p>
        </div>
      </div>

      <CategoryForm initial={category} onSubmit={handleSubmit} submitLabel="Save Changes" />
    </div>
  );
}
