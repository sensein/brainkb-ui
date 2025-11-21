"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { pageMapperConfig } from "@/src/app/components/pageMapperConfig";
import { getData } from "@/src/app/components/utils/getData";
import { normalizeSparqlBindings, processSparqlQueryResult } from "@/src/app/components/utils/helper";
import Link from "next/link";
import { Loader2, AlertCircle, ArrowLeft, ExternalLink, Database } from "lucide-react";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/src/app/components/ui/card";
import { Button } from "@/src/app/components/ui/button";

type BoxAdditionalProperty = {
  key: string;
  sparql_query?: string;
};

type BoxAdditionalInfo = {
  header?: string;
  is_iterable?: boolean;
  sparql_query?: string;
  properties?: BoxAdditionalProperty[];
};

type ExtractedBox = {
  cardtype: string;
  sparql_query?: string;
  slug?: string;
  name?: string;
  description?: string;
  box_additional_info?: BoxAdditionalInfo;
};

interface PageParams {
  slug: string;
  id: string;
}

interface QueryParameter {
  sparql_query: string;
}

type DataValue = string | Record<string, any> | Array<any>;
interface DataBucket {
  [key: string]: DataValue;
}
interface DataObject {
  [slug: string]: DataBucket;
}

type SparqlRow = Record<string, string>;

function replaceEntityIdInQuery(query: string, rawId: string) {
  const decodedId = decodeURIComponent(rawId);
  let q = query;

  if (q.includes('VALUES') && q.includes('<{0}>')) {
    const uri = decodedId.startsWith('<') && decodedId.endsWith('>') ? decodedId : `<${decodedId}>`;
    q = q.replace(/<\{0\}>/g, uri);
    return q;
  }
  return q.replace(/\{0\}/g, decodedId);
}

async function fetchBindings(queryParameter: QueryParameter) {
  try {
    const { postData } = await import('@/src/utils/api/api-client');
    const result = await postData<{ success: boolean; data: any[] }>('/api/entity-query', {
      sparql_query: queryParameter.sparql_query
    }, {
      useAuth: false,
    });
    
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }

    const directResponse = await getData(queryParameter);
    if (directResponse.status === "success" && directResponse.message?.results?.bindings) {
      return directResponse.message.results.bindings as any[];
    }
    return [];
  } catch (err) {
    console.error("Error fetching data:", err);
    try {
      const directResponse = await getData(queryParameter);
      if (directResponse.status === "success" && directResponse.message?.results?.bindings) {
        return directResponse.message.results.bindings as any[];
      }
    } catch (fallbackErr) {
      console.error("Fallback fetch also failed:", fallbackErr);
    }
    return [];
  }
}

