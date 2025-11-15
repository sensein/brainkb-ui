"use client";
import { useState } from 'react';
import { getValue, formatDate } from './helpers';

interface ProvenancePanelProps {
    history: any[];
    entityType?: 'ner' | 'resource';
}

export function ProvenancePanel({ history, entityType = 'ner' }: ProvenancePanelProps) {
    const sortedVersions = history ? [...history].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ) : [];

    const [selectedId, setSelectedId] = useState<number>(0);
    const selected = sortedVersions[selectedId];

    if (!history || sortedVersions.length === 0) return null;

    // Helper to render value properly
    const renderValue = (val: any, key: string): React.ReactNode => {
        if (val === null || val === undefined) return <span className="text-xs text-muted-foreground">null</span>;
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
            return <span className="text-xs text-muted-foreground">{String(val)}</span>;
        }
        if (Array.isArray(val)) {
            return (
                <div className="text-xs text-muted-foreground mt-1">
                    {val.map((v, i) => (
                        <div key={i}>{renderValue(v, key)}</div>
                    ))}
                </div>
            );
        }
        if (typeof val === 'object') {
            // For nested objects, show a summary or skip complex nested structures
            if (key === 'judged_structured_information' || key === 'entity' || key === 'label') {
                const message = entityType === 'ner' 
                    ? 'Entity information updated' 
                    : 'Resource information updated';
                return <span className="text-xs text-muted-foreground italic">{message}</span>;
            }
            // For other objects, show a generic message
            return <span className="text-xs text-muted-foreground italic">Object (see details)</span>;
        }
        return <span className="text-xs text-muted-foreground">{String(val)}</span>;
    };

    return (
        <div className="rounded-xl border p-3">
            <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground">Version</label>
                <select
                    className="rounded-md border px-2 py-1 text-sm min-w-[200px]"
                    value={selectedId}
                    onChange={(e) => setSelectedId(Number(e.target.value))}
                >
                    {sortedVersions.map((v, idx) => (
                        <option key={idx} value={idx}>
                            v{idx + 1} — {formatDate(v.timestamp)}
                        </option>
                    ))}
                </select>
            </div>

            {selected && (
                <div className="mt-3 rounded-lg border bg-muted/30 p-2">
                    <div className="mb-1 text-xs text-muted-foreground">
                        Changes in <strong>v{sortedVersions.indexOf(selected) + 1}</strong>
                        {selected.updated_fields?.contributed_by && (
                            <> by <span className="font-medium">{getValue(selected.updated_fields.contributed_by)}</span></>
                        )}
                        , {formatDate(selected.timestamp)}
                    </div>
                    {selected.updated_fields && (
                        <ul className="space-y-1 text-sm">
                            {Object.entries(selected.updated_fields).map(([key, value]: [string, any]) => {
                                if (key === 'contributed_by' || key === 'documentName' || key === 'processedAt') return null;
                                
                                return (
                                    <li key={key} className="flex items-start gap-2">
                                        <span className="mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                                        <div>
                                            <span className="font-medium">{key}</span>
                                            <div className="text-xs text-muted-foreground ml-2 mt-1">
                                                {renderValue(value, key)}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

