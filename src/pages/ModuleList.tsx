import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ChevronRight, Search, BookOpen, Clock, Users, Folder, ChevronLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

interface Folder {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface SubModule {
  id: string;
  module_id: string;
  title: string;
  content: string;
  steps: {
    order: number;
    description: string;
    image_path?: string;
  }[];
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  sub_modules?: SubModule[];
  created_at: string;
  view_roles: string[];
}

function ModuleList() {
  const { folderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([]);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (folderId) {
      fetchFolderAndModules();
    }
  }, [folderId]);

  async function fetchFolderAndModules() {
    try {
      // Fetch folder details
      const { data: folderData, error: folderError } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .single();

      if (folderError) throw folderError;
      setFolder(folderData);

      // Fetch modules in this folder
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('folder_id', folderId)
        .order('display_order', { ascending: true });

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  const filteredModules = modules.filter(module =>
    module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#ff6900] border border-gray-300 rounded-lg hover:bg-white/50 hover:border-[#ff6900] transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{folder?.name}</h1>
              <div className="h-1 w-20 bg-[#ff6900] rounded-full mt-2"></div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-lg">
            <BookOpen className="w-5 h-5 text-[#ff6900]" />
            <span className="text-gray-700 font-medium">{filteredModules.length} Modules</span>
          </div>
        </div>
        {folder?.description && (
          <p className="text-gray-600 mt-4 max-w-2xl">{folder.description}</p>
        )}
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search modules by title or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6900] focus:border-transparent transition-all duration-200"
        />
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden border boost-border">
        {filteredModules.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No modules match your search' : 'No modules available in this folder'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredModules.map((module) => (
              <li
                key={module.id}
                className="p-6 hover:bg-orange-50 cursor-pointer transition-all duration-200 group"
              >
                {user?.role === 'admin' && <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await supabase.rpc('reorder_modules', {
                          p_module_id: module.id,
                          p_new_order: Math.max(0, (module.display_order || 0) - 1)
                        });
                        fetchFolderAndModules();
                      } catch (err) {
                        console.error('Error reordering:', err);
                      }
                    }}
                    disabled={module.display_order === 0}
                    className={`p-1 rounded hover:bg-orange-100 ${
                      module.display_order === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <ChevronUp className="w-4 h-4 text-[#ff6900]" />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await supabase.rpc('reorder_modules', {
                          p_module_id: module.id,
                          p_new_order: (module.display_order || 0) + 1
                        });
                        fetchFolderAndModules();
                      } catch (err) {
                        console.error('Error reordering:', err);
                      }
                    }}
                    disabled={module.display_order === filteredModules.length - 1}
                    className={`p-1 rounded hover:bg-orange-100 ${
                      module.display_order === filteredModules.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 text-[#ff6900]" />
                  </button>
                </div>}
                <div 
                  className="flex items-center justify-between group-hover:translate-x-2 transition-transform duration-200"
                  onClick={() => navigate(`/modules/${module.id}`)}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <BookOpen className="w-5 h-5 text-[#ff6900]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">{module.title}</h3>
                        {module.description && (
                          <p className="text-gray-600 line-clamp-2">{module.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(module.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center ml-4">
                    <ChevronRight className="w-5 h-5 text-[#ff6900] transform group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ModuleList;