"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  Card,
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
  // If path is a URI (starts with http:// or https://), access directly
  if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) {
    return obj?.[path];
  }
  
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

// Helper function to determine if a URI/URN is an entity identifier (clickable to entity detail page)
function isEntityIdentifier(value: string): { isEntity: boolean; entitySlug?: string } {
  const valueStr = String(value);
  
  // Check for URNs
  if (valueStr.startsWith('urn:bkbit:') || valueStr.startsWith('urn:')) {
    if (valueStr.startsWith('urn:bkbit:')) {
      return { isEntity: true, entitySlug: 'celltaxon' };
    }
    // For other URNs, default to celltaxon
    return { isEntity: true, entitySlug: 'celltaxon' };
  }
  
  // Check for NIMP URIs (entity identifiers)
  if (valueStr.includes('http://example.org/NIMP/')) {
    if (valueStr.includes('BC-')) {
      return { isEntity: true, entitySlug: 'barcodedcellsample' };
    } else if (valueStr.includes('LI-')) {
      return { isEntity: true, entitySlug: 'libraryaliquot' };
    }
    // For other NIMP URIs, try to determine from pattern or default
    return { isEntity: true, entitySlug: 'barcodedcellsample' }; // Default fallback
  }
  
  return { isEntity: false };
}

// Render value with URN link handling for SPARQL-based entities
function RenderValue({ value, currentId, currentSlug }: { value: any; currentId?: string; currentSlug?: string }) {
  const isIri = (s: any) => typeof s === 'string' && /^https?:\/\//i.test(s);
  const isUrn = (s: any) => typeof s === 'string' && (s.startsWith('urn:bkbit:') || s.startsWith('urn:'));

  if (Array.isArray(value)) {
    if (value.length === 0) return <em className="text-muted-foreground">none</em>;
    // If array contains simple values (strings, numbers), render with entity link detection
    if (value.every(v => typeof v !== "object" || v === null)) {
      return (
        <div className="space-y-1">
          {value.map((v, idx) => {
            const valueStr = String(v);
            const decodedId = currentId ? decodeURIComponent(currentId) : '';
            
            // Check if it's an entity identifier
            const entityInfo = isEntityIdentifier(valueStr);
            if (entityInfo.isEntity && valueStr !== decodedId) {
              const entitySlug = entityInfo.entitySlug || currentSlug || 'celltaxon';
              const friendlyText = getFriendlyTextFromUrl(valueStr);
              return (
                <div key={idx}>
                  <Link
                    href={`/knowledge-base/${entitySlug}/${encodeURIComponent(valueStr)}`}
                    className="underline text-primary hover:text-primary/80"
                    title={valueStr}
                  >
                    {friendlyText}
                  </Link>
                </div>
              );
            }
            
            // Check if it's a regular URL
            if (isIri(valueStr)) {
              const friendlyText = getFriendlyTextFromUrl(valueStr);
              return (
                <div key={idx}>
                  <a
                    className="underline text-primary hover:text-primary/80"
                    href={valueStr}
                    target="_blank"
                    rel="noreferrer"
                    title={valueStr}
                  >
                    {friendlyText}
                  </a>
                </div>
              );
            }
            
            return <div key={idx}>{valueStr}</div>;
          })}
        </div>
      );
    }
    // If array contains objects, render each as a structured block
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

  const valueStr = String(value);
  const decodedId = currentId ? decodeURIComponent(currentId) : '';
  
  // Check if it's an entity identifier (URN or entity URI) that should be clickable
  // This handles parent node, wasDerivedFrom, and other entity references
  const entityInfo = isEntityIdentifier(valueStr);
  if (entityInfo.isEntity && valueStr !== decodedId) {
    const entitySlug = entityInfo.entitySlug || currentSlug || 'celltaxon';
    const friendlyText = getFriendlyTextFromUrl(valueStr);
    return (
      <Link
        href={`/knowledge-base/${entitySlug}/${encodeURIComponent(valueStr)}`}
        className="underline text-primary hover:text-primary/80"
        title={valueStr}
      >
        {friendlyText}
      </Link>
    );
  }

  // Check if it's a regular HTTP/HTTPS URL (external link)
  if (isIri(value)) {
    const friendlyText = getFriendlyTextFromUrl(valueStr);
    return (
      <a
        className="underline text-primary hover:text-primary/80"
        href={value}
        target="_blank"
        rel="noreferrer"
        title={valueStr}
      >
        {friendlyText}
      </a>
    );
  }

  return <span>{String(value)}</span>;
}

// Helper function to convert predicate URI to human-friendly label
function humanizePredicate(uri: string): string {
  if (!uri || typeof uri !== 'string') return uri;
  
  // Common predicate mappings
  const predicateMap: Record<string, string> = {
    'http://www.w3.org/ns/prov#wasDerivedFrom': 'Was Derived From',
    'http://www.w3.org/2000/01/rdf-schema#label': 'Label',
    'https://w3id.org/biolink/vocab/category': 'Category',
    'https://identifiers.org/brain-bican/vocab/number_of_expected_cells': 'Number of Expected Cells',
  };
  
  if (predicateMap[uri]) {
    return predicateMap[uri];
  }
  
  // Extract from URI patterns
  if (uri.includes('#')) {
    const fragment = uri.split('#').pop() || '';
    // Convert camelCase to Title Case
    return fragment
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  if (uri.includes('/')) {
    const lastPart = uri.split('/').pop() || '';
    // Remove common prefixes
    const cleaned = lastPart
      .replace(/^bican:/, '')
      .replace(/^prov:/, '')
      .replace(/^rdfs:/, '');
    
    // Convert snake_case or camelCase to Title Case
    return cleaned
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  // Fallback: just capitalize first letter
  return uri.replace(/^./, str => str.toUpperCase());
}

// Helper function to extract human-friendly display text from a URL/URI
function getFriendlyTextFromUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  
  // For NIMP URIs (entity identifiers): extract the ID part
  // e.g., http://example.org/NIMP/EC-TSKONG488712 -> EC-TSKONG488712
  if (url.includes('http://example.org/NIMP/')) {
    const idPart = url.split('http://example.org/NIMP/').pop() || '';
    return idPart || url;
  }
  
  // For URNs: show the full URN but shortened if too long
  if (url.startsWith('urn:')) {
    if (url.length > 50) {
      return url.substring(0, 47) + '...';
    }
    return url;
  }
  
  // For URLs with fragments (e.g., http://www.w3.org/ns/prov#wasDerivedFrom)
  if (url.includes('#')) {
    const fragment = url.split('#').pop() || '';
    // Convert camelCase to readable text
    return fragment
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim() || url;
  }
  
  // For URLs ending with identifiers (e.g., .../vocab/BarcodedCellSample)
  if (url.includes('/')) {
    const lastPart = url.split('/').pop() || '';
    // If it's a meaningful identifier (not empty, not just a path segment)
    if (lastPart && lastPart.length > 1 && !lastPart.match(/^\d+$/)) {
      // Convert snake_case or camelCase to readable text
      return lastPart
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim() || url;
    }
  }
  
  // Fallback: return as is (but could be shortened if too long)
  if (url.length > 60) {
    return url.substring(0, 57) + '...';
  }
  return url;
}

// Auto-generate fields from data object
function generateFieldsFromData(data: any, excludeKeys: string[] = ['id', 'description']): any[] {
  if (!data || typeof data !== 'object') return [];
  
  const isUrn = (s: string) => s.startsWith('urn:bkbit:') || s.startsWith('urn:');
  const isUrl = (s: string) => /^https?:\/\//i.test(s);
  
  // Define preferred field order (subject should come first)
  const preferredOrder = ['subject', 'category_type'];
  
  const fields = Object.entries(data)
    .filter(([key]) => !excludeKeys.includes(key))
    .filter(([_, value]) => {
      // Filter out null, undefined, empty strings, and empty arrays
      if (value == null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (Array.isArray(value) && value.length === 1 && value[0] && typeof value[0] === "object" && Object.keys(value[0]).length === 0) return false;
      return true;
    })
    .map(([key, value]) => {
      // Determine field type based on value
      let fieldType: 'text' | 'object' | 'array' | 'url' = 'text';
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        fieldType = 'object';
      } else if (Array.isArray(value)) {
        fieldType = 'array';
      } else if (typeof value === 'object' && value !== null) {
        fieldType = 'object';
      } else if (typeof value === 'string') {
        if (isUrl(value)) {
          fieldType = 'url';
        } else if (isUrn(value)) {
          // Keep as 'text' type - URN detection will happen in renderField default case
          fieldType = 'text';
        }
      }

      // Generate human-friendly label
      let label: string;
      if (isUrl(key)) {
        // If key is a URI (predicate), convert to human-friendly format
        label = humanizePredicate(key);
      } else {
        // Regular field name formatting
        label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      }

      // Determine order: subject first, then category_type, then predicates (by label), then others
      let order = 999;
      if (key === 'subject') {
        order = 0;
      } else if (key === 'category_type') {
        order = 1;
      } else if (isUrl(key)) {
        // Predicates come after subject and category_type, sorted by label
        order = 100 + label.localeCompare(''); // Will be sorted by label later
      } else {
        order = 200; // Other fields come last
      }

      return {
        key,
        label,
        type: fieldType,
        order,
      };
    })
    .sort((a, b) => {
      // Sort by order first
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      // For predicates (order 100+), sort by label alphabetically
      if (a.order >= 100 && a.order < 200) {
        return a.label.localeCompare(b.label);
      }
      // For other fields, sort by key
      return a.key.localeCompare(b.key);
    })
    .map(({ order, ...field }) => field); // Remove order property from final result
  
  return fields;
}


function EnhancedDetailsSection({ item, config, data, currentId, currentSlug }: { item: any; config: DetailPageConfig; data: any; currentId?: string; currentSlug?: string }) {
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
              const friendlyText = getFriendlyTextFromUrl(urlStr);
              // Handle DOI links specially
              if (field.linkBasePath && urlStr && !urlStr.startsWith('http')) {
                const fullUrl = `${field.linkBasePath}/${urlStr}`;
                return (
                  <a
                    key={idx}
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1.5"
                    title={urlStr}
                  >
                    {friendlyText}
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
                  className="text-sm text-primary hover:underline flex items-center gap-1.5"
                  title={urlStr}
                >
                  {friendlyText}
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
            {arrayValues.map((v: any, idx: number) => {
              const valueStr = String(v);
              const decodedId = currentId ? decodeURIComponent(currentId) : '';
              
              // Check if it's an entity identifier (URN or entity URI) that should be clickable
              const entityInfo = isEntityIdentifier(valueStr);
              if (entityInfo.isEntity && valueStr !== decodedId) {
                const entitySlug = entityInfo.entitySlug || currentSlug || 'celltaxon';
                const friendlyText = getFriendlyTextFromUrl(valueStr);
                return (
                  <div key={idx} className="text-sm text-foreground">
                    <Link
                      href={`/knowledge-base/${entitySlug}/${encodeURIComponent(valueStr)}`}
                      className="text-primary hover:underline flex items-center gap-1.5 inline"
                      title={valueStr}
                    >
                      {friendlyText}
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                    </Link>
                  </div>
                );
              }
              
              // Check if it's a regular HTTP/HTTPS URL (external link)
              if (isUrl(valueStr)) {
                const friendlyText = getFriendlyTextFromUrl(valueStr);
                return (
                  <div key={idx} className="text-sm text-foreground">
                    <a
                      href={valueStr}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1.5 inline"
                      title={valueStr}
                    >
                      {friendlyText}
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                    </a>
                  </div>
                );
              }
              
              // Plain text
              return (
                <div key={idx} className="text-sm text-foreground">• {valueStr}</div>
              );
            })}
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
        return <RenderValue value={value} currentId={currentId} currentSlug={currentSlug} />;

      default:
        const textValue = String(value);
        const decodedId = currentId ? decodeURIComponent(currentId) : '';
        
        // Check if it's an entity identifier (URN or entity URI) that should be clickable
        // This handles parent node, wasDerivedFrom (prov:wasDerivedFrom), and other entity references
        const entityInfo = isEntityIdentifier(textValue);
        if (entityInfo.isEntity && textValue !== decodedId) {
          const entitySlug = entityInfo.entitySlug || currentSlug || 'celltaxon';
          const friendlyText = getFriendlyTextFromUrl(textValue);
          return (
            <Link
              href={`/knowledge-base/${entitySlug}/${encodeURIComponent(textValue)}`}
              className="text-sm text-primary hover:underline flex items-center gap-1.5"
              title={textValue}
            >
              {friendlyText}
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
            </Link>
          );
        }
        
        // Check if it's a regular HTTP/HTTPS URL (external link, not entity identifier)
        if (isUrl(textValue)) {
          const friendlyText = getFriendlyTextFromUrl(textValue);
          return (
            <a
              href={textValue}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1.5"
              title={textValue}
            >
              {friendlyText}
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
                  // If no fields defined, auto-generate from data
                  let fieldsToRender = section.fields;
                  if (!fieldsToRender || fieldsToRender.length === 0) {
                    // Auto-generate fields from all data, excluding common metadata
                    fieldsToRender = generateFieldsFromData(data, ['id', 'description', 'contributed_by', 'created_at', 'updated_at', 'processedAt', 'history', 'version']);
                  }

                  const sectionFields = fieldsToRender
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

        if (dataSource.type === 'sparql' && dataSource.cardConfigFile) {
          // Handle SPARQL-based pages with card config files
          const { postData } = await import('@/src/utils/api/api-client');
          const { normalizeSparqlBindings, processSparqlQueryResult } = await import('@/src/utils/data/sparql-bindings');
          
          // Load the card YAML file
          const cardConfigModule = await import(`@/src/config/yaml/${dataSource.cardConfigFile}`);
          const cardConfig = cardConfigModule.default;
          
          if (!cardConfig || !cardConfig.boxes) {
            throw new Error(`Invalid card config file: ${dataSource.cardConfigFile}`);
          }

          // Helper function to replace entity ID in SPARQL query
          const replaceEntityIdInQuery = (query: string, rawId: string): string => {
            const decodedId = decodeURIComponent(rawId);
            let q = query;
            if (q.includes('VALUES') && q.includes('<{0}>')) {
              const uri = decodedId.startsWith('<') && decodedId.endsWith('>') ? decodedId : `<${decodedId}>`;
              q = q.replace(/<\{0\}>/g, uri);
              return q;
            }
            return q.replace(/\{0\}/g, decodedId);
          };

          // Helper function to fetch SPARQL bindings
          const fetchBindings = async (sparqlQuery: string) => {
            try {
              const result = await postData<{ success: boolean; data: any[] }>(
                dataSource.endpoint || '/api/entity-query',
                { sparql_query: sparqlQuery },
                { useAuth: false }
              );
              
              if (result.success && Array.isArray(result.data)) {
                return result.data;
              }
              return [];
            } catch (err) {
              console.error("Error fetching SPARQL bindings:", err);
              return [];
            }
          };

          // Process all boxes and collect data from SPARQL queries
          const transformedData: Record<string, any> = {
            id: decodedId,
            description: cardConfig.description || '',
          };

          for (const boxItem of cardConfig.boxes || []) {
            // Handle nested box structure (box.box) or direct box structure
            const box = boxItem.box || boxItem;
            const slugKey = box.slug || 'summarybox';
            const nextBucket: Record<string, any> = {};
            
            if (box.sparql_query) {
              const mainQuery = replaceEntityIdInQuery(box.sparql_query, id);
              const mainBindings = await fetchBindings(mainQuery);
              
              // Helper to extract value from SPARQL binding structure
              const extractBindingValue = (binding: any): string | undefined => {
                if (!binding) return undefined;
                if (typeof binding === 'string') return binding;
                if (typeof binding === 'object' && 'value' in binding) {
                  return binding.value;
                }
                return String(binding);
              };
              
              // Check if bindings have subject/predicate/object structure (SPARQL triple pattern)
              const hasSubjectPredicateObject = mainBindings.length > 0 && 
                (mainBindings[0].subject || mainBindings[0].predicate || mainBindings[0].object);
              
              if (hasSubjectPredicateObject) {
                // Process each binding row and preserve all fields
                const processedRows: Record<string, any>[] = [];
                const allFields = new Set<string>();
                
                mainBindings.forEach((binding: any) => {
                  const row: Record<string, any> = {};
                  
                  // Extract values from binding structure (handles {type: "uri", value: "..."} format)
                  if (binding.subject) {
                    const subjectValue = extractBindingValue(binding.subject);
                    if (subjectValue) {
                      row.subject = subjectValue;
                      allFields.add('subject');
                    }
                  }
                  if (binding.predicate) {
                    const predicateValue = extractBindingValue(binding.predicate);
                    if (predicateValue) {
                      row.predicate = predicateValue;
                      allFields.add('predicate');
                    }
                  }
                  if (binding.object) {
                    const objectValue = extractBindingValue(binding.object);
                    if (objectValue) {
                      row.object = objectValue;
                      allFields.add('object');
                    }
                  }
                  if (binding.category_type) {
                    const categoryValue = extractBindingValue(binding.category_type);
                    if (categoryValue) {
                      row.category_type = categoryValue;
                      allFields.add('category_type');
                    }
                  }
                  
                  // Also extract any other fields
                  Object.keys(binding).forEach(key => {
                    if (!['subject', 'predicate', 'object', 'category_type'].includes(key)) {
                      const fieldValue = extractBindingValue(binding[key]);
                      if (fieldValue != null && fieldValue !== '') {
                        row[key] = fieldValue;
                        allFields.add(key);
                      }
                    }
                  });
                  
                  if (Object.keys(row).length > 0) {
                    processedRows.push(row);
                  }
                });
                
                // Restructure data: Group by predicate, showing objects as values
                // This creates a structure similar to celltaxon where predicates become field names
                const predicateMap: Record<string, Set<string>> = {};
                let mainSubject: string | undefined;
                let mainCategoryType: string | undefined;
                
                processedRows.forEach(row => {
                  // Collect subject (should be the entity ID) - take first non-empty subject
                  if (row.subject && !mainSubject) {
                    mainSubject = row.subject;
                  }
                  
                  // Group predicates and their objects
                  if (row.predicate && row.object) {
                    const predicate = String(row.predicate);
                    const object = String(row.object);
                    
                    if (!predicateMap[predicate]) {
                      predicateMap[predicate] = new Set();
                    }
                    predicateMap[predicate].add(object);
                  }
                  
                  // Collect category_type (can appear in any row)
                  if (row.category_type) {
                    const catType = String(row.category_type);
                    if (!mainCategoryType) {
                      mainCategoryType = catType;
                    } else if (mainCategoryType !== catType) {
                      // If multiple category types, collect all unique ones
                      if (!predicateMap['category_type']) {
                        predicateMap['category_type'] = new Set([mainCategoryType]);
                      }
                      predicateMap['category_type'].add(catType);
                    }
                  }
                });
                
                // Add subject first
                if (mainSubject) {
                  nextBucket.subject = mainSubject;
                }
                
                // Add each predicate as a field with its objects as values
                Object.entries(predicateMap).forEach(([predicate, objects]) => {
                  const uniqueObjects = Array.from(objects);
                  if (uniqueObjects.length === 1) {
                    nextBucket[predicate] = uniqueObjects[0];
                  } else {
                    nextBucket[predicate] = uniqueObjects;
                  }
                });
                
                // Add category_type if found (only if not already in predicateMap)
                if (mainCategoryType && !predicateMap['category_type']) {
                  nextBucket.category_type = mainCategoryType;
                }
                
              } else {
                // Use standard processing for other SPARQL result formats
                const formatted = await processSparqlQueryResult(mainBindings);
                Object.assign(nextBucket, formatted);
              }
            }

            // Process additional info if present
            const add = box.box_additional_info;
            if (add) {
              const resolveRows = async (query: string) => {
                const q = replaceEntityIdInQuery(query, id);
                const bindings = await fetchBindings(q);
                return normalizeSparqlBindings(bindings, { shape: 'rows' }) as Record<string, string>[];
              };

              let sharedRows: Record<string, string>[] | null = null;
              
              if (add.sparql_query && add.is_iterable) {
                sharedRows = await resolveRows(add.sparql_query);
                if (Array.isArray(add.properties) && add.properties.length === 1 && add.properties[0].key) {
                  transformedData[add.properties[0].key] = sharedRows;
                } else if (add.header) {
                  const keyFromHeader = add.header.toLowerCase().replace(/\s+/g, "_");
                  transformedData[keyFromHeader] = sharedRows;
                }
              }

              if (Array.isArray(add.properties)) {
                for (const prop of add.properties) {
                  // Handle YAML folded scalar syntax (key: >) - the key will be the actual string value
                  const propKey = typeof prop.key === 'string' ? prop.key.trim() : String(prop.key || '');
                  
                  let rows: Record<string, string>[] | null = null;

                  if (prop.sqrl_query || prop.sparql_query) {
                    rows = await resolveRows(prop.sqrl_query || prop.sparql_query || '');
                  } else if (sharedRows) {
                    rows = sharedRows;
                  }

                  if (!rows || rows.length === 0) continue;

                  if (add.is_iterable) {
                    // For iterable properties, store as array of row objects
                    nextBucket[propKey] = rows;
                  } else {
                    // For non-iterable properties, collapse to single object or value
                    if (rows.length === 1) {
                      const singleRow = rows[0];
                      const keys = Object.keys(singleRow);
                      // If only one key, use its value directly; otherwise use the whole object
                      nextBucket[propKey] = keys.length === 1 ? singleRow[keys[0]] : singleRow;
                    } else {
                      // Multiple rows - merge into single object (flatten)
                      const merged: Record<string, any> = {};
                      rows.forEach(row => {
                        Object.assign(merged, row);
                      });
                      nextBucket[propKey] = merged;
                    }
                  }
                }
              }
            }

            // Merge bucket data into transformedData (flatten structure for easier access)
            Object.assign(transformedData, nextBucket);
          }

          // Apply data extractor if provided
          const extractedData = dataSource.dataExtractor 
            ? dataSource.dataExtractor(transformedData)
            : transformedData;

          // Debug: Log final data
          console.log('Final extractedData:', extractedData);
          console.log('Fields that will be generated:', Object.keys(extractedData));
          
          setData(extractedData);
        } else if (dataSource.type === 'api-get') {
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
          // Unsupported data source type
          throw new Error(`Unsupported data source type: ${dataSource.type}. Only 'api-get' and 'sparql' are supported.`);
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
  const firstTab = config.tabs[0];
  const firstSection = firstTab?.sections?.[0];
  const firstField = firstSection?.fields?.[0];
  const titleField = firstField?.key || 'name';
  const title = getValue(getNestedValue(data, titleField));
  const descriptionField = firstSection?.fields?.find(f => f.key === 'description')?.key;
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
            <EnhancedDetailsSection 
              item={data} 
              config={config} 
              data={data} 
              currentId={Array.isArray(params.id) ? params.id[0] : params.id}
              currentSlug={config.slug}
            />
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

