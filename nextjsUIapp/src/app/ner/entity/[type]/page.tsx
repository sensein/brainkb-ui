"use client";

import { useEffect, useState } from "react";
import { Entity, ProcessingResult, StatusFilter } from "@/src/app/ner/types";
import { fetchEntityData, saveEntityData } from "@/src/app/ner/services/dataService";
import Link from "next/link";
import { calculateStats, downloadAsCSV, downloadAsJSON } from "@/src/app/ner/utils/entityUtils";
import EntityDetailModal from "../../components/EntityDetailModal";
import StatsSection from "../../components/StatsSection";

interface EntityTypePageProps {
    params: {
        type: string;
    };
}

export default function EntityTypePage({ params }: EntityTypePageProps) {
    const { type } = params;
    const [results, setResults] = useState<ProcessingResult | null>(null);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilter>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    const [editingEntity, setEditingEntity] = useState<number | null>(null);
    const [entityType, setEntityType] = useState<string>('');
    const [selectedEntities, setSelectedEntities] = useState<{[key: string]: boolean}>({});
    const [selectAll, setSelectAll] = useState<boolean>(true);
    const [allApproved, setAllApproved] = useState<boolean>(false);
    const [stats, setStats] = useState({
        totalEntities: 0,
        approvedEntities: 0,
        correctedEntities: 0,
        pendingReview: 0
    });

    const [selectedEntity, setSelectedEntity] = useState<{type: string, entity: Entity} | null>(null);

    useEffect(() => {
        const fetchEntities = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await fetchEntityData();
                setResults(data);

                if (data.entities[type]) {
                    setEntities(data.entities[type]);

                    // Initialize selected entities
                    const initialSelectedEntities: {[key: string]: boolean} = {};
                    data.entities[type].forEach((_, index) => {
                        initialSelectedEntities[`${index}`] = true;
                    });
                    setSelectedEntities(initialSelectedEntities);

                    // Calculate type-specific stats
                    const typeStats = {
                        totalEntities: data.entities[type].length,
                        approvedEntities: data.entities[type].filter(e => e.feedback === 'up').length,
                        correctedEntities: data.entities[type].filter(e => e.corrected).length,
                        pendingReview: data.entities[type].filter(e => e.feedback === 'down').length
                    };
                    setStats(typeStats);

                    // Check if all entities are approved
                    const allUp = data.entities[type].every(entity => entity.feedback === 'up');
                    setAllApproved(allUp);
                } else {
                    setError(`Entity type not found: ${type}`);
                }
            } catch (err) {
                console.error("Error fetching entities:", err);
                setError("Failed to fetch entity data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchEntities();
    }, [type]);

    // Handle entity selection
    const handleEntitySelection = (index: number, checked: boolean) => {
        setSelectedEntities(prev => ({
            ...prev,
            [`${index}`]: checked
        }));

        // Update selectAll state
        const allSelected = Object.values({
            ...selectedEntities,
            [`${index}`]: checked
        }).every(value => value);

        setSelectAll(allSelected);
    };

    // Handle select all
    const handleSelectAll = (checked: boolean) => {
        const newSelectedEntities: {[key: string]: boolean} = {};
        entities.forEach((_, index) => {
            newSelectedEntities[`${index}`] = checked;
        });

        setSelectedEntities(newSelectedEntities);
        setSelectAll(checked);
    };

    // Handle feedback (thumbs up/down)
    const handleFeedback = (index: number, feedback: 'up' | 'down') => {
        if (!results) return;

        const updatedEntities = [...entities];
        updatedEntities[index].feedback = feedback;

        // If thumbs down, set up for editing
        if (feedback === 'down') {
            setEditingEntity(index);
            // Set initial entity type to the current type or empty string
            setEntityType(updatedEntities[index].entityType || '');
        } else if (editingEntity === index) {
            // If changing from down to up, clear editing state
            setEditingEntity(null);
        }

        // Check if all entities have thumbs up
        const allUp = updatedEntities.every(entity => entity.feedback === 'up');
        setAllApproved(allUp);

        // Update the entities in the results object
        const updatedResults = { ...results };
        updatedResults.entities[type] = updatedEntities;

        setEntities(updatedEntities);
        setResults(updatedResults);

        // Update stats
        const updatedStats = {
            totalEntities: updatedEntities.length,
            approvedEntities: updatedEntities.filter(e => e.feedback === 'up').length,
            correctedEntities: updatedEntities.filter(e => e.corrected).length,
            pendingReview: updatedEntities.filter(e => e.feedback === 'down').length
        };
        setStats(updatedStats);
    };

    // Handle entity type change
    const handleEntityTypeChange = (type: string) => {
        setEntityType(type);
    };

    // Handle entity type submission
    const handleCorrectionSubmit = () => {
        if (editingEntity === null || !results) return;

        const updatedEntities = [...entities];
        const entity = updatedEntities[editingEntity];
        const originalType = entity.entityType || type;

        // Create a history entry for this change
        const historyEntry = {
            originalType: originalType,
            newType: entityType,
            correctedBy: "User", // This should be the actual user name in a real app
            correctedAt: new Date().toISOString(),
            changeType: 'type' as const
        };

        // Update entity with new type and history
        entity.entityType = entityType;
        entity.feedback = 'up'; // Auto-approve after classification
        entity.corrected = true;

        if (!entity.correctionHistory) {
            entity.correctionHistory = [];
        }
        entity.correctionHistory.push(historyEntry);

        // Update the entities in the results object
        const updatedResults = { ...results };

        // If the entity type has changed and it's different from the current tab
        if (entityType !== type) {
            // Remove from current type array
            updatedResults.entities[type] = updatedEntities.filter((_, i) => i !== editingEntity);

            // Add to the new type array (create it if it doesn't exist)
            if (!updatedResults.entities[entityType]) {
                updatedResults.entities[entityType] = [];
            }
            updatedResults.entities[entityType].push(entity);

            // Update local entities state (remove the entity that was moved)
            setEntities(updatedEntities.filter((_, i) => i !== editingEntity));
        } else {
            // Just update the current type array
            updatedResults.entities[type] = updatedEntities;
            setEntities(updatedEntities);
        }

        setResults(updatedResults);
        setEditingEntity(null);

        // Check if all entities now have thumbs up
        const allUp = updatedEntities.filter((_, i) => i !== (entityType !== type ? editingEntity : -1))
            .every(entity => entity.feedback === 'up');
        setAllApproved(allUp);

        // Update stats
        const remainingEntities = updatedEntities.filter((_, i) => i !== (entityType !== type ? editingEntity : -1));
        const updatedStats = {
            totalEntities: remainingEntities.length,
            approvedEntities: remainingEntities.filter(e => e.feedback === 'up').length,
            correctedEntities: remainingEntities.filter(e => e.corrected).length,
            pendingReview: remainingEntities.filter(e => e.feedback === 'down').length
        };
        setStats(updatedStats);
    };

    // Handle save
    const handleSave = async () => {
        if (!results) return;

        setIsLoading(true);

        try {
            await saveEntityData(results);

            // Show success message
            setError("Results saved successfully!");

            // Refresh data
            const data = await fetchEntityData();
            setResults(data);

            if (data.entities[type]) {
                setEntities(data.entities[type]);

                // Calculate type-specific stats
                const typeStats = {
                    totalEntities: data.entities[type].length,
                    approvedEntities: data.entities[type].filter(e => e.feedback === 'up').length,
                    correctedEntities: data.entities[type].filter(e => e.corrected).length,
                    pendingReview: data.entities[type].filter(e => e.feedback === 'down').length
                };
                setStats(typeStats);
            }
        } catch (err) {
            console.error("Error saving results:", err);
            setError("Failed to save results. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Filter entities based on status and search term
    const filteredEntities = entities.filter(entity => {
        // Status filter
        const statusMatch =
            activeStatusFilter === 'all' ? true :
            activeStatusFilter === 'approved' ? entity.feedback === 'up' :
            activeStatusFilter === 'corrected' ? entity.corrected :
            activeStatusFilter === 'pending' ? entity.feedback === 'down' :
            true;

        // Search filter
        const searchMatch = searchTerm === '' ? true :
            entity.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entity.correction && entity.correction.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (entity.sentence && entity.sentence.toLowerCase().includes(searchTerm.toLowerCase()));

        return statusMatch && searchMatch;
    });

    // Pagination
    const totalPages = Math.ceil(filteredEntities.length / itemsPerPage);
    const paginatedEntities = filteredEntities.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (isLoading) {
        return (
            <div className="flex flex-col max-w-4xl mx-auto p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md text-center">
                    <p className="text-gray-500">Loading entities...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col max-w-4xl mx-auto p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                    <div className="mb-4">
                        <Link href="/ner/all" className="text-blue-500 hover:underline flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            Back to Entity List
                        </Link>
                    </div>
                    <p className="text-red-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col max-w-4xl mx-auto p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <div className="mb-4">
                    <Link href="/ner/all" className="text-blue-500 hover:underline flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back to Entity List
                    </Link>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">{type} Entities</h1>

                    {/* Download Options */}
                    <div className="flex space-x-2">
                        <div className="flex items-center mr-4">
                            <input
                                type="checkbox"
                                id="selectAll"
                                checked={selectAll}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                className="mr-2"
                            />
                            <label htmlFor="selectAll" className="text-sm">Select All</label>
                        </div>
                        <button
                            onClick={() => {
                                if (results) {
                                    // Create a subset of the results with just this entity type
                                    const subsetResults = {
                                        ...results,
                                        entities: { [type]: entities }
                                    };
                                    downloadAsCSV(subsetResults, selectedEntities);
                                }
                            }}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                        >
                            Download CSV
                        </button>
                        <button
                            onClick={() => {
                                if (results) {
                                    // Create a subset of the results with just this entity type
                                    const subsetResults = {
                                        ...results,
                                        entities: { [type]: entities }
                                    };
                                    downloadAsJSON(subsetResults, selectedEntities);
                                }
                            }}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                            Download JSON
                        </button>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="mb-6">
                    <StatsSection
                        stats={stats}
                        isLoading={isLoading}
                        error={error}
                        activeStatusFilter={activeStatusFilter}
                        setActiveStatusFilter={setActiveStatusFilter}
                        setCurrentPage={setCurrentPage}
                    />
                </div>

                {/* Search and Filters */}
                <div className="mb-6">
                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder={`Search ${type} entities...`}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1); // Reset to first page on search
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <div className="flex items-center">
                            <label htmlFor="itemsPerPage" className="mr-2 text-sm text-gray-600">Items per page:</label>
                            <select
                                id="itemsPerPage"
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1); // Reset to first page when changing items per page
                                }}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Entity List */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                    {paginatedEntities.length > 0 ? (
                        <ul className="space-y-4">
                            {paginatedEntities.map((entity, index) => {
                                const actualIndex = entities.indexOf(entity);
                                return (
                                    <li key={index} className="border-b border-gray-200 dark:border-gray-600 pb-3">
                                        <div className="flex items-center mb-2">
                                            <input
                                                type="checkbox"
                                                id={`entity-${actualIndex}`}
                                                checked={selectedEntities[`${actualIndex}`] || false}
                                                onChange={(e) => handleEntitySelection(actualIndex, e.target.checked)}
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
                                                        <span className="flex items-center">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedEntity({
                                                                        type: type,
                                                                        entity: entity
                                                                    });
                                                                }}
                                                                className="ml-2 text-xs text-blue-500 hover:underline"
                                                            >
                                                                Quick View
                                                            </button>
                                                            <Link
                                                                href={`/ner/entity/${type}/${actualIndex}`}
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
                                                                onClick={() => handleFeedback(actualIndex, 'up')}
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
                                                                onClick={() => handleFeedback(actualIndex, 'down')}
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
                                                {editingEntity === actualIndex && (
                                                    <div className="mt-2 space-y-2">
                                                        <select
                                                            value={entityType}
                                                            onChange={(e) => handleEntityTypeChange(e.target.value)}
                                                            className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                                                        >
                                                            <option value="">Select entity type</option>
                                                            <option value="GENE">GENE</option>
                                                            <option value="CELL_TYPE">CELL_TYPE</option>
                                                            <option value="ANATOMICAL_REGION">ANATOMICAL_REGION</option>
                                                            <option value="NEURON_TYPE">NEURON_TYPE</option>
                                                            <option value="UNCLASSIFIED">UNCLASSIFIED</option>
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={handleCorrectionSubmit}
                                                            className="px-2 py-1 bg-blue-500 text-white rounded text-sm mt-2"
                                                            disabled={!entityType}
                                                        >
                                                            Apply
                                                        </button>
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
                            })}
                        </ul>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-gray-500">No matching entities found.</p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="text-blue-500 underline mt-2"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {filteredEntities.length > itemsPerPage && (
                    <div className="flex justify-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                            disabled={currentPage === 1}
                            className={`px-3 py-1 rounded ${
                                currentPage === 1 
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-gray-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                            disabled={currentPage >= totalPages}
                            className={`px-3 py-1 rounded ${
                                currentPage >= totalPages
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            Next
                        </button>
                    </div>
                )}

                {/* Entity Detail Modal */}
                <EntityDetailModal
                    selectedEntity={selectedEntity}
                    onClose={() => setSelectedEntity(null)}
                />

                {/* Save button */}
                {allApproved && (
                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                            Save Results
                        </button>
                    </div>
                )}

                {results && (
                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                        Document: {results.documentName} • Processed at: {new Date(results.processedAt).toLocaleString()}
                    </div>
                )}
            </div>
        </div>
    );
}
