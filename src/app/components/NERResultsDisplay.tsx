"use client";

import { useState, useEffect, useMemo } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

// Define types for our entities and results
interface Entity {
    entity: string;
    entityType: string;
    originalEntityType: string;
    start: number[];
    end: number[];
    sentence: string[];
    paper_location: string[];
    paper_title: string[];
    doi: string[];
    ontology_id: string | null;
    ontology_label: string | null;
    judge_score: number[];
    feedback?: 'up' | 'down';
    contributed_by?: string;
    changed_by?: string[];
}

interface EntityResults {
    [key: string]: Entity[];
}

interface Results {
    entities: EntityResults;
    documentName?: string;
    processedAt?: string;
}

interface EntityRow {
    id: string; // Combination of key and index: "1-0", "2-0", etc.
    key: string; // The numeric key from judge_ner_terms
    index: number; // Index within the array
    entity: any; // The entity object
    flattened: Record<string, any>; // Flattened version for display
}

interface NERResultsDisplayProps {
    // Old format (entities structure)
    results?: Results;
    activeEntityType?: string | null;
    onActiveEntityTypeChange?: (type: string) => void;
    onFeedbackChange?: (type: string, index: number, feedback: 'up' | 'down') => void;
    onTypeChange?: (oldType: string, index: number, newType: string) => void;
    allApproved?: boolean;
    
    // New format (judge_ner_terms structure)
    nerData?: any; // NER data structure: { judge_ner_terms: { "1": [{...}], "2": [{...}] } }
    onNerDataChange?: (updatedData: any) => void;
    
    // Common props
    onSave?: () => void;
    isProcessing?: boolean;
    isSaved?: boolean;
    session?: any;
    showExportOptions?: boolean;
}

// Helper to correct start/end indices if they do not match the entity string
function getCorrectedIndices(sentence: string, entity: string, origStart: number, origEnd: number) {
    if (sentence.substring(origStart, origEnd) === entity) {
        return { start: origStart, end: origEnd };
    }
    // Try to find the entity string in the sentence
    const idx = sentence.indexOf(entity);
    if (idx !== -1) {
        return { start: idx, end: idx + entity.length };
    }
    // Fallback: return original indices
    return { start: origStart, end: origEnd };
}

// Helper to get all unique entity types from results
function getAllEntityTypes(results: Results): string[] {
    if (!results || !results.entities) return [];
    const types = Object.keys(results.entities);
    if (!types.includes('Unknown / Unable to classify')) {
        types.push('Unknown / Unable to classify');
    }
    return types;
}

