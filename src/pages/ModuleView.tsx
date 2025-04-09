import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';

interface Step {
  order: number;
  description: string;
  image_path?: string;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  folder_id: string | null;
  sub_modules: SubModule[];
}

interface SubModule {
  id: string;
  title: string;
  content: string | null;
  steps: Step[] | null;
}

const ModuleView = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const { data: moduleData, error: moduleError } = await supabase
          .from('modules')
          .select(`
            id,
            title,
            folder_id,
            description,
            sub_modules (
              id,
              title,
              content,
              steps
            )
          `)
          .eq('id', moduleId)
          .single();

        if (moduleError) throw moduleError;
        setModule(moduleData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch module');
      } finally {
        setLoading(false);
      }
    };

    if (moduleId) {
      fetchModule();
    }
  }, [moduleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
        <p className="text-yellow-800">Module not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {module.folder_id && (
        <button
          onClick={() => navigate(`/folders/${module.folder_id}`)}
          className="flex items-center gap-2 px-4 py-2 mb-6 text-gray-600 hover:text-[#ff6900] border border-gray-300 rounded-lg hover:bg-orange-50 hover:border-[#ff6900] transition-all duration-200"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Folder
        </button>
      )}

      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg shadow-md p-8 mb-6 border-l-4 border-[#ff6900]">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900">{module.title}</h1>
          <div className="h-1 w-20 bg-[#ff6900] rounded-full"></div>
        </div>
        {module.description && (
          <p className="text-gray-600 mt-4 text-lg leading-relaxed">{module.description}</p>
        )}
      </div>

      {module.sub_modules && module.sub_modules.length > 0 ? (
        <div className="space-y-4">
          {module.sub_modules.map((subModule) => (
            <div key={subModule.id} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                {subModule.title}
              </h2>
              {subModule.content && (
                <div className="prose max-w-none">
                  {subModule.content}
                </div>
              )}
              {subModule.steps && subModule.steps.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                    <span className="bg-orange-100 p-2 rounded-lg mr-3">
                      <BookOpen className="w-6 h-6 text-[#ff6900]" />
                    </span>
                    Instructions
                  </h3>
                  <ol className="space-y-8">
                    {subModule.steps.map((step, index) => (
                      <li key={index} className="flex items-start gap-4 bg-gradient-to-r from-orange-50 to-transparent p-6 rounded-lg border-l-4 border-[#ff6900]">
                        <div className="flex-shrink-0 w-10 h-10 bg-[#ff6900] text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-grow">
                          <p className="text-gray-700 text-lg leading-relaxed">{step.description}</p>
                          {step.image_path && (
                            <img 
                              src={`${supabase.storage.from('training-images').getPublicUrl(step.image_path).data.publicUrl}`}
                              alt={`Step ${step.order}`}
                              className="mt-4 rounded-lg max-w-full h-auto shadow-lg"
                            />
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-600">No sub-modules available</p>
        </div>
      )}
    </div>
  );
};

export default ModuleView;