import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Upload, X, Image, Edit, Eye, AlertTriangle, ChevronUp, ChevronDown, Folder, FolderPlus, Layout } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Module, Folder as FolderType } from '../types';
import type { UserRole } from '../types';

interface Step {
  order: number;
  description: string;
  image_path?: string;
}

interface ModuleForm {
  title: string;
  description: string;
  folder_id: string | null;
  view_roles: string[];
  edit_roles: string[];
  steps: Step[];
}

const ROLE_HIERARCHY: { [key in UserRole]: UserRole[] } = {
  'admin': ['admin'],
  'back_office': ['back_office', 'admin'],
  'rm': ['rm', 'back_office', 'admin'],
  'asm': ['asm', 'rm', 'back_office', 'admin'],
  'market_lead': ['market_lead', 'asm', 'rm', 'back_office', 'admin'],
  'frontline_sales': ['frontline_sales', 'market_lead', 'asm', 'rm', 'back_office', 'admin']
};

const ROLES: UserRole[] = [
  'admin',
  'back_office',
  'rm',
  'asm',
  'market_lead',
  'frontline_sales'
];

export default function ModuleManagement() {
  const [modules, setModules] = useState<Module[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [uploading, setUploading] = useState<{ [key: number]: boolean }>({});
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [folderForm, setFolderForm] = useState({
    name: '',
    description: ''
  });
  const [formData, setFormData] = useState<ModuleForm>({
    title: '',
    description: '',
    folder_id: null,
    view_roles: [],
    edit_roles: [],
    steps: [],
  });
  const [activeTab, setActiveTab] = useState<'folders' | 'modules'>('folders');

  useEffect(() => {
    fetchModules();
    fetchFolders();
  }, []);

  async function fetchFolders() {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name, description, created_at, created_by, updated_at, updated_by')
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folders');
    }
  }

  async function fetchModules() {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*');

      if (error) throw error;
      setModules(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch modules');
    } finally {
      setLoading(false);
    }
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    setFormData(prev => {
      const newSteps = [...prev.steps];
      if (direction === 'up' && index > 0) {
        [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
      } else if (direction === 'down' && index < newSteps.length - 1) {
        [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
      }
      return {
        ...prev,
        steps: newSteps.map((step, i) => ({ ...step, order: i + 1 }))
      };
    });
  }

  function insertStepAfter(index: number) {
    setFormData(prev => {
      const newSteps = [...prev.steps];
      newSteps.splice(index + 1, 0, { order: index + 2, description: '' });
      return {
        ...prev,
        steps: newSteps.map((step, i) => ({ ...step, order: i + 1 }))
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let moduleData;
      
      if (editingModule) {
        const { data, error } = await supabase
          .from('modules')
          .update({
            title: formData.title,
            description: formData.description,
            folder_id: formData.folder_id,
            view_roles: formData.view_roles,
            edit_roles: formData.edit_roles
          })
          .eq('id', editingModule.id)
          .select()
          .single();

        if (error) throw error;
        moduleData = data;
      } else {
        const { data, error } = await supabase
          .from('modules')
          .insert([{
            title: formData.title,
            description: formData.description,
            folder_id: formData.folder_id,
            view_roles: formData.view_roles,
            edit_roles: formData.edit_roles
          }])
          .select()
          .single();

        if (error) throw error;
        moduleData = data;
      }

      if (moduleData && formData.steps.length > 0) {
        if (editingModule) {
          await supabase
            .from('sub_modules')
            .delete()
            .eq('module_id', editingModule.id);
        }

        const { error: stepsError } = await supabase
          .from('sub_modules')
          .insert([{
            module_id: moduleData.id,
            title: 'Instructions',
            steps: formData.steps,
          }]);

        if (stepsError) throw stepsError;
      }

      setFormData({
        title: '',
        description: '',
        folder_id: null,
        view_roles: ['admin'],
        edit_roles: ['admin'],
        steps: []
      });
      setShowForm(false);
      setEditingModule(null);
      fetchModules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save module');
    }
  }

  async function uploadImage(index: number, file: File) {
    try {
      setUploading(prev => ({ ...prev, [index]: true }));
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('training-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      updateStep(index, 'image_path', filePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading image');
    } finally {
      setUploading(prev => ({ ...prev, [index]: false }));
    }
  }

  function removeImage(index: number) {
    updateStep(index, 'image_path', '');
  }

  function addStep() {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, { order: prev.steps.length + 1, description: '' }],
    }));
  }

  function updateStep(index: number, field: keyof Step, value: string) {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      ),
    }));
  }

  function removeStep(index: number) {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, order: i + 1 })),
    }));
  }

  async function handleEdit(module: Module) {
    try {
      const { data: subModuleData, error: subModuleError } = await supabase
        .from('sub_modules')
        .select('*')
        .eq('module_id', module.id)
        .maybeSingle();

      if (subModuleError && subModuleError.code !== 'PGRST116') throw subModuleError;

      setFormData({
        title: module.title,
        description: module.description || '',
        folder_id: module.folder_id,
        view_roles: module.view_roles,
        edit_roles: module.edit_roles,
        steps: subModuleData?.steps || [],
      });
      setEditingModule(module);
      setShowForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load module data');
    }
  }

  async function handleDelete() {
    if (!moduleToDelete) return;
    
    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleToDelete.id);

      if (error) throw error;
      
      setModules(modules.filter(m => m.id !== moduleToDelete.id));
      setModuleToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete module');
    }
  }

  async function handleFolderSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingFolder) {
        const { error } = await supabase
          .from('folders')
          .update({
            name: folderForm.name,
            description: folderForm.description
          })
          .eq('id', editingFolder.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('folders')
          .insert([{
            name: folderForm.name,
            description: folderForm.description
          }]);

        if (error) throw error;
      }

      setFolderForm({ name: '', description: '' });
      setShowFolderForm(false);
      setEditingFolder(null);
      fetchFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save folder');
    }
  }

  async function handleFolderDelete() {
    if (!folderToDelete) return;

    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderToDelete.id);

      if (error) throw error;

      setFolders(folders.filter(f => f.id !== folderToDelete.id));
      setFolderToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
    }
  }

  function handleRoleSelect(type: 'view_roles' | 'edit_roles', selectedRole: UserRole) {
    setFormData(prev => {
      const currentRoles = prev[type];
      const newRoles = currentRoles.includes(selectedRole)
        ? currentRoles.filter(role => role !== selectedRole)
        : [...currentRoles, selectedRole];
      
      return {
        ...prev,
        [type]: newRoles
      };
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Module Management</h1>
        <div className="h-1 w-20 bg-[#ff6900] rounded-full mt-2"></div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('folders')}
            className={`${
              activeTab === 'folders'
                ? 'border-[#ff6900] text-[#ff6900]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <Folder className="w-5 h-5 mr-2" />
            Folders
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            className={`${
              activeTab === 'modules'
                ? 'border-[#ff6900] text-[#ff6900]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <Layout className="w-5 h-5 mr-2" />
            Modules
          </button>
        </nav>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-4">
        {activeTab === 'folders' ? (
          <button
          onClick={() => setShowFolderForm(true)}
          className="flex items-center px-4 py-2 boost-gradient text-white rounded-lg hover:opacity-90 transition-all duration-200"
        >
          <FolderPlus className="w-5 h-5 mr-2" />
          Add New Folder
        </button>
        ) : (
          <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 boost-gradient text-white rounded-lg hover:opacity-90 transition-all duration-200"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Module
        </button>
        )}
      </div>

      {showFolderForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleFolderSubmit} className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {editingFolder ? 'Edit Folder' : 'Create New Folder'}
              </h2>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name
              </label>
              <input
                type="text"
                value={folderForm.name}
                onChange={(e) => setFolderForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={folderForm.description}
                onChange={(e) => setFolderForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowFolderForm(false);
                  setEditingFolder(null);
                  setFolderForm({ name: '', description: '' });
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center px-4 py-2 boost-gradient text-white rounded-lg hover:opacity-90 transition-all duration-200"
              >
                <Save className="w-5 h-5 mr-2" />
                {editingFolder ? 'Update Folder' : 'Save Folder'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {editingModule ? 'Edit Module' : 'Create New Module'}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6900]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder
                </label>
                <select
                  value={formData.folder_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, folder_id: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6900]"
                >
                  <option value="">No Folder</option>
                  {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))
                  }
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6900]"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  View Access
                  <span className="text-sm text-gray-500 ml-2">(Higher roles automatically included)</span>
                </label>
                <div className="space-y-2 mt-2">
                  {ROLES.map((role) => (
                    <label key={role} className="flex items-center">
                      <div className="w-24 text-sm text-gray-500">
                        {ROLES.indexOf(role) === 0 ? '(Highest)' : 
                         ROLES.indexOf(role) === ROLES.length - 1 ? '(Lowest)' : ''}
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.view_roles.includes(role)}
                        onChange={() => handleRoleSelect('view_roles', role)}
                        className="rounded border-gray-300 text-[#ff6900] focus:ring-[#ff6900]"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {role.replace(/_/g, ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Edit Access
                  <span className="text-sm text-gray-500 ml-2">(Higher roles automatically included)</span>
                </label>
                <div className="space-y-2 mt-2">
                  {ROLES.map((role) => (
                    <label key={role} className="flex items-center">
                      <div className="w-24 text-sm text-gray-500">
                        {ROLES.indexOf(role) === 0 ? '(Highest)' : 
                         ROLES.indexOf(role) === ROLES.length - 1 ? '(Lowest)' : ''}
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.edit_roles.includes(role)}
                        onChange={() => handleRoleSelect('edit_roles', role)}
                        className="rounded border-gray-300 text-[#ff6900] focus:ring-[#ff6900]"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {role.replace(/_/g, ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Instructions</h3>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center px-3 py-1 boost-gradient text-white rounded-md hover:opacity-90 transition-all duration-200"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Step
                </button>
              </div>

              <div className="space-y-4">
                {formData.steps.map((step, index) => (
                  <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 flex flex-col items-center gap-1">
                      <span className="w-8 h-8 flex items-center justify-center bg-[#ff6900] text-white rounded-full">
                        {step.order}
                      </span>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => moveStep(index, 'up')}
                          disabled={index === 0}
                          className={`p-1 rounded-full ${
                            index === 0 ? 'text-gray-400' : 'text-[#ff6900] hover:bg-orange-50'
                          }`}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(index, 'down')}
                          disabled={index === formData.steps.length - 1}
                          className={`p-1 rounded-full ${
                            index === formData.steps.length - 1 ? 'text-gray-400' : 'text-[#ff6900] hover:bg-orange-50'
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-grow space-y-3">
                      <textarea
                        value={step.description}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        placeholder="Step description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6900]"
                        rows={2}
                      />
                      <div className="relative">
                        {step.image_path ? (
                          <div className="relative group">
                            <img
                              src={`${supabase.storage.from('training-images').getPublicUrl(step.image_path).data.publicUrl}`}
                              alt={`Step ${step.order}`}
                              className="w-full h-48 object-cover rounded-md"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadImage(index, file);
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors">
                              {uploading[index] ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                              ) : (
                                <>
                                  <Image className="w-8 h-8 mb-2" />
                                  <span>Click to upload image</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => insertStepAfter(index)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded-full"
                        title="Insert step below"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-full"
                        title="Remove step"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingModule(null);
                  setFormData({
                    title: '',
                    description: '',
                    folder_id: null,
                    view_roles: ['admin'],
                    edit_roles: ['admin'],
                    steps: []
                  });
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center px-4 py-2 boost-gradient text-white rounded-lg hover:opacity-90 transition-all duration-200"
              >
                <Save className="w-5 h-5 mr-2" />
                {editingModule ? 'Update Module' : 'Save Module'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : activeTab === 'folders' ? (
          <ul className="divide-y divide-gray-200">
            {folders.map((folder) => (
              <li key={folder.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{folder.name}</h3>
                      {folder.description && (
                        <p className="text-gray-600 text-sm">{folder.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingFolder(folder);
                        setFolderForm({
                          name: folder.name,
                          description: folder.description || ''
                        });
                        setShowFolderForm(true);
                      }}
                      className="p-2 text-[#ff6900] hover:bg-orange-50 rounded-full"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setFolderToDelete(folder)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : modules.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No modules available. Create your first module!
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {modules.map((module) => (
              <li key={module.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{module.title}</h4>
                    {module.description && (
                      <p className="text-gray-600 mb-2">{module.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">View: {module.view_roles.join(', ')}</span>
                      <span className="text-sm text-gray-500">Edit: {module.edit_roles.join(', ')}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(module)}
                      className="p-2 text-[#ff6900] hover:bg-orange-50 rounded-full"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setModuleToDelete(module)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {moduleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-medium">Delete Module</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{moduleToDelete.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setModuleToDelete(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {folderToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-medium">Delete Folder</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{folderToDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFolderDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
