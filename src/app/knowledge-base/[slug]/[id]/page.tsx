"use client";
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import DynamicDetailPage from "@/src/app/components/data-display/DynamicDetailPage";
import { getDetailPageConfig } from "@/src/utils/config/page-config-loader";
import { pageMapperConfig } from "@/src/app/components/pageMapperConfig";
import IndividualEntityPage from "@/src/app/components/knowledge-base/IndividualEntityPage";
import { AlertCircle, Loader2 } from "lucide-react";

export default function KnowledgeBaseDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isSparqlBased, setIsSparqlBased] = useState<boolean | null>(null);
  
  useEffect(() => {
    const determinePageType = async () => {
      setLoading(true);
      try {
        // First, check if it's an API-based page (NER, Resources) with detail config
        const detailMapperEntry = pageMapperConfig.PageMapper?.find(
          (m) => m.type === 'detail' && m.slug === slug
        );
        
        if (detailMapperEntry) {
          // Check if it's SPARQL-based by looking at the config
          const loadedConfig = await getDetailPageConfig(`/knowledge-base/${slug}`, slug);
          if (loadedConfig) {
            // If config has cardConfigFile, it's SPARQL-based
            if (loadedConfig.dataSource?.cardConfigFile) {
              setIsSparqlBased(true);
            } else {
              // API-based (NER, Resources)
              setIsSparqlBased(false);
              setConfig(loadedConfig);
            }
          } else {
            // Try to find card YAML file directly (SPARQL-based)
            const cardFiles = ['celltaxon_card.yaml', 'barcodedcellsample_card.yaml', 'LA_card.yaml'];
            const cardFile = cardFiles.find(f => f.includes(slug.replace('libraryaliquot', 'LA').replace('barcodedcellsample', 'barcodedcellsample').replace('celltaxon', 'celltaxon')));
            if (cardFile) {
              setIsSparqlBased(true);
            } else {
              setIsSparqlBased(false);
            }
          }
        } else {
          // Check for card YAML files (SPARQL-based entities)
          const cardSlugMap: Record<string, string> = {
            'celltaxon': 'celltaxon_card.yaml',
            'barcodedcellsample': 'barcodedcellsample_card.yaml',
            'libraryaliquot': 'LA_card.yaml',
          };
          
          if (cardSlugMap[slug]) {
            setIsSparqlBased(true);
          } else {
            setIsSparqlBased(false);
          }
        }
      } catch (err) {
        console.error(`Error determining page type for slug ${slug}:`, err);
        setIsSparqlBased(false);
      } finally {
        setLoading(false);
      }
    };
    
    if (slug) {
      determinePageType();
    }
  }, [slug]);
  
  if (loading || isSparqlBased === null) {
    return (
      <div className="kb-page-margin">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }
  
  // For SPARQL-based pages, use IndividualEntityPage
  if (isSparqlBased) {
    return <IndividualEntityPage />;
  }
  
  // For API-based pages (NER, Resources), use DynamicDetailPage
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
