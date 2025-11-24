/**
 * Configuration types for dynamic list and detail pages
 */

export type DataSourceType = 'api-get' | 'sparql';

export interface ColumnConfig {
  key: string;
  label: string;
  render?: (value: any, item: any) => React.ReactNode;
  link?: {
    basePath: string;
    paramKey?: string; // defaults to 'id'
  };
}

export interface ListPageConfig {
  // Page metadata
  title: string;
  description: string;
  route: string; // e.g., '/knowledge-base/ner', '/knowledge-base/resources', '/knowledge-base'
  slug?: string; // Optional slug for dynamic routing
  
  // Data source configuration
  dataSource: {
    type: DataSourceType;
    endpoint: string; // API endpoint or environment variable name
    method?: 'GET' | 'POST';
    params?: Record<string, any>; // Additional params for API calls
    dataExtractor?: (data: any) => any[]; // Function to extract/transform data
    headersExtractor?: (data: any) => string[]; // For SPARQL results
  };
  
  // Table configuration
  columns: ColumnConfig[];
  itemsPerPage?: number;
  
  // Search configuration
  search?: {
    enabled: boolean;
    placeholder?: string;
    searchKey?: string; // Query param key for search
  };
  
  // Hero section
  hero?: {
    enabled: boolean;
    gradient?: string; // CSS gradient classes
  };
}

export interface DetailTabConfig {
  id: string;
  label: string;
  icon?: any; // Lucide icon component
  type?: 'default' | 'related' | 'provenance'; // Special tab types
  sections?: DetailSectionConfig[]; // Optional for special tab types
}

export interface DetailSectionConfig {
  title: string;
  icon?: any; // Lucide icon component
  layout?: 'default' | 'two-column' | 'table' | 'inline'; // Layout type for the section
  fields?: DetailFieldConfig[]; // Optional: if omitted, fields are auto-generated from data
}

export interface DetailFieldConfig {
  key: string | string[]; // Can be nested path like 'mentions.datasets'
  label: string;
  type?: 'text' | 'badge' | 'link' | 'array' | 'object' | 'date' | 'url';
  render?: (value: any, item: any) => React.ReactNode;
  badgeVariant?: 'default' | 'secondary' | 'outline';
  linkBasePath?: string; // For link type
  arraySeparator?: string; // For array type
}

export interface DetailPageConfig {
  // Page metadata
  title: string;
  route: string; // e.g., '/knowledge-base/ner', '/knowledge-base/resources'
  slug?: string; // Optional slug for dynamic routing
  backLink: string; // e.g., '/knowledge-base/ner', '/knowledge-base/resources'
  
  // Data source configuration
  dataSource: {
    type: DataSourceType;
    endpoint: string;
    method?: 'GET' | 'POST';
    idParam?: string; // Query param name for ID (default: 'id')
    dataExtractor?: (data: any) => any; // Function to extract/transform data
    cardConfigFile?: string; // For SPARQL-based pages: path to card YAML file (e.g., "barcodedcellsample_card.yaml")
    params?: Record<string, any>; // Additional params for API calls (e.g., sparqlQuery for SPARQL)
  };
  
  // Detail view configuration
  tabs: DetailTabConfig[];
  
  // Additional features
  showProvenance?: boolean;
  showRelated?: boolean;
  relatedConfig?: {
    title: string;
    fetchFunction?: (item: any) => Promise<any[]>;
  };
}

