import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCategories, type Category } from '../../context/CategoriesContext';
import { CategoryForm } from './CategoryForm';

export function NewCategoryPage() {
  const { addCategory } = useCategories();
  const navigate = useNavigate();

  function handleSubmit(data: Omit<Category, 'id' | 'createdAt' | 'itemCount'>) {
    addCategory(data);
    navigate('/categories');
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
          <h1 className="text-2xl font-bold text-gray-900">Add New Category</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a new category for campaigns and creators.</p>
        </div>
      </div>

      <CategoryForm onSubmit={handleSubmit} submitLabel="Create Category" />
    </div>
  );
}
