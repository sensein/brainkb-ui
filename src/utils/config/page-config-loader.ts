/**
 * Utility to load and parse page configurations from YAML
 */
import { pageMapperConfig } from '@/src/app/components/pageMapperConfig';
import { ListPageConfig, DetailPageConfig } from '@/src/types/page-config';
import { Network, Database, BookOpen, Activity, FileText, MessageSquare, MapPin, User, Calendar, Tag as TagIcon, Package, Link as LinkIcon } from "lucide-react";
import { detailConfigMap } from './detail-config-imports';

// Icon mapping
const iconMap: Record<string, any> = {
  Network,
  Database,
  BookOpen,
  Activity,
  FileText,
  MessageSquare,
  MapPin,
  User,
  Calendar,
  Tag: TagIcon,
  Package,
  Link: LinkIcon,
};

// Helper function to extract resource data from nested structure
function extractResourceData(item: any) {
  const resourceData = item?.judged_structured_information?.judge_resource?.["1"]?.[0];
  if (!resourceData) return null;
  
  return {
    _id: item._id,
    name: resourceData.name,
    description: resourceData.description,
    type: resourceData.type,
    category: resourceData.category,
    target: resourceData.target,
    specific_target: resourceData.specific_target,
    mapped_target_concept: resourceData.mapped_target_concept,
    mapped_specific_target_concept: resourceData.mapped_specific_target_concept,
    url: resourceData.url,
    judge_score: resourceData.judge_score,
    mentions: resourceData.mentions,
    documentName: item.documentName,
    contributed_by: item.contributed_by,
    created_at: item.created_at,
    updated_at: item.updated_at,
    processedAt: item.processedAt,
    history: item.history,
    version: item.version
  };
}

// Data extractor mapping
const dataExtractors: Record<string, (item: any) => any> = {
  extractResourceData,
};

export async function getListPageConfig(route: string, slug?: string): Promise<ListPageConfig | null> {
  // First try to find in mapper for modular YAML files
  if (slug) {
    const mapperEntry = pageMapperConfig.PageMapper?.find(
      (m) => m.type === 'list' && m.slug === slug
    );
    
    if (mapperEntry && mapperEntry.filename) {
      try {
        const moduleData = await import(`@/src/config/yaml/${mapperEntry.filename}`);
        const pageConfig = moduleData.default;
        return buildListPageConfig(pageConfig);
      } catch (err) {
        console.error(`Failed to load ${mapperEntry.filename}:`, err);
      }
    }
  }
  
  // No fallback - all pages should be in page-mapper.yaml
  return null;
}

function buildListPageConfig(pageConfig: any): ListPageConfig {

  return {
    title: pageConfig.title,
    description: pageConfig.description,
    route: pageConfig.route,
    slug: pageConfig.slug,
    dataSource: {
      type: pageConfig.dataSource.type as 'api-get' | 'sparql',
      endpoint: pageConfig.dataSource.apiRoute || pageConfig.dataSource.endpoint, // Use API route, fallback to endpoint
      method: pageConfig.dataSource.method || 'GET',
      params: {
        ...pageConfig.dataSource.params,
        envVarName: pageConfig.dataSource.endpoint, // Store env var name for backend URL lookup
      },
      dataExtractor: pageConfig.dataSource.dataExtractor 
        ? dataExtractors[pageConfig.dataSource.dataExtractor]
        : undefined,
    },
    columns: (pageConfig.columns || []).map((col: any) => {
      // If linkPath is provided, use it; otherwise construct from route
      let linkBasePath = col.linkPath;
      if (!linkBasePath && pageConfig.slug) {
        linkBasePath = `/knowledge-base/${pageConfig.slug}`;
      } else if (!linkBasePath && pageConfig.route) {
        linkBasePath = pageConfig.route;
      }
      
      return {
        key: col.key,
        label: col.label,
        link: linkBasePath ? {
          basePath: linkBasePath,
        } : undefined,
        type: col.type,
        badgeVariant: col.badgeVariant,
      };
    }),
    itemsPerPage: pageConfig.itemsPerPage || 50,
    search: {
      enabled: pageConfig.search?.enabled !== false,
      placeholder: pageConfig.search?.placeholder,
    },
  };
}

