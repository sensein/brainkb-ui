"use client";
import SideBarKBFromConfig from "../../../components/SideBarKBFromConfig";
import {useEffect, useState} from "react";
import enititycardmapperconfig from '../../../components/enititycardmapper.yaml';
import {getData} from "../../../components/getData";
import { processSparqlQueryResult } from "../../../components/helper";

import { useParams } from "next/navigation";

/** ---------- Types ---------- */
type BoxAdditionalProperty = {
  key: string;
  sparql_query?: string; // optional if using shared query on box_additional_info
};

type BoxAdditionalInfo = {
  header?: string;
  is_iterable?: boolean;
  sparql_query?: string;     // shared query that returns row objects (variables)
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

// value can be string | object | array
type DataValue = string | Record<string, any> | Array<any>;
interface DataBucket {
  [key: string]: DataValue;
}
interface DataObject {
  [slug: string]: DataBucket;
}

interface EntityViewCard {
  slug: string;
  filename: string;
}

/** ---------- Small helpers ---------- */

// Replace <{0}> or {0} with the decoded entity IRI, preserving angle-brackets when needed
function replaceEntityIdInQuery(query: string, rawId: string) {
  const decodedId = decodeURIComponent(rawId);
  let q = query;

  if (q.includes('VALUES') && q.includes('<{0}>')) {
    const uri = decodedId.startsWith('<') && decodedId.endsWith('>') ? decodedId : `<${decodedId}>`;
    q = q.replace(/<\{0\}>/g, uri);
    return q;
  }
  // Generic replacement — if your query expects a bare IRI in angle brackets, caller should include them
  return q.replace(/\{0\}/g, decodedId);
}

// Convert SPARQL JSON result bindings -> array of row objects { varName: value }
function bindingsToObjects(bindings: any[]): Array<Record<string, string>> {
  const isSet = (x: any) =>
    x != null && !(typeof x === "string" && x.trim() === "");

  return (bindings ?? []).map((b: any) => {
    const row: Record<string, string> = {};
    Object.entries(b).forEach(([k, v]: [string, any]) => {
      // SPARQL JSON shape { type, value, ... } -> prefer .value if present
      const raw = (v && typeof v === "object" && "value" in v) ? v.value : v;

      if (isSet(raw)) {
        row[k.replace(/_/g, " ")] = String(raw);
      }
      // else: skip adding this key entirely
    });
    return row;
  });
}
// Fetch -> return raw bindings
async function fetchBindings(queryParameter: QueryParameter) {
  try {
    const response = await getData(queryParameter);
    if (response.status === "success" && response.message?.results?.bindings) {
      return response.message.results.bindings as any[];
    }
    return [];
  } catch (err) {
    console.error("Error fetching data:", err);
    return [];
  }
}

function LoadingSpinner({ label = "Loading data..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-500" role="status" aria-live="polite">
      <svg
        className="h-5 w-5 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path
          className="opacity-75"
          d="M4 12a8 8 0 018-8"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span>{label}</span>
    </div>
  );
}

/** ---------- Pretty value renderer ---------- */
function RenderValue({ value }: { value: any }) {
  // Linkify IRIs
  const isIri = (s: any) => typeof s === 'string' && /^https?:\/\//i.test(s);

  if (Array.isArray(value)) {
    if (value.length === 0) return <em>none</em>;
    // Array of primitives
    if (value.every(v => typeof v !== "object" || v === null)) {
      return <span>{value.join(", ")}</span>;
    }
    // Array of objects -> render each as a small bordered card
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

/** ---------- Page ---------- */
const IndividualEntityPage = () => {
  const params = useParams();
  if (!params) return <div>Loading...</div>;

  const {slug, id: rawId} = params as unknown as PageParams;
  const id = Array.isArray(rawId) ? rawId[0] : rawId; // Ensure id is always a string

  const [mainCardTitle, setMainCardTitle] = useState("");
  const [mainCardDescription, setMainCardDescription] = useState("");
  const [extractedBoxes, setExtractedBoxes] = useState<ExtractedBox[]>([]);
  const [data, setData] = useState<DataObject>({});
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const page = (enititycardmapperconfig as any).EntityViewCardsMaper.find((page: EntityViewCard) => page.slug === slug);
      const filename = page ? page.filename : "";
      const model_data = await import(`../../../components/${filename}`);
      const extracted_data = model_data.default;

      setMainCardTitle(extracted_data?.name || "");
      setMainCardDescription(extracted_data?.description || "");
      setExtractedBoxes(extracted_data?.boxes || []);
    } catch (error) {
      console.error("Failed to fetch YAML data:", error);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    const fetchBoxData = async () => {
      const decoded = decodeURIComponent(id);

      for (const box of extractedBoxes) {
        if (box.cardtype !== "card") continue;

        const slugKey = box.slug || "unknown";
        const nextBucket: DataBucket = {};

        /** --- 1) Main box query -> flatten to key/value via your helper --- */
        if (box.sparql_query) {
          const mainQuery = replaceEntityIdInQuery(box.sparql_query, id);
          const mainBindings = await fetchBindings({ sparql_query: mainQuery });
          const formatted = await processSparqlQueryResult(mainBindings); // your existing helper
          Object.assign(nextBucket, formatted);
        }

        /** --- 2) box_additional_info support --- */
        const add = box.box_additional_info;

        if (add) {
          // 2A: Shared query (Option B) → returns multi-column rows once
          if (add.sparql_query && add.is_iterable) {
            const q = replaceEntityIdInQuery(add.sparql_query, id);
            const bindings = await fetchBindings({ sparql_query: q });
            const rows = bindingsToObjects(bindings);

            // Heuristic: if exactly one property provided, store array under that key (e.g., "abbreviations")
            // Else, store under a sensible name
            if (add.properties && add.properties.length === 1 && add.properties[0].key) {
              nextBucket[add.properties[0].key] = rows;
            } else if (add.header) {
              // header present → kebab it as a key
              const keyFromHeader = add.header.toLowerCase().replace(/\s+/g, "_");
              nextBucket[keyFromHeader] = rows;
            } else {
              nextBucket["additional_info_rows"] = rows;
            }
          }

          // 2B: Per-property queries (Option A)
          if (add.properties && add.properties.length > 0) {
            for (const prop of add.properties) {
              if (!prop.sparql_query) continue; // skip if this prop is provided by the shared query
              const q = replaceEntityIdInQuery(prop.sparql_query, id);
              const bindings = await fetchBindings({ sparql_query: q });
              const rows = bindingsToObjects(bindings);

              if (add.is_iterable) {
                // An iterable list → keep as array of objects
                nextBucket[prop.key] = rows;
              } else {
                // Non-iterable → collapse to a single value if possible
                if (rows.length === 0) {
                  nextBucket[prop.key] = "";
                } else if (rows.length === 1) {
                  // If the row has one column, use that value directly; else keep the object
                  const obj = rows[0];
                  const keys = Object.keys(obj);
                  nextBucket[prop.key] = keys.length === 1 ? obj[keys[0]] : obj;
                } else {
                  // Multiple rows but not iterable → join stringy values
                  nextBucket[prop.key] = rows.map(r => {
                    const vals = Object.values(r);
                    return vals.length === 1 ? String(vals[0]) : JSON.stringify(r);
                  });
                }
              }
            }
          }
        }

        // Merge this box bucket into data[slug]
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

  return (
    <div className="kb-page-margin">
      <SideBarKBFromConfig/>
      <div className="grid fix-left-margin grid-cols-1">
        <div className="w-full bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-4">
            {/* <h2 className="text-xl font-bold">
              {decodeURIComponent(id).substring(decodeURIComponent(id).lastIndexOf("/") + 1)}
            </h2> */}
            <p className="text-gray-700">{mainCardDescription}</p>
          </div>

          <div className="p-4 border-t border-gray-200 flex">
            {extractedBoxes.map((entitycards, index) => (
              <div key={index} className="text-gray-700 text-base space-x-4 w-full">
                {entitycards.cardtype === "card" && (
                  <div className="w-full bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="bg-gray-400 p-4">
                      <h2 className="text-white text-xl font-bold">
                        {entitycards.name}
                      </h2>
                    </div>

                    <div className="p-4">
                      <p className="text-gray-700 mb-4">{entitycards.description}</p>

                      <div className="bg-white p-4 rounded-lg border border-gray-300">
                        {data[entitycards.slug ?? "unknown"] ? (
                          Object.entries(data[entitycards.slug ?? "unknown"]).map(([key, value], idx) => {
                            if (value == null || 
                              (typeof value === "string" && value.trim() === "") ||
                              (value.length === 1 &&
                                value[0] &&
                                typeof value[0] === "object" &&
                                Object.keys(value[0]).length === 0)) return null; // skip unset/empty values
                            return (
                              <div key={idx} className="mb-3">
                                <div className="font-semibold mb-1">{key.replace(/_/g, " ")}:</div>
                                <RenderValue value={value} />
                              </div>
                            );
                          })
                        ) : (
                          <LoadingSpinner />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default IndividualEntityPage;
