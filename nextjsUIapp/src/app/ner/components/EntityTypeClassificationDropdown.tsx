"use client";

import { useEffect, useState } from "react";
import { fetchEntityData } from "../services/dataService";

interface EntityTypeClassificationDropdownProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    originalType?: string;
}

export default function EntityTypeClassificationDropdown({
    value,
    onChange,
    onSubmit,
    originalType
}: EntityTypeClassificationDropdownProps) {
    const [entityTypes, setEntityTypes] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const getEntityTypes = async () => {
            setIsLoading(true);
            try {
                const data = await fetchEntityData();
                // Extract unique entity types from the data
                const types = Object.keys(data.entities);
                // Always include UNCLASSIFIED
                if (!types.includes('UNCLASSIFIED')) {
                    types.push('UNCLASSIFIED');
                }
                setEntityTypes(types);
            } catch (error) {
                console.error("Error fetching entity types:", error);
                // Fallback to default types if fetch fails
                setEntityTypes(['GENE', 'CELL_TYPE', 'ANATOMICAL_REGION', 'NEURON_TYPE', 'UNCLASSIFIED']);
            } finally {
                setIsLoading(false);
            }
        };

        getEntityTypes();
    }, []);

    return (
        <div className="flex flex-col space-y-2">
            <label htmlFor="entityType" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Classify Entity Type:
                {originalType && (
                    <span className="ml-2 text-xs text-gray-500">
                        (Current: <span className="font-medium">{originalType}</span>)
                    </span>
                )}
            </label>
            <select
                id="entityType"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
            >
                <option value="">Select entity type</option>
                {entityTypes.map(type => (
                    <option key={type} value={type}>
                        {type}
                    </option>
                ))}
            </select>
            <button
                type="button"
                onClick={onSubmit}
                disabled={!value}
                className={`px-4 py-2 rounded-md text-white ${
                    value ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                }`}
            >
                Update Classification
            </button>
        </div>
    );
}
