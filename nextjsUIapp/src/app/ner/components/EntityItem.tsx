"use client";

import { Entity } from "@/src/app/ner/types";
import Link from "next/link";
import EntityTypeClassificationDropdown from "./EntityTypeClassificationDropdown";

interface EntityItemProps {
    type: string;
    entity: Entity;
    index: number;
    isSelected: boolean;
    onSelectionChange: (checked: boolean) => void;
    onFeedback: (feedback: 'up' | 'down') => void;
    onViewDetails: () => void;
    isEditing: boolean;
    correction: string;
    entityType: string;
    onCorrectionChange: (value: string) => void;
    onEntityTypeChange: (value: string) => void;
    onCorrectionSubmit: () => void;
}

export default function EntityItem({
    type,
    entity,
    index,
    isSelected,
    onSelectionChange,
    onFeedback,
    onViewDetails,
    isEditing,
    correction,
    entityType,
    onCorrectionChange,
    onEntityTypeChange,
    onCorrectionSubmit
}: EntityItemProps) {
    return (
        <li className="border-b border-gray-200 dark:border-gray-600 pb-3">
            <div className="flex items-center mb-2">
                <input
                    type="checkbox"
                    id={`entity-${type}-${index}`}
                    checked={isSelected}
                    onChange={(e) => onSelectionChange(e.target.checked)}
                    className="mr-3"
                />
                <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-center">
                        <div>
                            <span className={`text-sm font-medium ${(entity.correction || entity.corrected) ? 'bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded' : ''}`}>
                                {entity.correction || entity.text}
                                {(entity.correction || entity.corrected) && (
                                    <span className="text-xs text-gray-500 ml-2">
                                        (corrected from: <span className="line-through">{entity.originalText || entity.text}</span>)
                                    </span>
                                )}
                            </span>
                            <span className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                                {type}
                            </span>
                            {entity.entityType && (
                                <span className="ml-2 text-xs px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                                    {entity.entityType}
                                </span>
                            )}
                            <span className="flex items-center">
                                <button
                                    onClick={onViewDetails}
                                    className="ml-2 text-xs text-blue-500 hover:underline"
                                >
                                    Quick View
                                </button>
                                <Link
                                    href={`/ner/entity/${type}/${index}`}
                                    className="ml-2 text-xs text-blue-500 hover:underline"
                                >
                                    Full Details
                                </Link>
                            </span>
                        </div>
                        <div className="flex items-center">
                            <div className="flex space-x-2 mr-3">
                                <button
                                    type="button"
                                    onClick={() => onFeedback('up')}
                                    className={`p-1 rounded ${
                                        entity.feedback === 'up' 
                                            ? 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200' 
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onFeedback('down')}
                                    className={`p-1 rounded ${
                                        entity.feedback === 'down' 
                                            ? 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-200' 
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                                    </svg>
                                </button>
                            </div>
                            <span className="text-xs text-gray-500">
                                Confidence: {(entity.confidence * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* Entity type classification dropdown */}
                    {isEditing && (
                        <div className="mt-2">
                            <EntityTypeClassificationDropdown
                                value={entityType}
                                onChange={onEntityTypeChange}
                                onSubmit={onCorrectionSubmit}
                            />
                        </div>
                    )}

                    {/* Sentence with highlighted entity */}
                    {entity.sentence && (
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-600 rounded text-sm">
                            <p dangerouslySetInnerHTML={{
                                __html: entity.sentence.replace(
                                    entity.text,
                                    `<span class="${(entity.correction || entity.corrected) ? 'bg-yellow-300 dark:bg-yellow-700' : 'bg-yellow-200 dark:bg-yellow-600'} px-1 rounded font-medium">${entity.correction || entity.text}</span>`
                                )
                            }} />
                        </div>
                    )}
                </div>
            </div>
        </li>
    );
}
