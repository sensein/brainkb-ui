"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { pageMapperConfig } from "@/src/app/components/pageMapperConfig";
import { getData } from "@/src/app/components/utils/getData";
import { normalizeSparqlBindings, processSparqlQueryResult } from "@/src/app/components/utils/helper";
import Link from "next/link";
import { Loader2, AlertCircle, Info, Database } from "lucide-react";

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

function RenderValue({ value }: { value: any }) {
  const isIri = (s: any) => typeof s === 'string' && /^https?:\/\//i.test(s);

  if (Array.isArray(value)) {
    if (value.length === 0) return <em>none</em>;
    if (value.every(v => typeof v !== "object" || v === null)) {
      return <span>{value.join(", ")}</span>;
    }
    return (
      <div className="space-y-2">
        {value.map((row, i) => (
          <div key={i} className="rounded-md border p-3">
            {Object.entries(row).map(([k, v]) => (
              <div key={k} className="text-sm">
                <span className="font-medium">{k}:</span>{" "}
                <RenderValue value={v} />
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
            <span className="font-medium">{k}:</span>{" "}
            <RenderValue value={v} />
          </div>
        ))}
      </div>
    );
  }

  if (isIri(value)) {
    return (
      <a
        className="underline text-blue-700 break-all"
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

export default function IndividualEntityPage() {
  const params = useParams();
  if (!params) return <div>Loading...</div>;

  const { slug, id: rawId } = params as unknown as PageParams;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [mainCardTitle, setMainCardTitle] = useState("");
  const [mainCardDescription, setMainCardDescription] = useState("");
  const [extractedBoxes, setExtractedBoxes] = useState<ExtractedBox[]>([]);
  const [data, setData] = useState<DataObject>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Map slug to card YAML filename
        const cardSlugMap: Record<string, string> = {
          'celltaxon': 'celltaxon_card.yaml',
          'barcodedcellsample': 'barcodedcellsample_card.yaml',
          'libraryaliquot': 'LA_card.yaml',
        };
        
        // First try the slug map
        let filename = cardSlugMap[slug];
        
        // If not found, try pageMapperConfig
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
      for (const box of extractedBoxes) {
        if (box.cardtype !== "card") continue;

        const slugKey = box.slug || "unknown";
        const nextBucket: DataBucket = {};

        if (box.sparql_query) {
          const mainQuery = replaceEntityIdInQuery(box.sparql_query, id);
          const mainBindings = await fetchBindings({ sparql_query: mainQuery });
          const formatted = await processSparqlQueryResult(mainBindings);
          Object.assign(nextBucket, formatted);
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
            } else if (add.header) {
              const keyFromHeader = add.header.toLowerCase().replace(/\s+/g, "_");
              nextBucket[keyFromHeader] = sharedRows;
            } else {
              nextBucket["additional_info_rows"] = sharedRows;
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

              if (add.is_iterable) {
                nextBucket[prop.key] = rows;
              } else {
                nextBucket[prop.key] = collapseNonIterableRows(rows);
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
    };

    if (extractedBoxes.length > 0) {
      fetchBoxData();
    }
  }, [extractedBoxes, id]);

  const entityName = decodeURIComponent(id).substring(decodeURIComponent(id).lastIndexOf("/") + 1);
  const isLoading = extractedBoxes.length === 0 || Object.keys(data).length === 0;

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

  return (
    <div className="kb-page-margin">
      <div className="grid fix-left-margin grid-cols-1 gap-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
            <p className="text-gray-600">LOADING...may take up to one minute</p>
          </div>
        )}

        {!isLoading && extractedBoxes.length === 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">No Entity Cards Configured</h3>
                <p className="text-yellow-700">This entity type does not have any cards configured yet.</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && extractedBoxes.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {extractedBoxes.map((entitycards, index) => (
              entitycards.cardtype === "card" && (
                <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  <div className="bg-gradient-to-r from-sky-500 to-blue-500 p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <Info className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-white">
                        {entitycards.name || "Entity Information"}
                      </h2>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {entitycards.description && (
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        {entitycards.description}
                      </p>
                    )}
                    
                    <div className="bg-gradient-to-br from-gray-50 to-sky-50 p-6 rounded-lg border border-gray-200">
                      {data[entitycards.slug ?? "unknown"] ? (
                        <div className="space-y-4">
                          {Object.entries(data[entitycards.slug ?? "unknown"]).map(([key, value], idx) => {
                            if (
                              value == null ||
                              (typeof value === "string" && value.trim() === "") ||
                              (Array.isArray(value) &&
                                value.length === 1 &&
                                value[0] &&
                                typeof value[0] === "object" &&
                                Object.keys(value[0]).length === 0)
                            ) return null;

                            const label = key.replace(/_/g, " ");

                            if (typeof value === "string" && value.startsWith("urn:bkbit") && value !== decodeURIComponent(id)) {
                              return (
                                <div key={idx} className="pb-4 border-b border-gray-200 last:border-b-0 last:pb-0">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-1">
                                      <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                                        <Database className="w-4 h-4 text-sky-600" />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <dt className="text-sm font-semibold text-gray-900 mb-1 uppercase tracking-wide">
                                        {label}
                                      </dt>
                                      <dd className="text-base text-gray-700 break-words">
                                        <Link
                                          href={`/knowledge-base/celltaxon/${encodeURIComponent(value)}`}
                                          className="underline text-blue-700 break-all hover:text-blue-900"
                                        >
                                          {value}
                                        </Link>
                                      </dd>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={idx} className="pb-4 border-b border-gray-200 last:border-b-0 last:pb-0">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 mt-1">
                                    <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                                      <Database className="w-4 h-4 text-sky-600" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <dt className="text-sm font-semibold text-gray-900 mb-1 uppercase tracking-wide">
                                      {label}
                                    </dt>
                                    <dd className="text-base text-gray-700 break-words">
                                      <RenderValue value={value} />
                                    </dd>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">No data available</p>
                          <p className="text-sm text-gray-400 mt-1">This card does not have any data to display.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

