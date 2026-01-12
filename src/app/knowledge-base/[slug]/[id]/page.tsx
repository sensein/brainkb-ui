"use client";
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import DynamicDetailPage from "@/src/app/components/data-display/DynamicDetailPage";
import { getDetailPageConfig } from "@/src/utils/config/page-config-loader";
import { AlertCircle, Loader2 } from "lucide-react";

export default function KnowledgeBaseDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const loadedConfig = await getDetailPageConfig(`/knowledge-base/${slug}`, slug);
        if (loadedConfig) {
          setConfig(loadedConfig);
        } else {
          console.warn(`No configuration found for slug: ${slug}. Make sure it's configured in page-mapper.yaml with a detail YAML file.`);
        }
      } catch (err) {
        console.error(`Error loading config for slug ${slug}:`, err);
      } finally {
        setLoading(false);
      }
    };
    
    if (slug) {
      loadConfig();
    }
  }, [slug]);
  
  if (loading) {
    return (
      <div className="kb-page-margin">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }
  
  // Use DynamicDetailPage for all pages (both API-based and SPARQL-based)
  if (config) {
    return <DynamicDetailPage config={config} />;
  }
  
  // Otherwise, show error
  return (
    <div className="kb-page-margin">
      <div className="fix-left-margin max-w-[1600px]">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">Page Not Found</h3>
              <p className="text-yellow-700">No configuration found for slug: {slug}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
