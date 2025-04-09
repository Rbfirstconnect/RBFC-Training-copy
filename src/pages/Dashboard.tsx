import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_DISPLAY_NAMES } from '../types';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Users, Layout, Clock, Folder, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

interface Module {
  id: string;
  title: string;
  description: string | null;
  folder_id: string | null;
  sub_modules_count: number;
  created_at: string;
}

interface Folder {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  modules_count: number;
  display_order: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Get total module count first
      const { count: totalModules, error: countError } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // Fetch folders with module count
      const { data: folderData, error: folderError } = await supabase
        .from('folders')
        .select(`
          id,
          name,
          description,
          created_at,
          display_order,
          modules:modules(count)
        `)
        .order('display_order', { ascending: true })
        .limit(5)
        .throwOnError();

      if (folderError) throw folderError;

      setFolders(folderData.map(folder => ({
        ...folder,
        modules_count: folder.modules[0].count
      })));

      // Fetch recent modules
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select(`
          id,
          title,
          description,
          folder_id,
          sub_modules:sub_modules(count),
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (moduleError) throw moduleError;

      setModules(moduleData.map(module => ({
        ...module,
        sub_modules_count: module.sub_modules[0].count
      })));
      
      // Update modules state with total count
      setModules(prev => ({
        ...prev,
        total: totalModules || 0
      }));

    } catch (err) {
      setError('Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="h-1 w-20 bg-[#ff6900] rounded-full mt-2"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow px-8 py-4 transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-100 p-3 rounded-full">
              <Folder className="h-6 w-6 text-[#ff6900]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Folders</h2>
              <p className="text-4xl font-bold boost-text-gradient">{folders.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow px-8 py-4 transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-100 p-3 rounded-full">
              <Layout className="h-6 w-6 text-[#ff6900]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Total Modules</h2>
              <p className="text-4xl font-bold boost-text-gradient">{modules.total || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Folders</h2>
          </div>
        </div>
        <div className="border-t border-gray-200">
          {folders.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {folders.map((folder) => (
                <li 
                  key={folder.id} 
                  className="p-6 hover:bg-orange-50 transition-all duration-200 cursor-pointer group"
                >
                  {user?.role === 'admin' && <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await supabase.rpc('reorder_folders', {
                            p_folder_id: folder.id,
                            p_new_order: Math.max(0, (folder.display_order || 0) - 1)
                          });
                          fetchData();
                        } catch (err) {
                          console.error('Error reordering:', err);
                        }
                      }}
                      disabled={folder.display_order === 0}
                      className={`p-1 rounded hover:bg-orange-100 ${
                        folder.display_order === 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <ChevronUp className="w-4 h-4 text-[#ff6900]" />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await supabase.rpc('reorder_folders', {
                            p_folder_id: folder.id,
                            p_new_order: (folder.display_order || 0) + 1
                          });
                          fetchData();
                        } catch (err) {
                          console.error('Error reordering:', err);
                        }
                      }}
                      disabled={folder.display_order === folders.length - 1}
                      className={`p-1 rounded hover:bg-orange-100 ${
                        folder.display_order === folders.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <ChevronDown className="w-4 h-4 text-[#ff6900]" />
                    </button>
                  </div>}
                  <div 
                    className="flex items-center justify-between group-hover:translate-x-2 transition-transform duration-200"
                    onClick={() => navigate(`/folders/${folder.id}`)}
                  >
                    <div>
                      <h3 className="text-base font-medium text-gray-900">{folder.name}</h3>
                      {folder.description && (
                        <p className="mt-1 text-sm text-gray-500">{folder.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {new Date(folder.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-[#ff6900]">
                      {folder.modules_count} modules
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No folders available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;