const EntityCard = ({
    entity,
    onFeedbackChange,
    type,
    index,
    onTypeChange,
    isEditing,
    results,
    session
}: {
    entity: Entity;
    onFeedbackChange: (type: string, index: number, feedback: 'up' | 'down') => void;
    onTypeChange: (oldType: string, index: number, newType: string) => void;
    type: string;
    index: number;
    isEditing: boolean;
    results: Results;
    session: any;
}) => {
    const entityTypes = getAllEntityTypes(results);

    // Function to highlight the entity in a sentence
    const highlightEntityInSentence = (sentence: string, start: number, end: number) => {
        if (!sentence) return '';
        const before = sentence.substring(0, start);
        const entityText = sentence.substring(start, end);
        const after = sentence.substring(end);
        return `${before}<span class="bg-yellow-200 dark:bg-yellow-600 px-1 rounded font-medium">${entityText}</span>${after}`;
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        {entity.entity}
                        {entity.originalEntityType !== entity.entityType && (
                            <span className="text-xs text-red-700 ml-2">
                                (changed from: {entity.originalEntityType})
                            </span>
                        )}
                    </h3>
                    {isEditing ? (
                        <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700">Entity Type</label>
                            <select
                                value={entity.entityType}
                                onChange={(e) => onTypeChange(type, index, e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-gray-100"
                            >
                                {entityTypes.map((etype) => (
                                    <option key={etype} value={etype}>{etype}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Type: {entity.entityType}</p>
                    )}
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                        Confidence: {(entity.judge_score[0] * 100).toFixed(1)}%
                        <span
                            className="ml-1 cursor-pointer inline-block relative"
                            title="How well the extracted information aligns with the target ontology or schema."
                            style={{ display: 'inline-flex', alignItems: 'center' }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                fill="currentColor"
                                viewBox="0 0 16 16"
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <circle cx="8" cy="8" r="8" fill="#e5e7eb"/>
                                <text x="8" y="12" textAnchor="middle" fontSize="10" fill="#374151">?</text>
                            </svg>
                        </span>
                    </p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => onFeedbackChange(type, index, 'up')}
                        className={`p-2 rounded-full ${entity.feedback === 'up' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}
                    >
                        <ThumbsUp className="h-5 w-5"/>
                    </button>
                    <button
                        onClick={() => onFeedbackChange(type, index, 'down')}
                        className={`p-2 rounded-full ${entity.feedback === 'down' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
                    >
                        <ThumbsDown className="h-5 w-5"/>
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <div className="text-sm text-gray-600">
                    <span className="font-medium">Sentences:</span>
                    <div className="mt-2 space-y-2">
                        {entity.sentence.map((sentence, i) => {
                            const { start, end } = getCorrectedIndices(sentence, entity.entity, entity.start[i], entity.end[i]);
                            return (
                                <div key={i} className="p-2 bg-gray-50 rounded">
                                    <div className="flex items-start">
                                        <span className="text-xs text-gray-500 mr-2 mt-1">{i + 1}.</span>
                                        <div
                                            className="flex-1"
                                            dangerouslySetInnerHTML={{
                                                __html: highlightEntityInSentence(
                                                    sentence,
                                                    start,
                                                    end
                                                )
                                            }}
                                        />
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        <span className="font-medium">Location:</span> {entity.paper_location[i]}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {entity.paper_title[0] && (
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">Paper:</span> {entity.paper_title[0]}
                    </div>
                )}
                {entity.doi[0] && (
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">DOI:</span> {entity.doi[0]}
                    </div>
                )}
                {entity.ontology_id && (
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">Ontology ID:</span> {entity.ontology_id}
                    </div>
                )}
                {entity.ontology_label && (
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">Ontology Label:</span> {entity.ontology_label}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function NERResultsDisplay({
    results,
    activeEntityType,
    onActiveEntityTypeChange,
    onFeedbackChange,
    onTypeChange,
    allApproved = false,
    nerData,
    onNerDataChange,
    onSave,
    isProcessing = false,
    isSaved = false,
    session,
    showExportOptions = true,
}: NERResultsDisplayProps) {
    const [entityRows, setEntityRows] = useState<EntityRow[]>([]);
    const [activeEntityName, setActiveEntityName] = useState<string | null>(null);
    // Track temporary input values for entity field to avoid updating on every keystroke
    const [tempEntityValues, setTempEntityValues] = useState<Record<string, string>>({});

    // Flatten object helper
    const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
        const flattened: Record<string, any> = {};
        
        if (obj === null || obj === undefined) {
            return flattened;
        }
        
        if (Array.isArray(obj)) {
            flattened[prefix || 'value'] = JSON.stringify(obj);
            return flattened;
        }
        
        if (typeof obj !== 'object') {
            flattened[prefix || 'value'] = obj;
            return flattened;
        }
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                const value = obj[key];
                
                if (value === null || value === undefined) {
                    flattened[newKey] = value;
                } else if (Array.isArray(value)) {
                    flattened[newKey] = JSON.stringify(value);
                } else if (typeof value === 'object' && value !== null) {
                    const nestedFlattened = flattenObject(value, newKey);
                    Object.assign(flattened, nestedFlattened);
                } else {
                    flattened[newKey] = value;
                }
            }
        }
        
        return flattened;
    };

    // Unflatten object helper
    const unflattenObject = (flattened: Record<string, any>): any => {
        const result: any = {};
        
        for (const key in flattened) {
            const keys = key.split('.');
            let current = result;
            
            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                if (!(k in current)) {
                    current[k] = {};
                }
                current = current[k];
            }
            
            const lastKey = keys[keys.length - 1];
            let value = flattened[key];
            
            // Try to parse JSON strings back to arrays/objects
            if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    // Keep as string if parsing fails
                }
            }
            
            current[lastKey] = value;
        }
        
        return result;
    };

    // Process NER data into rows
    const processNERData = (nerData: any): EntityRow[] => {
        const rows: EntityRow[] = [];
        
        if (!nerData || !nerData.judge_ner_terms) {
            return rows;
        }
        
        const judgeNerTerms = nerData.judge_ner_terms;
        
        // Iterate through each key in judge_ner_terms
        Object.keys(judgeNerTerms).forEach((key) => {
            const entities = judgeNerTerms[key];
            
            if (Array.isArray(entities)) {
                entities.forEach((entity: any, index: number) => {
                    const id = `${key}-${index}`;
                    const flattened = flattenObject(entity);
                    rows.push({
                        id,
                        key,
                        index,
                        entity,
                        flattened,
                    });
                });
            }
        });
        
        return rows;
    };

    // Reconstruct NER data from rows
    const reconstructNERData = (rows: EntityRow[]): any => {
        const judgeNerTerms: Record<string, any[]> = {};
        
        rows.forEach((row) => {
            // Unflatten the entity
            const unflattened = unflattenObject(row.flattened);
            
            if (!judgeNerTerms[row.key]) {
                judgeNerTerms[row.key] = [];
            }
            
            // Ensure the array has enough elements
            while (judgeNerTerms[row.key].length <= row.index) {
                judgeNerTerms[row.key].push(null);
            }
            
            judgeNerTerms[row.key][row.index] = unflattened;
        });
        
        // Remove null entries and clean up
        Object.keys(judgeNerTerms).forEach((key) => {
            judgeNerTerms[key] = judgeNerTerms[key].filter((item) => item !== null);
        });
        
        return {
            judge_ner_terms: judgeNerTerms,
        };
    };

    // Initialize rows from nerData
    useEffect(() => {
        if (nerData) {
            const rows = processNERData(nerData);
            setEntityRows(rows);
        }
    }, [nerData]);

    // Handle data change for table format
    const handleDataChange = (updatedRows: EntityRow[]) => {
        setEntityRows(updatedRows);
        
        if (onNerDataChange) {
            const reconstructed = reconstructNERData(updatedRows);
            onNerDataChange(reconstructed);
        }
    };

    // Track previous entity name for a row to detect changes
    const [entityNameChanges, setEntityNameChanges] = useState<Record<string, string>>({});

    // Group entities by entity name (must be defined before useEffect that uses it)
    const groupedEntities = useMemo(() => {
        return entityRows.reduce((acc, row) => {
            // Try to get entity name from various sources
            let entityName = row.entity?.entity;
            if (!entityName && row.flattened) {
                // Check flattened fields for entity name
                entityName = row.flattened.entity || row.flattened['entity'] || null;
            }
            if (!entityName) {
                entityName = `Entity ${row.id}`;
            }
            if (!acc[entityName]) {
                acc[entityName] = [];
            }
            acc[entityName].push(row);
            return acc;
        }, {} as Record<string, EntityRow[]>);
    }, [entityRows]);

    // Handle field change
    const handleFieldChange = (rowId: string, field: string, value: any) => {
        // Check if this is the entity field (could be "entity" or end with ".entity")
        const isEntityField = field === 'entity' || field.endsWith('.entity') || field.split('.').pop() === 'entity';
        
        const updatedRows = entityRows.map((row) => {
            if (row.id === rowId) {
                const updatedFlattened = { ...row.flattened, [field]: value };
                
                // If the entity field is being changed, update the entity object as well
                let updatedEntity = { ...row.entity };
                if (isEntityField) {
                    // Update the entity name in the entity object
                    updatedEntity = { ...updatedEntity, entity: value };
                    // Track the entity name change
                    setEntityNameChanges((prev) => ({ ...prev, [rowId]: value }));
                }
                
                return { ...row, flattened: updatedFlattened, entity: updatedEntity };
            }
            return row;
        });
        
        handleDataChange(updatedRows);
    };

    // Watch for entity name changes - just clear the tracking since we don't need tab switching
    useEffect(() => {
        if (Object.keys(entityNameChanges).length > 0) {
            // Clear the change tracking after a short delay to allow re-render
            const timeoutId = setTimeout(() => {
                setEntityNameChanges({});
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [entityNameChanges, groupedEntities]);

    // Get display label (last part of field path, remove array indices)
    const getDisplayLabel = (fieldPath: string): { label: string; indentLevel: number; groupKey: string } => {
        const parts = fieldPath.split('.');
        const lastPart = parts[parts.length - 1];
        // Remove array indices like [0], [1] from the label
        const label = lastPart.includes('[') ? lastPart.split('[')[0] : lastPart;
        
        let indentLevel = 0;
        let groupKey = 'root';

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            
            if (part.includes('[')) {
                const partName = part.split('[')[0];
                if (!/^\d+$/.test(partName)) {
                    indentLevel++;
                    groupKey = partName;
                }
            } else if (!/^\d+$/.test(part)) {
                indentLevel++;
                groupKey = part;
            }
        }
        
        return { label, indentLevel, groupKey };
    };

    // No longer need to set active entity name since we display all entities

    // Export to JSON
    const exportToJSON = () => {
        if (nerData) {
            const reconstructed = reconstructNERData(entityRows);
            const jsonString = JSON.stringify(reconstructed, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ner-extraction-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else if (results) {
            const jsonString = JSON.stringify(results, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ner-extraction-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // Render table format (judge_ner_terms)
    if (nerData && entityRows.length > 0) {
        // Group colors for visual hierarchy
        const groupColors: Record<string, string> = {
            'root': 'bg-white dark:bg-gray-800',
            'entity': 'bg-blue-50 dark:bg-blue-900/20',
            'label': 'bg-purple-50 dark:bg-purple-900/20',
            'sentence': 'bg-green-50 dark:bg-green-900/20',
            'remarks': 'bg-yellow-50 dark:bg-yellow-900/20',
        };

        const entityNames = Object.keys(groupedEntities);

        // Helper function to render entity table rows
        const renderEntityTableRows = (rows: EntityRow[]) => {
            // Get all unique fields across rows
            const allFields = new Set<string>();
            if (rows && rows.length > 0) {
                rows.forEach((row) => {
                    if (row && row.flattened) {
                        Object.keys(row.flattened).forEach((field) => allFields.add(field));
                    }
                });
            }
            const sortedFields = Array.from(allFields).sort();

            return rows.map((row, rowIndex) => {
                return sortedFields.map((field, fieldIndex) => {
                    const value = row.flattened[field];
                    const { label: displayLabel, indentLevel, groupKey } = getDisplayLabel(field);
                    const groupColor = groupColors[groupKey] || 'bg-gray-50 dark:bg-gray-800/50';

                    // Handle array values (JSON strings)
                    if (typeof value === 'string' && value.startsWith('[')) {
                        try {
                            const arrayValues = JSON.parse(value);
                            if (Array.isArray(arrayValues)) {
                                return arrayValues.map((arrayValue, arrayIndex) => (
                                    <tr key={`${row.id}-${field}-${arrayIndex}`} className={`border-b ${groupColor} hover:opacity-80 transition-colors`}>
                                        <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200 align-top border border-gray-300 dark:border-gray-600">
                                            <span style={{ paddingLeft: `${indentLevel * 24}px` }}>
                                                {displayLabel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 border border-gray-300 dark:border-gray-600">
                                            <input
                                                type="text"
                                                value={String(arrayValue)}
                                                onChange={(e) => {
                                                    const newArrayValues = [...arrayValues];
                                                    newArrayValues[arrayIndex] = e.target.value;
                                                    handleFieldChange(row.id, field, JSON.stringify(newArrayValues));
                                                }}
                                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                            />
                                        </td>
                                    </tr>
                                ));
                            }
                        } catch (e) {
                            // Not a valid JSON array, treat as string
                        }
                    }

                    // Handle regular values
                    let displayValue: string;
                    if (value === null || value === undefined) {
                        displayValue = '';
                    } else {
                        displayValue = String(value);
                    }

                    const isLongText = displayValue.length > 100 || 
                        field.toLowerCase().includes('sentence') || 
                        field.toLowerCase().includes('remarks') ||
                        field.toLowerCase().includes('description');

                    return (
                        <tr key={`${row.id}-${field}`} className={`border-b ${groupColor} hover:opacity-80 transition-colors`}>
                            <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200 align-top border border-gray-300 dark:border-gray-600">
                                <span style={{ paddingLeft: `${indentLevel * 24}px` }}>
                                    {displayLabel}
                                </span>
                            </td>
                            <td className="px-4 py-2 border border-gray-300 dark:border-gray-600">
                                {isLongText ? (
                                    <textarea
                                        value={tempEntityValues[`${row.id}-${field}`] !== undefined 
                                            ? tempEntityValues[`${row.id}-${field}`] 
                                            : displayValue}
                                        onChange={(e) => {
                                            const isEntityField = field === 'entity' || field.endsWith('.entity') || field.split('.').pop() === 'entity';
                                            if (isEntityField) {
                                                setTempEntityValues((prev) => ({
                                                    ...prev,
                                                    [`${row.id}-${field}`]: e.target.value
                                                }));
                                            } else {
                                                handleFieldChange(row.id, field, e.target.value);
                                            }
                                        }}
                                        onBlur={(e) => {
                                            const isEntityField = field === 'entity' || field.endsWith('.entity') || field.split('.').pop() === 'entity';
                                            if (isEntityField) {
                                                handleFieldChange(row.id, field, e.target.value);
                                                setTempEntityValues((prev) => {
                                                    const newState = { ...prev };
                                                    delete newState[`${row.id}-${field}`];
                                                    return newState;
                                                });
                                            }
                                        }}
                                        rows={Math.min(Math.max(3, Math.ceil(displayValue.length / 80)), 10)}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm resize-y"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={tempEntityValues[`${row.id}-${field}`] !== undefined 
                                            ? tempEntityValues[`${row.id}-${field}`] 
                                            : displayValue}
                                        onChange={(e) => {
                                            const isEntityField = field === 'entity' || field.endsWith('.entity') || field.split('.').pop() === 'entity';
                                            if (isEntityField) {
                                                setTempEntityValues((prev) => ({
                                                    ...prev,
                                                    [`${row.id}-${field}`]: e.target.value
                                                }));
                                            } else {
                                                handleFieldChange(row.id, field, e.target.value);
                                            }
                                        }}
                                        onBlur={(e) => {
                                            const isEntityField = field === 'entity' || field.endsWith('.entity') || field.split('.').pop() === 'entity';
                                            if (isEntityField) {
                                                handleFieldChange(row.id, field, e.target.value);
                                                setTempEntityValues((prev) => {
                                                    const newState = { ...prev };
                                                    delete newState[`${row.id}-${field}`];
                                                    return newState;
                                                });
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            const isEntityField = field === 'entity' || field.endsWith('.entity') || field.split('.').pop() === 'entity';
                                            if (isEntityField && e.key === 'Enter') {
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                    />
                                )}
                            </td>
                        </tr>
                    );
                });
            }).flat();
        };

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border-2 border-gray-300 dark:border-gray-600">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Extracted NER Entities
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {entityRows.length} entity{entityRows.length !== 1 ? 'ies' : ''} found. Review and edit the extracted data below.
                    </p>
                </div>

                {/* Display all entities vertically grouped */}
                <div className="space-y-6">
                    {entityNames.map((entityName, entityIndex) => {
                        const entityRowsForName = groupedEntities[entityName] || [];
                        if (entityRowsForName.length === 0) return null;

                        return (
                            <div key={entityName} className="space-y-3">
                                {/* Entity Header */}
                                <div className="rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-3 w-fit">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {entityName}
                                    </h3>
                                </div>

                                {/* Entity Details Table */}
                                <div className="rounded-lg border-2 border-gray-300 dark:border-gray-600 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                                            <thead>
                                                <tr className="bg-gray-100 dark:bg-gray-700">
                                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600">
                                                        Field
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600">
                                                        Value
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {renderEntityTableRows(entityRowsForName)}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    {showExportOptions && (
                        <button
                            onClick={exportToJSON}
                            className="px-6 py-2 text-white rounded-lg font-semibold transition-colors duration-200 bg-purple-600 hover:bg-purple-700"
                        >
                            Export JSON
                        </button>
                    )}
                    {onSave && (
                        <button
                            onClick={onSave}
                            disabled={isProcessing}
                            className={`px-6 py-2 text-white rounded-lg font-semibold transition-colors duration-200 ${
                                isProcessing
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-green-600 hover:bg-green-700"
                            }`}
                        >
                            {isProcessing ? "Saving..." : "Save Data"}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Render card format (old entities structure)
    if (results && results.entities) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Extracted Entities</h2>

                {/* Entity Type Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
                    <nav className="-mb-px flex space-x-8 min-w-max overflow-x-auto scrollbar-hide">
                        {Object.keys(results.entities)
                            .filter(type => results.entities[type] && results.entities[type].length > 0)
                            .map((type) => (
                                <button
                                    key={type}
                                    onClick={() => onActiveEntityTypeChange?.(type)}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                        activeEntityType === type
                                            ? "border-blue-500 text-blue-500"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    {type} ({results.entities[type].length})
                                </button>
                            ))}
                    </nav>
                </div>

                {/* Entity List */}
                {activeEntityType && results.entities[activeEntityType] && results.entities[activeEntityType].length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300">
                            {activeEntityType} Entities
                        </h3>

                        <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                            <ul className="space-y-4">
                                {results.entities[activeEntityType].map((entity, index) => (
                                    <li key={index} className="border-b border-gray-200 dark:border-gray-600 pb-3">
                                        <EntityCard
                                            entity={entity}
                                            onFeedbackChange={onFeedbackChange!}
                                            onTypeChange={onTypeChange!}
                                            type={activeEntityType}
                                            index={index}
                                            isEditing={entity.feedback === 'down'}
                                            results={results}
                                            session={session}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Save button */}
                <div className="mt-6 flex justify-end gap-3">
                    {showExportOptions && (
                        <button
                            onClick={exportToJSON}
                            className="px-6 py-2 text-white rounded-lg font-semibold transition-colors duration-200 bg-purple-600 hover:bg-purple-700"
                        >
                            Export JSON
                        </button>
                    )}
                    {onSave && (
                        <button
                            onClick={onSave}
                            disabled={!allApproved || isProcessing || isSaved}
                            className={`px-6 py-2 text-white rounded-lg font-semibold transition-colors duration-200 ${
                                allApproved && !isProcessing && !isSaved
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {isProcessing ? 'Saving...' : isSaved ? 'Saved Result' : 'Save Results'}
                        </button>
                    )}
                </div>

                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Document: {results.documentName} • Processed
                    at: {results.processedAt ? new Date(results.processedAt).toLocaleString() : 'N/A'}
                </div>
            </div>
        );
    }

    // No data to display
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
            <p className="text-gray-500 dark:text-gray-400">No entities to display.</p>
        </div>
    );
}