function RenderValue({ value, currentId, currentSlug }: { value: any; currentId?: string; currentSlug?: string }) {
  const isIri = (s: any) => typeof s === 'string' && /^https?:\/\//i.test(s);
  const isUrn = (s: any) => typeof s === 'string' && (s.startsWith('urn:bkbit:') || s.startsWith('urn:'));

  if (Array.isArray(value)) {
    if (value.length === 0) return <em className="text-muted-foreground">none</em>;
    if (value.every(v => typeof v !== "object" || v === null)) {
      return <span>{value.join(", ")}</span>;
    }
    return (
      <div className="space-y-2">
        {value.map((row, i) => (
          <div key={i} className="rounded-md border p-3 bg-muted/20">
            {Object.entries(row).map(([k, v]) => (
              <div key={k} className="text-sm">
                <span className="font-medium">{k.replace(/_/g, ' ')}:</span>{" "}
                <RenderValue value={v} currentId={currentId} currentSlug={currentSlug} />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (value && typeof value === "object") {
    return (
      <div className="ml-2 space-y-1">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <span className="font-medium">{k.replace(/_/g, ' ')}:</span>{" "}
            <RenderValue value={v} currentId={currentId} currentSlug={currentSlug} />
          </div>
        ))}
      </div>
    );
  }

  // Check if it's a URN that should be clickable (parent node, etc.)
  if (isUrn(value)) {
    const valueStr = String(value);
    const decodedId = currentId ? decodeURIComponent(currentId) : '';
    const isEntityLink = valueStr !== decodedId;
    
    if (isEntityLink) {
      // Determine entity type from value or current slug
      let entitySlug = currentSlug || 'celltaxon';
      if (valueStr.startsWith('urn:bkbit:')) {
        entitySlug = 'celltaxon';
      } else if (valueStr.includes('http://example.org/NIMP/')) {
        if (valueStr.includes('BC-')) {
          entitySlug = 'barcodedcellsample';
        } else if (valueStr.includes('LI-')) {
          entitySlug = 'libraryaliquot';
        }
      }
      
      return (
        <Link
          href={`/knowledge-base/${entitySlug}/${encodeURIComponent(valueStr)}`}
          className="underline text-primary break-all hover:text-primary/80"
        >
          {valueStr}
        </Link>
      );
    }
  }

  if (isIri(value)) {
    return (
      <a
        className="underline text-primary break-all hover:text-primary/80"
        href={value}
        target="_blank"
        rel="noreferrer"
      >
        {value}
      </a>
    );
  }

  return <span>{String(value)}</span>;
}

function collapseNonIterableRows(rows: SparqlRow[]): DataValue {
  if (rows.length === 0) {
    return "";
  }

  if (rows.length === 1) {
    const obj = rows[0];
    const keys = Object.keys(obj);
    return keys.length === 1 ? obj[keys[0]] : obj;
  }

  return rows.map((row) => {
    const values = Object.values(row);
    return values.length === 1 ? String(values[0]) : JSON.stringify(row);
  });
}

// Auto-generate fields from data object
function generateFieldsFromData(data: any, excludeKeys: string[] = ['id', 'description']): any[] {
  if (!data || typeof data !== 'object') return [];
  
  return Object.entries(data)
    .filter(([key]) => !excludeKeys.includes(key))
    .filter(([_, value]) => {
      if (value == null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (Array.isArray(value) && value.length === 1 && value[0] && typeof value[0] === "object" && Object.keys(value[0]).length === 0) return false;
      return true;
    })
    .map(([key, value]) => {
      let fieldType: 'text' | 'object' | 'array' | 'url' = 'text';
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        fieldType = 'object';
      } else if (Array.isArray(value)) {
        fieldType = 'array';
      } else if (typeof value === 'object' && value !== null) {
        fieldType = 'object';
      } else if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
        fieldType = 'url';
      }

      return {
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        type: fieldType,
      };
    });
}

// Helper function to get nested value
function getNestedValue(obj: any, path: string | string[]): any {
  if (typeof path === 'string') {
    path = path.split('.');
  }
  return path.reduce((current, key) => current?.[key], obj);
}

// Helper function to get value
function getValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function IndividualEntityPage() {
  const params = useParams();
  const router = useRouter();
  if (!params) return <div>Loading...</div>;

  const { slug, id: rawId } = params as unknown as PageParams;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [mainCardTitle, setMainCardTitle] = useState("");
  const [mainCardDescription, setMainCardDescription] = useState("");
  const [extractedBoxes, setExtractedBoxes] = useState<ExtractedBox[]>([]);
  const [data, setData] = useState<DataObject>({});
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("summary");
  const [flattenedData, setFlattenedData] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const cardSlugMap: Record<string, string> = {
          'celltaxon': 'celltaxon_card.yaml',
          'barcodedcellsample': 'barcodedcellsample_card.yaml',
          'libraryaliquot': 'LA_card.yaml',
        };
        
        let filename = cardSlugMap[slug];
        
        if (!filename) {
          const page = pageMapperConfig.PageMapper?.find(
            (entry) => (entry.type === 'entity-detail' || entry.type === 'entity-list') && entry.slug === slug
          );
          filename = page ? page.filename : "";
        }

        if (!filename) {
          setMainCardTitle("");
          setMainCardDescription("");
          setExtractedBoxes([]);
          setError(`No card configuration found for slug: ${slug}`);
          return;
        }

        const model_data = await import(`@/src/config/yaml/${filename}`);
        const extracted_data = model_data.default;

        setMainCardTitle(extracted_data?.name || "");
        setMainCardDescription(extracted_data?.description || "");
        setExtractedBoxes(extracted_data?.boxes || []);
      } catch (err) {
        console.error("Failed to fetch YAML data:", err);
        setError(`Failed to load entity configuration for slug: ${slug}`);
      }
    };

    if (slug) {
      loadData();
    }
  }, [slug]);

  useEffect(() => {
    const fetchBoxData = async () => {
      const flatData: Record<string, any> = {
        id: id,
        description: mainCardDescription,
      };

      for (const box of extractedBoxes) {
        if (box.cardtype !== "card") continue;

        const slugKey = box.slug || "unknown";
        const nextBucket: DataBucket = {};

        if (box.sparql_query) {
          const mainQuery = replaceEntityIdInQuery(box.sparql_query, id);
          const mainBindings = await fetchBindings({ sparql_query: mainQuery });
          const formatted = await processSparqlQueryResult(mainBindings);
          Object.assign(nextBucket, formatted);
          Object.assign(flatData, formatted);
        }

        const add = box.box_additional_info;

        if (add) {
          const resolveRows = async (query: string): Promise<SparqlRow[]> => {
            const q = replaceEntityIdInQuery(query, id);
            const bindings = await fetchBindings({ sparql_query: q });
            return normalizeSparqlBindings(bindings, { shape: "rows" }) as SparqlRow[];
          };

          let sharedRows: SparqlRow[] | null = null;

          if (add.sparql_query && add.is_iterable) {
            sharedRows = await resolveRows(add.sparql_query);

            if (Array.isArray(add.properties) && add.properties.length === 1 && add.properties[0].key) {
              nextBucket[add.properties[0].key] = sharedRows;
              flatData[add.properties[0].key] = sharedRows;
            } else if (add.header) {
              const keyFromHeader = add.header.toLowerCase().replace(/\s+/g, "_");
              nextBucket[keyFromHeader] = sharedRows;
              flatData[keyFromHeader] = sharedRows;
            } else {
              nextBucket["additional_info_rows"] = sharedRows;
              flatData["additional_info_rows"] = sharedRows;
            }
          }

          if (Array.isArray(add.properties) && add.properties.length > 0) {
            for (const prop of add.properties) {
              let rows: SparqlRow[] | null = null;

              if (prop.sparql_query) {
                rows = await resolveRows(prop.sparql_query);
              } else if (sharedRows) {
                rows = sharedRows;
              }

              if (!rows) continue;

              const propKey = typeof prop.key === 'string' ? prop.key.trim() : String(prop.key || '');

              if (add.is_iterable) {
                nextBucket[propKey] = rows;
                flatData[propKey] = rows;
              } else {
                nextBucket[propKey] = collapseNonIterableRows(rows);
                flatData[propKey] = collapseNonIterableRows(rows);
              }
            }
          }
        }

        setData(prev => ({
          ...prev,
          [slugKey]: {
            ...(prev[slugKey] || {}),
            ...nextBucket
          }
        }));
      }

      setFlattenedData(flatData);
    };

    if (extractedBoxes.length > 0 && id) {
      fetchBoxData();
    }
  }, [extractedBoxes, id, mainCardDescription]);

  const isLoading = extractedBoxes.length === 0 || Object.keys(flattenedData).length === 0;

  if (error) {
    return (
      <div className="kb-page-margin">
        <div className="grid fix-left-margin grid-cols-1">
          <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">Error</h3>
                <p className="text-yellow-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="kb-page-margin">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
          <p className="text-gray-600">Loading details...may take up to one minute</p>
        </div>
      </div>
    );
  }

  // Get title from data or use mainCardTitle
  const title = flattenedData.Name || flattenedData.name || mainCardTitle || "Entity Details";
  const description = flattenedData.description || mainCardDescription || "";

  // Auto-generate fields from flattened data (preserve all original data)
  // Only exclude metadata fields, keep all SPARQL query results
  const summaryFields = generateFieldsFromData(flattenedData, ['id', 'description', 'contributed_by', 'created_at', 'updated_at', 'processedAt', 'history', 'version']);
  
  // Also preserve the original box-based data structure for reference
  const boxData = Object.values(data).reduce((acc, bucket) => ({ ...acc, ...bucket }), {});

  const renderField = (field: any) => {
    const value = getNestedValue(flattenedData, field.key);
    const decodedId = id ? decodeURIComponent(id) : '';
    
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Check if value is a URN that should be clickable (parent node, etc.)
    const valueStr = String(value);
    const isUrn = valueStr.startsWith('urn:bkbit:') || valueStr.startsWith('urn:');
    const isEntityLink = isUrn && valueStr !== decodedId;
    
    // Determine entity type from slug or value
    let entitySlug = slug;
    if (isUrn && valueStr.startsWith('urn:bkbit:')) {
      // URNs typically link to celltaxon
      entitySlug = 'celltaxon';
    } else if (typeof value === 'string' && value.includes('http://example.org/NIMP/')) {
      // NIMP URIs might link to barcodedcellsample or libraryaliquot
      if (value.includes('BC-')) {
        entitySlug = 'barcodedcellsample';
      } else if (value.includes('LI-')) {
        entitySlug = 'libraryaliquot';
      }
    }

    if (isEntityLink) {
      return (
        <Link
          href={`/knowledge-base/${entitySlug}/${encodeURIComponent(valueStr)}`}
          className="text-sm text-primary hover:underline flex items-center gap-1.5 break-all"
        >
          {valueStr}
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
        </Link>
      );
    }

    if (field.type === 'object') {
      return <RenderValue value={value} currentId={id} currentSlug={slug} />;
    }

    if (field.type === 'url' || (typeof value === 'string' && /^https?:\/\//i.test(value))) {
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline flex items-center gap-1.5 break-all"
        >
          {String(value)}
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
        </a>
      );
    }

    return <span className="text-sm text-foreground">{String(value)}</span>;
  };

  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "related-info", label: "Related Info" },
    { id: "contributors", label: "Contributors" },
    { id: "revision-history", label: "Revision History" },
  ];

  return (
    <div className="kb-page-margin">
      <div className="fix-left-margin max-w-[1600px]">
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            href={`/knowledge-base/${slug}`}
            className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {mainCardTitle || slug}
          </Link>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Tabbed Interface */}
        <Card className="overflow-hidden p-0">
          {/* Tab Navigation */}
          <div className="flex border-b bg-muted/30">
            {tabs.map((tab) => {
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
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <CardContent className="p-6">
            {activeTab === "summary" && (
              <div className="space-y-6">
                {/* Description Section - Show first if available */}
                {description && (
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold flex items-center gap-2 text-foreground mb-3">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      Description
                    </h3>
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <p className="text-sm text-foreground leading-relaxed">{description}</p>
                    </div>
                  </div>
                )}
                
                {/* Summary Section - All fields from SPARQL queries (preserves all original data) */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold flex items-center gap-2 text-foreground mb-3">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    Summary
                  </h3>
                  <div className="space-y-4">
                    {summaryFields.length > 0 ? (
                      summaryFields.map((field, idx) => {
                        const content = renderField(field);
                        if (!content) return null;
                        return (
                          <div key={idx} className="flex flex-col gap-1.5 border rounded-lg p-4 bg-muted/30">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {field.label}
                            </div>
                            <div className="min-h-[20px]">
                              {content}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "related-info" && (
              <div className="flex items-center justify-center py-12 text-muted-foreground rounded-lg border border-dashed">
                <div className="text-center">
                  <p className="text-sm">No related items available</p>
                </div>
              </div>
            )}

            {activeTab === "contributors" && (
              <div className="flex items-center justify-center py-12 text-muted-foreground rounded-lg border border-dashed">
                <div className="text-center">
                  <p className="text-sm">No contributor information available</p>
                </div>
              </div>
            )}

            {activeTab === "revision-history" && (
              <div className="flex items-center justify-center py-12 text-muted-foreground rounded-lg border border-dashed">
                <div className="text-center">
                  <p className="text-sm">No revision history available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
