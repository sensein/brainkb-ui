"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/src/app/components/ui/card";
import { Button } from "@/src/app/components/ui/button";
import { Badge } from "@/src/app/components/ui/badge";
import { getValue } from "@/src/utils/data/transformers";
import { formatDateString as formatDate } from "@/src/utils/formatting/date";
import { ProvenanceTimeline } from "@/src/app/components/detail/ProvenanceTimeline";
import { ProvenancePanel } from "@/src/app/components/detail/ProvenancePanel";
import { DetailPageConfig } from '@/src/types/page-config';

interface DynamicDetailPageProps {
  config: DetailPageConfig;
}

// Helper function to normalize field values to arrays
function normalizeToArray(value: any): any[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

// Helper function to get nested value from object
function getNestedValue(obj: any, path: string | string[]): any {
  if (typeof path === 'string') {
    path = path.split('.');
  }
  return path.reduce((current, key) => current?.[key], obj);
}

// Helper function to check if a string is a URL
function isUrl(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Helper component to render ID as clickable link if it's a URL
function RenderId({ id }: { id: string }) {
  if (isUrl(id)) {
    return (
      <a
        href={id}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline break-all flex items-center gap-1 mt-1"
      >
        {id}
        <ExternalLink className="h-3 w-3 flex-shrink-0" />
      </a>
    );
  }
  return (
    <div className="text-xs text-muted-foreground mt-1 break-all">{id}</div>
  );
}

function EnhancedDetailsSection({ item, config, data }: { item: any; config: DetailPageConfig; data: any }) {
  const [activeTab, setActiveTab] = useState<string>(config.tabs[0]?.id || "summary");

  const renderCard = (title: string, icon: any, content: React.ReactNode, layout: string = 'default') => {
    const Icon = icon;
    const hasData = content !== null;

    return (
      <div className="space-y-4 mb-8">
        <h3 className="text-base font-semibold flex items-center gap-2 text-foreground mb-3">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {title}
        </h3>
        {hasData ? (
          <div className={layout === 'two-column' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}>
            {content}
          </div>
        ) : (
          <div className="flex items-center justify-center py-6 text-muted-foreground rounded-lg border border-dashed">
            <div className="text-center">
              {Icon && <Icon className="h-6 w-6 mx-auto mb-2 opacity-50" />}
              <p className="text-xs">No information available</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderField = (field: any, item: any) => {
    const value = getNestedValue(item, field.key);
    
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (field.render) {
      return field.render(value, item);
    }

    switch (field.type) {
      case 'badge':
        const badgeValues = normalizeToArray(value);
        return (
          <div className="flex flex-wrap gap-1.5">
            {badgeValues.map((v: any, idx: number) => (
              <Badge key={idx} variant={field.badgeVariant || 'secondary'} className="text-xs">
                {String(v)}
              </Badge>
            ))}
          </div>
        );

      case 'link':
        const linkValues = normalizeToArray(value);
        return (
          <div className="space-y-2">
            {linkValues.map((v: any, idx: number) => {
              const linkPath = field.linkBasePath 
                ? `${field.linkBasePath}/${encodeURIComponent(String(v))}`
                : String(v);
              return (
                <a
                  key={idx}
                  href={linkPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1.5 break-all"
                >
                  {String(v)}
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                </a>
              );
            })}
          </div>
        );

      case 'url':
        const urlValues = normalizeToArray(value);
        return (
          <div className="space-y-2">
            {urlValues.map((v: any, idx: number) => {
              const urlStr = String(v);
              // Handle DOI links specially
              if (field.linkBasePath && urlStr && !urlStr.startsWith('http')) {
                const fullUrl = `${field.linkBasePath}/${urlStr}`;
                return (
                  <a
                    key={idx}
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1.5 break-all"
                  >
                    {urlStr}
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  </a>
                );
              }
              return (
                <a
                  key={idx}
                  href={urlStr}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1.5 break-all"
                >
                  {urlStr}
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                </a>
              );
            })}
          </div>
        );

      case 'array':
        const arrayValues = normalizeToArray(value);
        return (
          <div className="space-y-1">
            {arrayValues.map((v: any, idx: number) => (
              <div key={idx} className="text-sm text-foreground">• {String(v)}</div>
            ))}
          </div>
        );

      case 'date':
        try {
          return <div className="text-sm text-foreground">{formatDate(String(value))}</div>;
        } catch {
          // If formatDate fails (e.g., not DD_MM_YYYY format), try ISO date format
          try {
            const date = new Date(String(value));
            return <div className="text-sm text-foreground">{date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>;
          } catch {
            return <div className="text-sm text-foreground">{String(value)}</div>;
          }
        }

      case 'object':
        if (typeof value === 'object' && !Array.isArray(value)) {
          return (
            <div className="space-y-2">
              {Object.entries(value).map(([k, v]: [string, any]) => {
                // Format key to be more readable (e.g., "mapped_target_concept" -> "Mapped Target Concept")
                const formattedKey = k
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase());
                
                // Check if value is a URL
                const isUrlValue = typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('http://purl.obolibrary.org/'));
                
                return (
                  <div key={k} className="text-sm">
                    <span className="font-medium text-muted-foreground">{formattedKey}:</span>{' '}
                    {isUrlValue ? (
                      <a
                        href={v}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1.5 inline-flex"
                      >
                        {v}
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-foreground">{String(v)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }
        // For arrays of objects, render each object
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          return (
            <div className="space-y-3">
              {value.map((obj: any, idx: number) => (
                <div key={idx} className="border rounded p-3 bg-muted/20">
                  {typeof obj === 'object' && !Array.isArray(obj) ? (
                    <div className="space-y-2">
                      {Object.entries(obj).map(([k, v]: [string, any]) => {
                        const formattedKey = k
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase());
                        const isUrlValue = typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('http://purl.obolibrary.org/'));
                        return (
                          <div key={k} className="text-sm">
                            <span className="font-medium text-muted-foreground">{formattedKey}:</span>{' '}
                            {isUrlValue ? (
                              <a
                                href={v}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1.5 inline-flex"
                              >
                                {v}
                                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                              </a>
                            ) : (
                              <span className="text-foreground">{String(v)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-sm text-foreground">{String(obj)}</span>
                  )}
                </div>
              ))}
            </div>
          );
        }
        return <div className="text-sm text-foreground">{JSON.stringify(value)}</div>;

      default:
        const textValue = String(value);
        // Check if it's a URL
        if (isUrl(textValue)) {
          return (
            <a
              href={textValue}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1.5 break-all"
            >
              {textValue}
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
            </a>
          );
        }
        // For long text (like descriptions), render as paragraph
        if (textValue.length > 100) {
          return <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{textValue}</p>;
        }
        return <span className="text-sm text-foreground">{textValue}</span>;
    }
  };

  const activeTabConfig = config.tabs.find(tab => tab.id === activeTab);

  // Render special tab types
  const renderSpecialTab = (tab: any) => {
    if (tab.type === 'related') {
      return (
        <div className="space-y-4">
          {config.relatedConfig?.fetchFunction ? (
            <div className="text-sm text-muted-foreground py-2">
              Loading related items...
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground rounded-lg border border-dashed">
              <div className="text-center">
                <p className="text-sm">No related items available</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (tab.type === 'provenance') {
      if (data.history && Array.isArray(data.history) && data.history.length > 0) {
        return (
          <div className="space-y-4">
            <ProvenanceTimeline history={data.history} />
            <ProvenancePanel 
              history={data.history} 
              entityType={(config.route.includes('ner') ? 'ner' : config.route.includes('resource') ? 'resource' : undefined) as 'ner' | 'resource' | undefined} 
            />
          </div>
        );
      }
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground rounded-lg border border-dashed">
          <div className="text-center">
            <p className="text-sm">No revision history available</p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="overflow-hidden p-0">
      {/* Tab Navigation */}
      <div className="flex border-b bg-muted/30">
        {config.tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all ${
                isActive
                  ? "border-b-2 border-primary text-primary bg-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <CardContent className="p-6">
        {activeTabConfig && (
          <>
            {activeTabConfig.type === 'related' || activeTabConfig.type === 'provenance' ? (
              renderSpecialTab(activeTabConfig)
            ) : (
              <div className="space-y-6">
                {activeTabConfig.sections?.map((section, sectionIdx) => {
                  const sectionFields = section.fields
                    .map(field => ({
                      field,
                      content: renderField(field, item)
                    }))
                    .filter(({ content }) => content !== null);

                  if (sectionFields.length === 0) {
                    return null;
                  }

                  const layout = section.layout || 'default';

                  // Render based on layout type
                  let sectionContent: React.ReactNode;
                  
                  if (layout === 'table') {
                    // Table-like layout for categorization fields
                    // Each field in its own box
                    const isSingleField = sectionFields.length === 1;
                    sectionContent = (
                      <div className={`${isSingleField ? '' : 'grid grid-cols-1 md:grid-cols-3 gap-4'}`}>
                        {sectionFields.map(({ field, content }, fieldIdx) => (
                          <div key={fieldIdx} className={`flex flex-col gap-1.5 border rounded-lg p-4 bg-muted/30 ${isSingleField ? 'w-full' : ''}`}>
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {field.label}
                            </div>
                            <div className={`min-h-[20px] ${isSingleField ? 'text-sm leading-relaxed' : ''}`}>
                              {content}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  } else if (layout === 'two-column') {
                    // Two-column layout - each field in its own box
                    sectionContent = (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {sectionFields.map(({ field, content }, fieldIdx) => (
                          <div key={fieldIdx} className="flex flex-col gap-1.5 border rounded-lg p-4 bg-muted/30">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {field.label}
                            </div>
                            <div className="min-h-[20px]">
                              {content}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  } else if (layout === 'inline') {
                    // Inline layout for badges/tags
                    sectionContent = (
                      <div className="flex flex-wrap gap-2">
                        {sectionFields.map(({ field, content }, fieldIdx) => (
                          <div key={fieldIdx}>
                            {content}
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    // Default vertical layout - each field in its own box
                    sectionContent = (
                      <div className="space-y-4">
                        {sectionFields.map(({ field, content }, fieldIdx) => (
                          <div key={fieldIdx} className="flex flex-col gap-1.5 border rounded-lg p-4 bg-muted/30">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {field.label}
                            </div>
                            <div className="min-h-[20px]">
                              {content}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return renderCard(
                    section.title,
                    section.icon,
                    sectionContent,
                    layout
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DynamicDetailPage({ config }: DynamicDetailPageProps) {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const id = Array.isArray(params.id) ? params.id[0] : params.id;
        if (!id) {
          throw new Error('ID parameter is required');
        }

        const decodedId = decodeURIComponent(id as string);
        const { dataSource } = config;
        let result: any;

        if (dataSource.type === 'api-get') {
          // Get the API route (e.g., "/api/ner/withouttoken")
          const apiRoute = dataSource.endpoint.startsWith('/api/') 
            ? dataSource.endpoint 
            : `/api/${dataSource.endpoint}`;
          
          // Get the backend endpoint URL from environment variable
          const envVarName = (dataSource.params as any)?.envVarName || dataSource.endpoint;
          
          // Use the env config manager to resolve the env var by name
          const { clientEnv } = await import('@/src/config/env');
          const backendEndpoint = clientEnv.resolveEnvVar(envVarName);
          
          if (!backendEndpoint) {
            throw new Error(`${envVarName} environment variable is not set`);
          }

          const { fetchPaginatedDataWithoutToken } = await import('@/src/utils/api/api-client-without-token');
          
          result = await fetchPaginatedDataWithoutToken({
            endpoint: apiRoute,
            limit: '1',
            skip: '0',
            params: { 
              endpoint: backendEndpoint,
              [dataSource.idParam || 'id']: decodedId 
            },
          }) as { success: boolean; data?: any; error?: string };

          if (result.success) {
            let rawData;
            if (result.data && !Array.isArray(result.data)) {
              rawData = result.data;
            } else if (Array.isArray(result.data) && result.data.length > 0) {
              rawData = result.data[0];
            } else {
              throw new Error('Item not found');
            }

            // Apply data extractor if provided
            const extractedData = dataSource.dataExtractor 
              ? dataSource.dataExtractor(rawData)
              : rawData;

            setData(extractedData);
          } else {
            throw new Error(result.error || 'Invalid response format');
          }
        } else {
          // For other types, use direct fetch
          const url = new URL(dataSource.endpoint.startsWith('/api/') 
            ? dataSource.endpoint 
            : `/api/${dataSource.endpoint}`, 
            typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
          );
          url.searchParams.set(dataSource.idParam || 'id', decodedId);

          const response = await fetch(url.toString(), {
            method: dataSource.method || 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `API returned ${response.status}`);
          }

          result = await response.json();

          if (result.success) {
            let rawData;
            if (result.data && !Array.isArray(result.data)) {
              rawData = result.data;
            } else if (Array.isArray(result.data) && result.data.length > 0) {
              rawData = result.data[0];
            } else {
              throw new Error('Item not found');
            }

            const extractedData = dataSource.dataExtractor 
              ? dataSource.dataExtractor(rawData)
              : rawData;

            setData(extractedData);
          } else {
            throw new Error(result.error || 'Invalid response format');
          }
        }
      } catch (e) {
        const err = e as Error;
        console.error("DynamicDetailPage: Error fetching:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchDetail();
    }
  }, [params.id, config]);

  if (loading) {
    return (
      <div className="kb-page-margin">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
          <p className="text-gray-600">Loading details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="kb-page-margin">
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Loading Data</h3>
              <p className="text-red-700">{error || 'Item not found'}</p>
            </div>
          </div>
        </div>
        <Link 
          href={config.backLink}
          className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {config.title}
        </Link>
      </div>
    );
  }

  // Get title and description from data
  const titleField = config.tabs[0]?.sections[0]?.fields[0]?.key || 'name';
  const title = getValue(getNestedValue(data, titleField));
  const descriptionField = config.tabs[0]?.sections[0]?.fields.find(f => f.key === 'description')?.key;
  const description = descriptionField ? getValue(getNestedValue(data, descriptionField)) : title;

  return (
    <div className="kb-page-margin">
      <div className="fix-left-margin max-w-[1600px]">
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            href={config.backLink}
            className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {config.title}
          </Link>
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {Array.isArray(title) ? title[0] : title}
          </h1>
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Layout */}
        <div className="space-y-6">
          {/* Tabbed Details Section - Full Width */}
          <div className="min-w-0">
            <EnhancedDetailsSection item={data} config={config} data={data} />
          </div>

          {/* Footer */}
          <div className="mt-8 flex w-full items-center justify-between pt-6 border-t">
            <div className="text-xs text-muted-foreground">
              {/* left empty intentionally */}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
                Suggest correction
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

