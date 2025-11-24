"use client";
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import DynamicListPage from "@/src/app/components/data-display/DynamicListPage";
import { getListPageConfig } from "@/src/utils/config/page-config-loader";
import { ListPageConfig } from '@/src/types/page-config';
import yaml from "@/src/config/yaml/config-knowledgebases.yaml";
import { Loader2 } from "lucide-react";

export default function KnowledgeBaseSlugPage() {
  const params = useParams();
  const slug = params?.slug as string || 'default';

  // All hooks must be called unconditionally at the top
  const [pageConfig, setPageConfig] = useState<ListPageConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [sparqlConfig, setSparqlConfig] = useState<ListPageConfig | null>(null);

  // First try to get config from modular YAML files (for NER, Resources, etc.)
  useEffect(() => {
    const loadConfig = async () => {
      setConfigLoading(true);
      const config = await getListPageConfig(`/knowledge-base/${slug}`, slug);
      setPageConfig(config);
      setConfigLoading(false);
    };
    loadConfig();
  }, [slug]);

  // Fall back to SPARQL-based knowledge base config if modular config not found
  useEffect(() => {
    // Only load SPARQL config if pageConfig is null and not loading
    if (!configLoading && !pageConfig) {
      const page = yaml.pages.find((p) => p.slug === slug);
      
      // If no page found, try to use the default page
      const pageToUse = page || yaml.pages.find((p) => p.slug === 'default');
      
      if (!pageToUse || !pageToUse.sparql_query) {
        // If still no valid config, set null
        setSparqlConfig(null);
        return;
      }

      // Use the current slug for entity page links, or fallback to entitypageslug
      const entityPageSlug = pageToUse.slug !== 'default' ? pageToUse.slug : (pageToUse.entitypageslug || pageToUse.slug);
      
      const config: ListPageConfig = {
        title: pageToUse.page || "Knowledge Base",
        description: pageToUse.description || "Browse knowledge base entities.",
        route: `/knowledge-base/${pageToUse.slug}`,
        slug: pageToUse.slug,
        dataSource: {
          type: 'sparql',
          endpoint: '/api/knowledge-base',
          method: 'POST',
          params: {
            slug: pageToUse.slug,
            sparqlQuery: pageToUse.sparql_query, // Use the actual query from config
            entityPageSlug: entityPageSlug,
          },
          headersExtractor: (result: any) => {
            return Array.isArray(result.headers) ? result.headers : [];
          },
        },
        columns: [],
        itemsPerPage: 50,
        search: {
          enabled: true,
          placeholder: "Search across all columns...",
        },
      };
      
      setSparqlConfig(config);
    }
  }, [slug, configLoading, pageConfig]);

  // If found in modular YAML files, use it
  if (configLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
        <p className="text-gray-600">Loading configuration...</p>
      </div>
    );
  }

  if (pageConfig) {
    return <DynamicListPage config={pageConfig} />;
  }

  if (sparqlConfig) {
    return <DynamicListPage config={sparqlConfig} />;
  }

  // If no config found at all, show error
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-gray-600">No configuration found for slug: {slug}</p>
    </div>
  );
}
