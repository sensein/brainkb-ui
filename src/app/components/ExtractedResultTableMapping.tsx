"use client";

import { useState, useEffect } from "react";

interface ExtractedResultTableMappingProps {
    data: Record<string, any>[];
    onDataChange?: (updatedData: Record<string, any>[]) => void;
    onSave?: () => void;
    isSaving?: boolean;
    showExportOptions?: boolean;
}

export default function ExtractedResultTableMapping({
    data,
    onDataChange,
    onSave,
    isSaving = false,
    showExportOptions = true,
}: ExtractedResultTableMappingProps) {
    // Flatten object helper - ensures all nested objects are flattened
    const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
        const flattened: Record<string, any> = {};
        
        // Handle null/undefined
        if (obj === null || obj === undefined) {
            return flattened;
        }
        
        // Handle arrays - keep as JSON string
        if (Array.isArray(obj)) {
            flattened[prefix || 'value'] = JSON.stringify(obj);
            return flattened;
        }
        
        // Handle primitives
        if (typeof obj !== 'object') {
            flattened[prefix || 'value'] = obj;
            return flattened;
        }
        
        // Handle objects - recursively flatten
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                const value = obj[key];
                
                // Handle null/undefined
                if (value === null || value === undefined) {
                    flattened[newKey] = value;
                }
                // Handle arrays - keep as JSON string
                else if (Array.isArray(value)) {
                    flattened[newKey] = JSON.stringify(value);
                }
                // Handle nested objects - recursively flatten
                else if (typeof value === 'object' && value !== null) {
                    // Recursively flatten the nested object
                    const nestedFlattened = flattenObject(value, newKey);
                    Object.assign(flattened, nestedFlattened);
                }
                // Handle primitives
                else {
                    flattened[newKey] = value;
                }
            }
        }
        
        return flattened;
    };

    // Recursively process a value to ensure all nested objects are flattened
    const processValue = (value: any, prefix: string = ''): Record<string, any> => {
        const result: Record<string, any> = {};
        
        // Handle null/undefined
        if (value === null || value === undefined) {
            if (prefix) {
                result[prefix] = value;
            }
            return result;
        }
        
        // Handle arrays - process each element
        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                const newKey = prefix ? `${prefix}[${index}]` : `[${index}]`;
                const nestedResult = processValue(item, newKey);
                Object.assign(result, nestedResult);
            });
            return result;
        }
        
        // Handle string that might be "[object Object]" - this indicates data loss, can't recover
        if (typeof value === 'string' && value === '[object Object]') {
            console.warn(`Found string "[object Object]" for prefix ${prefix} - data was lost during string conversion`);
            if (prefix) {
                result[prefix] = value;
            }
            return result;
        }
        
        // Handle primitives (strings, numbers, booleans)
        if (typeof value !== 'object') {
            if (prefix) {
                result[prefix] = value;
            }
            return result;
        }
        
        // Handle objects - recursively flatten
        // Check if it's actually an object (not a Date, RegExp, etc.)
        if (value.constructor && value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
            // Special object type (Date, RegExp, etc.) - stringify it
            try {
                if (prefix) {
                    result[prefix] = JSON.stringify(value);
                }
            } catch (e) {
                if (prefix) {
                    result[prefix] = String(value);
                }
            }
            return result;
        }
        
        try {
            // Get all keys (including non-enumerable ones if needed)
            const keys = Object.keys(value);
            const ownPropertyNames = Object.getOwnPropertyNames(value);
            const allKeys = Array.from(new Set([...keys, ...ownPropertyNames]));
            
            if (allKeys.length > 0) {
                // Has properties, flatten recursively
                for (const key of allKeys) {
                    try {
                        const newKey = prefix ? `${prefix}.${key}` : key;
                        const nestedValue = value[key];
                        const nestedResult = processValue(nestedValue, newKey);
                        Object.assign(result, nestedResult);
                    } catch (e) {
                        console.error(`Error processing nested key ${key} for prefix ${prefix}:`, e);
                    }
                }
            } else {
                // Empty object
                if (prefix) {
                    result[prefix] = '{}';
                }
            }
        } catch (e) {
            // Error accessing properties, stringify it
            console.error(`Error processing object for prefix ${prefix}:`, e, value);
            try {
                if (prefix) {
                    result[prefix] = JSON.stringify(value);
                }
            } catch (stringifyError) {
                if (prefix) {
                    result[prefix] = String(value);
                }
            }
        }
        
        return result;
    };

    // Helper to parse JSON strings
    const tryParseJSON = (value: any): any => {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 1) {
                try {
                    return JSON.parse(trimmed);
                } catch (e) {
                    // Not valid JSON, return as is
                    return value;
                }
            }
        }
        return value;
    };

    // Process data to ensure all nested objects are flattened
    const processData = (inputData: Record<string, any>[]): Record<string, any>[] => {
        console.log('Processing data in ExtractedResultTableMapping:', inputData);
        
        return inputData.map((row, rowIndex) => {
            const processedRow: Record<string, any> = {};
            
            for (const [key, value] of Object.entries(row)) {
                // Debug logging
                console.log(`Processing row ${rowIndex}, key: ${key}, value type: ${typeof value}`);
                
                // First, try to parse if it's a JSON string
                let parsedValue = tryParseJSON(value);
                
                // If it was a string and we parsed it, log that
                if (typeof value === 'string' && parsedValue !== value) {
                    console.log(`Parsed JSON string for key ${key}:`, parsedValue);
                    console.log(`Parsed value type: ${typeof parsedValue}, isArray: ${Array.isArray(parsedValue)}`);
                }
                
                // Process the value (this will handle all nested structures including arrays)
                const processed = processValue(parsedValue, key);
                console.log(`Processed result for key ${key}:`, processed);
                Object.assign(processedRow, processed);
            }
            
            console.log(`Processed row ${rowIndex}:`, processedRow);
            return processedRow;
        });
    };

    const [extractionResult, setExtractionResult] = useState<Record<string, any>[]>(processData(data));

    // Sync with parent data changes and re-process to flatten any new nested objects
    useEffect(() => {
        const processed = processData(data);
        setExtractionResult(processed);
    }, [data]);

    // Update local state and notify parent
    const handleDataChange = (updatedData: Record<string, any>[]) => {
        setExtractionResult(updatedData);
        if (onDataChange) {
            onDataChange(updatedData);
        }
    };

    const handleTableDataChange = (rowIndex: number, field: string, value: any) => {
        const updatedData = [...extractionResult];
        updatedData[rowIndex] = {
            ...updatedData[rowIndex],
            [field]: value
        };
        handleDataChange(updatedData);
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

    // Export to JSON
    const exportToJSON = () => {
        // Reconstruct nested structure before exporting
        const reconstructedData = extractionResult.map((flattenedItem) => unflattenObject(flattenedItem));
        
        const jsonContent = JSON.stringify(reconstructedData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `extracted-data-${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-8 shadow-md">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Extracted Data</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Review and edit the extracted data before saving or exporting.
            </p>
            
            <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 dark:border-gray-600">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200 border-b">
                                Field
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200 border-b">
                                Value
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {extractionResult.map((row: any, rowIndex: number) => {
                            // The row should already be flattened by processData
                            // Render it directly - all nested objects should already be flattened
                            return Object.entries(row).map(([field, value], fieldIndex: number) => {
                                // Extract the last label, calculate indentation, and determine group for coloring
                                // e.g., "judged_structured_information.judge_resource.1[0].mapped_target_concept[0].id" 
                                // -> "id" with indentation and group identifier
                                const getDisplayLabel = (fieldPath: string): { label: string; indentLevel: number; groupKey: string } => {
                                    // Split by dots
                                    const parts = fieldPath.split('.');
                                    
                                    // Get the last part (the actual field name)
                                    const lastPart = parts[parts.length - 1];
                                    // Remove array index if present in the last part
                                    const label = lastPart.includes('[') ? lastPart.split('[')[0] : lastPart;
                                    
                                    // Calculate indentation level and group key based on nesting depth
                                    let indentLevel = 0;
                                    let groupKey = 'root'; // Default group
                                    
                                    // Skip root parts and count meaningful nesting
                                    const rootParts = ['judged_structured_information', 'judge_resource'];
                                    
                                    // Find the parent object name for grouping (the last meaningful nested object)
                                    for (let i = 0; i < parts.length - 1; i++) {
                                        const part = parts[i];
                                        
                                        // Skip root parts
                                        if (rootParts.includes(part)) {
                                            continue;
                                        }
                                        
                                        // If part contains array index like "1[0]" or "mapped_target_concept[0]"
                                        if (part.includes('[')) {
                                            // Extract the part before the array index
                                            const partName = part.split('[')[0];
                                            // If it's a meaningful name (not just a number), it's a nesting level
                                            if (!/^\d+$/.test(partName)) {
                                                indentLevel++;
                                                // Use this as the group key for fields nested under it
                                                groupKey = partName;
                                            }
                                        } else if (!/^\d+$/.test(part)) {
                                            // It's a meaningful nested object name (not just a number)
                                            indentLevel++;
                                            groupKey = part;
                                        }
                                    }
                                    
                                    return { label, indentLevel, groupKey };
                                };
                                
                                const { label: displayLabel, indentLevel, groupKey } = getDisplayLabel(field);
                                
                                // Different subtle colors for different groups
                                const groupColors: Record<string, string> = {
                                    'root': 'bg-white dark:bg-gray-800',
                                    'mapped_target_concept': 'bg-blue-50 dark:bg-blue-900/20',
                                    'mapped_specific_target_concept': 'bg-purple-50 dark:bg-purple-900/20',
                                    'mentions': 'bg-green-50 dark:bg-green-900/20',
                                };
                                
                                const groupColor = groupColors[groupKey] || 'bg-gray-50 dark:bg-gray-800/50';
                                // Check if the value is an array (either actual array or JSON string that represents an array)
                                let isArray = false;
                                let arrayValues: string[] = [];
                                
                                if (Array.isArray(value)) {
                                    isArray = true;
                                    arrayValues = value.map(v => String(v));
                                } else if (typeof value === 'string') {
                                    // Try to parse as JSON array
                                    try {
                                        const parsed = JSON.parse(value);
                                        if (Array.isArray(parsed)) {
                                            isArray = true;
                                            arrayValues = parsed.map(v => String(v));
                                        }
                                    } catch (e) {
                                        // Not a JSON array, treat as regular string
                                    }
                                }
                                
                                if (isArray) {
                                    // Render multiple input boxes for array values
                                    return arrayValues.map((arrayValue, arrayIndex) => (
                                        <tr key={`${rowIndex}-${fieldIndex}-${arrayIndex}`} className={`border-b ${groupColor} hover:opacity-80 transition-colors`}>
                                            <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">
                                                {arrayIndex === 0 ? (
                                                    <span style={{ paddingLeft: `${indentLevel * 24}px` }}>
                                                        {displayLabel}
                                                    </span>
                                                ) : ''}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="text"
                                                        value={arrayValue}
                                                        onChange={(e) => {
                                                            // Update the specific array element
                                                            const newArrayValues = [...arrayValues];
                                                            newArrayValues[arrayIndex] = e.target.value;
                                                            
                                                            // Update the flattened data
                                                            const updatedData = [...extractionResult];
                                                            updatedData[rowIndex] = { 
                                                                ...updatedData[rowIndex], 
                                                                [field]: JSON.stringify(newArrayValues)
                                                            };
                                                            handleDataChange(updatedData);
                                                        }}
                                                        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                                    />
                                                    {arrayIndex === arrayValues.length - 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                // Add new array element
                                                                const newArrayValues = [...arrayValues, ''];
                                                                const updatedData = [...extractionResult];
                                                                updatedData[rowIndex] = { 
                                                                    ...updatedData[rowIndex], 
                                                                    [field]: JSON.stringify(newArrayValues)
                                                                };
                                                                handleDataChange(updatedData);
                                                            }}
                                                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                                        >
                                                            +
                                                        </button>
                                                    )}
                                                    {arrayValues.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                // Remove array element
                                                                const newArrayValues = arrayValues.filter((_, i) => i !== arrayIndex);
                                                                const updatedData = [...extractionResult];
                                                                updatedData[rowIndex] = { 
                                                                    ...updatedData[rowIndex], 
                                                                    [field]: JSON.stringify(newArrayValues)
                                                                };
                                                                handleDataChange(updatedData);
                                                            }}
                                                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ));
                                } else {
                                    // Render single input for non-array values
                                    // At this point, all objects should be flattened by processData
                                    // But if we still find one, it means processData missed it - log for debugging
                                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                        console.error(`CRITICAL: Found unflattened object for field ${field} in row ${rowIndex}. This should have been caught by processData.`, value);
                                        // Try to display as JSON as fallback
                                        try {
                                            const jsonValue = JSON.stringify(value, null, 2);
                                            return (
                                                <tr key={`${rowIndex}-${fieldIndex}`} className={`border-b ${groupColor} hover:opacity-80 transition-colors`}>
                                                    <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">
                                                        <span style={{ paddingLeft: `${indentLevel * 24}px` }}>
                                                            {displayLabel}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <textarea
                                                            value={jsonValue}
                                                            onChange={(e) => {
                                                                try {
                                                                    const parsed = JSON.parse(e.target.value);
                                                                    handleTableDataChange(rowIndex, field, parsed);
                                                                } catch (err) {
                                                                    // Invalid JSON, keep as string
                                                                    handleTableDataChange(rowIndex, field, e.target.value);
                                                                }
                                                            }}
                                                            rows={3}
                                                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm font-mono"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        } catch (e) {
                                            // Can't stringify, show error
                                            return (
                                                <tr key={`${rowIndex}-${fieldIndex}`} className={`border-b ${groupColor} hover:opacity-80 transition-colors`}>
                                                    <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">
                                                        <span style={{ paddingLeft: `${indentLevel * 24}px` }}>
                                                            {displayLabel}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-red-500 text-sm">
                                                        Error: Cannot display object
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    }
                                    
                                    // At this point, value should be a primitive
                                    let displayValue: string;
                                    
                                    if (value === null || value === undefined) {
                                        displayValue = '';
                                    } else {
                                        displayValue = String(value);
                                    }

                                    // Use textarea for longer text fields (like descriptions) or if value is longer than 100 chars
                                    const isLongText = displayValue.length > 100 || field.toLowerCase().includes('description') || field.toLowerCase().includes('text');

                                    return (
                                        <tr key={`${rowIndex}-${fieldIndex}`} className={`border-b ${groupColor} hover:opacity-80 transition-colors`}>
                                            <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200 align-top">
                                                <span style={{ paddingLeft: `${indentLevel * 24}px` }}>
                                                    {displayLabel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                {isLongText ? (
                                                    <textarea
                                                        value={displayValue}
                                                        onChange={(e) => handleTableDataChange(rowIndex, field, e.target.value)}
                                                        rows={Math.min(Math.max(3, Math.ceil(displayValue.length / 80)), 10)}
                                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm resize-y"
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={displayValue}
                                                        onChange={(e) => handleTableDataChange(rowIndex, field, e.target.value)}
                                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }
                            });
                        })}
                    </tbody>
                </table>
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
                        disabled={isSaving}
                        className={`px-6 py-2 text-white rounded-lg font-semibold transition-colors duration-200 ${
                            isSaving
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700"
                        }`}
                    >
                        {isSaving ? "Saving..." : "Save Data"}
                    </button>
                )}
            </div>
        </div>
    );
}

