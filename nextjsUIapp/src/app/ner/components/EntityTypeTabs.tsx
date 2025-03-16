"use client";

import { EntityResults } from "@/src/app/ner/types";

interface EntityTypeTabsProps {
    entities: EntityResults;
    activeEntityType: string | null;
    onEntityTypeChange: (type: string) => void;
}

export default function EntityTypeTabs({ 
    entities, 
    activeEntityType, 
    onEntityTypeChange 
}: EntityTypeTabsProps) {
    return (
        <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
            <nav className="-mb-px flex space-x-8">
                {Object.keys(entities)
                    // Only show entity types that have entities
                    .filter(type => entities[type].length > 0)
                    .map((type) => (
                        <button
                            key={type}
                            onClick={() => onEntityTypeChange(type)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeEntityType === type
                                    ? "border-blue-500 text-blue-500"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            {type} ({entities[type].length})
                        </button>
                    ))}
            </nav>
        </div>
    );
}