export async function getDetailPageConfig(route: string, slug?: string): Promise<DetailPageConfig | null> {
  // First try to find in mapper for modular YAML files
  if (slug) {
    const mapperEntry = pageMapperConfig.PageMapper?.find(
      (m) => m.type === 'detail' && m.slug === slug
    );
    
    if (mapperEntry && mapperEntry.filename) {
      try {
        // Try static import map first
        let pageConfig = detailConfigMap[mapperEntry.filename];
        
        // If not in static map, try dynamic import
        if (!pageConfig) {
          const moduleData = await import(`@/src/config/yaml/${mapperEntry.filename}`);
          pageConfig = moduleData.default;
        }
        
        if (pageConfig) {
          return buildDetailPageConfig(pageConfig);
        } else {
          console.error(`No default export found in ${mapperEntry.filename}`);
        }
      } catch (err) {
        console.error(`Failed to load ${mapperEntry.filename}:`, err);
        // Log more details about the error
        if (err instanceof Error) {
          console.error(`Error message: ${err.message}`);
          console.error(`Error stack: ${err.stack}`);
        }
      }
    }
  }
  
  // No fallback - all pages should be in page-mapper.yaml
  return null;
}

function buildDetailPageConfig(pageConfig: any): DetailPageConfig {
  const dataSourceType = pageConfig.dataSource.type as 'api-get' | 'sparql';
  
  // Build dataSource config based on type
  const dataSource: any = {
    type: dataSourceType,
    endpoint: pageConfig.dataSource.apiRoute || pageConfig.dataSource.endpoint,
    method: pageConfig.dataSource.method || 'GET',
    idParam: pageConfig.dataSource.idParam || 'id',
  };

  // For SPARQL with card config files
  if (dataSourceType === 'sparql' && pageConfig.dataSource.cardConfigFile) {
    dataSource.cardConfigFile = pageConfig.dataSource.cardConfigFile;
  } else {
    // For API-based sources, add params for env var lookup
    dataSource.params = {
      envVarName: pageConfig.dataSource.endpoint,
    };
    dataSource.dataExtractor = pageConfig.dataSource.dataExtractor
      ? (rawData: any) => {
          const extractor = dataExtractors[pageConfig.dataSource.dataExtractor];
          if (extractor) {
            const resourceData = rawData?.judged_structured_information?.judge_resource?.["1"]?.[0];
            if (!resourceData) return null;
            return extractor(rawData);
          }
          return rawData;
        }
      : undefined;
  }

  return {
    title: pageConfig.title,
    route: pageConfig.route,
    slug: pageConfig.slug,
    backLink: pageConfig.backLink,
    dataSource,
    tabs: pageConfig.tabs.map((tab: any) => ({
      id: tab.id,
      label: tab.label,
      icon: tab.icon ? iconMap[tab.icon] : undefined,
      type: tab.type || 'default',
      sections: tab.sections ? tab.sections.map((section: any) => ({
        title: section.title,
        icon: section.icon ? iconMap[section.icon] : undefined,
        layout: section.layout || 'default',
        fields: section.fields.map((field: any) => ({
          key: field.key,
          label: field.label,
          type: field.type as any,
          badgeVariant: field.badgeVariant,
          linkBasePath: field.linkBasePath,
        })),
      })) : undefined,
    })),
    showProvenance: pageConfig.showProvenance !== false,
    showRelated: pageConfig.showRelated !== false,
    relatedConfig: pageConfig.relatedConfig ? {
      title: pageConfig.relatedConfig.title,
    } : undefined,
  };
}

