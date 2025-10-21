import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  Image, 
  Users, 
  FolderOpen, 
  Sparkles,
  ChevronLeft,
  Menu,
  Settings,
  Search,
  Plus,
  Trash2,
  Loader,
  ExternalLink
} from 'lucide-react';

interface User {
  email: string;
  role?: string;
}

interface ReplicateModel {
  url: string;
  owner: string;
  name: string;
  description: string;
  visibility: string;
  github_url?: string;
  paper_url?: string;
  license_url?: string;
  run_count: number;
  cover_image_url?: string;
  default_example?: {
    output: string[];
  };
  latest_version?: {
    id: string;
    created_at: string;
  };
}

interface SavedModel {
  id: string;
  owner: string;
  name: string;
  description: string;
  url: string;
  visibility?: string;
  github_url?: string;
  paper_url?: string;
  license_url?: string;
  run_count?: number;
  cover_image_url?: string;
  latest_version?: {
    id: string;
    created_at: string;
  };
  schema?: {
    input: any;
    output: any;
  };
  created_at?: string;
  updated_at?: string;
}

const ConfigPage: React.FC = () => {
  const { user } = useAuth() as { user: User | null };
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [directModelInput, setDirectModelInput] = useState('');
  const [models, setModels] = useState<ReplicateModel[]>([]);
  const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [directLoading, setDirectLoading] = useState(false);
  const [error, setError] = useState('');
  const [directError, setDirectError] = useState('');

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/replicate/models?query=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      setModels(data.results || []);
    } catch (err) {
      console.error('Error searching models:', err);
      setError('Failed to search models. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadCollection = async (collectionSlug: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/replicate/collections?slug=${encodeURIComponent(collectionSlug)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch collection');
      }

      const data = await response.json();
      setModels(data.models || []);
    } catch (err) {
      console.error('Error loading collection:', err);
      setError('Failed to load collection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDirectModel = async () => {
    const input = directModelInput.trim();
    if (!input) return;

    // Parse owner/name from input (e.g., "delta-lock/ponynai3")
    const parts = input.split('/');
    if (parts.length !== 2) {
      setDirectError('Please enter model in format: owner/name (e.g., delta-lock/ponynai3)');
      return;
    }

    const [owner, name] = parts;

    try {
      setDirectLoading(true);
      setDirectError('');
      
      const response = await fetch(`/api/replicate/model?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(name)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Model not found. Please check the owner/name.');
        }
        throw new Error('Failed to fetch model');
      }

      const model = await response.json();
      await handleAddModel(model);
      setDirectModelInput('');
      setDirectError('');
    } catch (err: any) {
      console.error('Error adding direct model:', err);
      setDirectError(err.message || 'Failed to add model. Please try again.');
    } finally {
      setDirectLoading(false);
    }
  };

  const handleAddModel = async (model: ReplicateModel) => {
    // Check if model already exists
    if (savedModels.some(m => m.id === `${model.owner}/${model.name}`)) {
      setDirectError('Model already added to saved list');
      return;
    }

    try {
      // Save to Firestore with schema
      const response = await fetch('/api/admin/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelData: {
            owner: model.owner,
            name: model.name
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save model');
      }

      const { model: savedModel } = await response.json();
      
      // Update local state
      setSavedModels(prev => [...prev, savedModel]);
    } catch (err: any) {
      console.error('Error saving model:', err);
      setDirectError(err.message || 'Failed to save model. Please try again.');
    }
  };

  const handleRemoveModel = async (modelId: string) => {
    try {
      const response = await fetch(`/api/admin/models?modelId=${encodeURIComponent(modelId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete model');
      }

      // Update local state
      setSavedModels(prev => prev.filter(m => m.id !== modelId));
    } catch (err) {
      console.error('Error deleting model:', err);
      setError('Failed to delete model. Please try again.');
    }
  };

  const loadSavedModels = async () => {
    try {
      const response = await fetch('/api/admin/models');
      
      if (!response.ok) {
        throw new Error('Failed to fetch saved models');
      }

      const { models } = await response.json();
      setSavedModels(models);
    } catch (err) {
      console.error('Error loading saved models:', err);
    }
  };

  useEffect(() => {
    // Load saved models from Firestore
    loadSavedModels();

    // Load default collection on mount
    handleLoadCollection('text-to-image');
  }, []);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: Home,
      description: 'Admin overview'
    },
    {
      name: 'Upload Images',
      href: '/admin/upload-images',
      icon: Image,
      description: 'Manage images'
    },
    {
      name: 'Manage Users',
      href: '/admin/manage-users',
      icon: Users,
      description: 'User accounts'
    },
    {
      name: 'Manage Galleries',
      href: '/admin/manage-galleries',
      icon: FolderOpen,
      description: 'Gallery organization'
    },
    {
      name: 'Generate',
      href: '/admin/generate',
      icon: Sparkles,
      description: 'Generate content'
    },
    {
      name: 'Config',
      href: '/admin/config',
      icon: Settings,
      description: 'AI model settings',
      current: true
    }
  ];

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-100 flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } bg-neutral-900 text-white transition-all duration-300 ease-in-out flex flex-col`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            {sidebarOpen && (
              <h1 className="text-xl font-bold">
                Total<span className="text-[#4CAF50]">Toons34</span>
              </h1>
            )}
            <button
              onClick={handleToggleSidebar}
              className="p-2 rounded-lg hover:bg-neutral-800 transition-colors duration-200"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              tabIndex={0}
            >
              {sidebarOpen ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.current;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-[#4CAF50] text-white'
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                  title={!sidebarOpen ? item.name : ''}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs opacity-70 truncate">{item.description}</p>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          {sidebarOpen && (
            <div className="p-4 border-t border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#4CAF50] flex items-center justify-center text-white font-semibold">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                  <p className="text-xs text-neutral-400">Administrator</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Content Area */}
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">AI Model Configuration</h1>

              {/* Direct Add Section */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Model Directly</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the exact model identifier from Replicate (e.g., <code className="bg-gray-100 px-2 py-1 rounded text-sm">delta-lock/ponynai3</code>)
                </p>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="owner/model-name (e.g., delta-lock/ponynai3)"
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                      value={directModelInput}
                      onChange={(e) => setDirectModelInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddDirectModel()}
                    />
                  </div>
                  <button
                    onClick={handleAddDirectModel}
                    disabled={directLoading || !directModelInput.trim()}
                    className="px-6 py-3 bg-[#4CAF50] text-white font-semibold rounded-lg hover:bg-[#45a049] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4CAF50] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                  >
                    {directLoading ? <Loader className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                    Add Model
                  </button>
                </div>

                {directError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {directError}
                  </div>
                )}
              </div>

              {/* Search Section */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Browse & Search Models</h2>
                
                {/* Quick Collections */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Quick Collections:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleLoadCollection('text-to-image')}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
                    >
                      Text-to-Image
                    </button>
                    <button
                      onClick={() => handleLoadCollection('image-to-image')}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
                    >
                      Image-to-Image
                    </button>
                    <button
                      onClick={() => handleLoadCollection('super-resolution')}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
                    >
                      Super Resolution
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search for models (e.g., 'stable diffusion', 'flux')..."
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={loading || !searchQuery.trim()}
                    className="px-6 py-3 bg-[#4CAF50] text-white font-semibold rounded-lg hover:bg-[#45a049] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4CAF50] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                  >
                    {loading ? <Loader className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    Search
                  </button>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Models */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Available Models ({models.length})
                  </h2>
                  
                  {loading && models.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader className="h-8 w-8 animate-spin text-[#4CAF50]" />
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {models.map((model) => (
                        <div
                          key={`${model.owner}/${model.name}`}
                          className="p-4 border border-gray-200 rounded-lg hover:border-[#4CAF50] transition-colors duration-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">
                                {model.owner}/{model.name}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {model.description}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-gray-500">
                                  Runs: {model.run_count.toLocaleString()}
                                </span>
                                <a
                                  href={model.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#4CAF50] hover:text-[#45a049] flex items-center gap-1"
                                >
                                  View <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddModel(model)}
                              disabled={savedModels.some(m => m.id === `${model.owner}/${model.name}`)}
                              className="ml-3 p-2 text-[#4CAF50] hover:bg-green-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Add model"
                              tabIndex={0}
                            >
                              <Plus className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {models.length === 0 && !loading && (
                        <p className="text-center text-gray-500 py-8">
                          Search for models or select a collection to get started
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Saved Models */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Saved Models ({savedModels.length})
                  </h2>
                  
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {savedModels.map((model) => (
                      <div
                        key={model.id}
                        className="p-4 border border-gray-200 rounded-lg bg-green-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {model.id}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {model.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              {model.schema && (
                                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                  Schema Saved
                                </span>
                              )}
                              {model.run_count && (
                                <span className="text-xs text-gray-500">
                                  {model.run_count.toLocaleString()} runs
                                </span>
                              )}
                              <a
                                href={model.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#4CAF50] hover:text-[#45a049] flex items-center gap-1"
                              >
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveModel(model.id)}
                            className="ml-3 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            aria-label="Remove model"
                            tabIndex={0}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {savedModels.length === 0 && (
                      <p className="text-center text-gray-500 py-8">
                        No models saved yet. Add models from the available list.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ConfigPage;

