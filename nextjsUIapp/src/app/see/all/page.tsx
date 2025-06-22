"use client";

import { useState, useEffect } from "react";
import { Entity, ProcessingResult, StatusFilter } from "@/src/app/see/types";
import { fetchEntityData, saveEntityData } from "@/src/app/see/services/dataService";
import { calculateStats, downloadAsCSV, downloadAsJSON } from "@/src/app/see/utils/entityUtils";
import StatsSection from "@/src/app/see/components/StatsSection";
import EntityList from "@/src/app/see/components/EntityList";
import EntityDetailModal from "@/src/app/see/components/EntityDetailModal";
import Link from "next/link";
import EntityTypeDropdown from "@/src/app/see/components/EntityTypeDropdown";

export default function NamedEntityRecognitionViewerAll() {
    const [results, setResults] = useState<ProcessingResult | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeEntityType, setActiveEntityType] = useState<string | null>(null);
    const [showAllEntityTypes, setShowAllEntityTypes] = useState<boolean>(false);
    const [selectedEntity, setSelectedEntity] = useState<{type: string, entity: Entity} | null>(null);
    const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilter>('all');
    const [selectedEntities, setSelectedEntities] = useState<{[key: string]: boolean}>({});
    const [selectAll, setSelectAll] = useState<boolean>(true);
    const [editingEntity, setEditingEntity] = useState<{type: string, index: number} | null>(null);
    const [correction, setCorrection] = useState<string>('');
    const [entityType, setEntityType] = useState<string>('');
    const [allApproved, setAllApproved] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    const [stats, setStats] = useState({
        totalEntities: 0,
        approvedEntities: 0,
        correctedEntities: 0,
        pendingReview: 0
    });
    const [entityTypes, setEntityTypes] = useState<string[]>([]);

    // Fetch data on component mount and handle URL filter parameter
    useEffect(() => {
        fetchData();

        // Check for filter parameter in URL
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const filterParam = urlParams.get('filter');

            if (filterParam && ['all', 'approved', 'corrected', 'pending'].includes(filterParam as StatusFilter)) {
                setActiveStatusFilter(filterParam as StatusFilter);
            }
        }
    }, []);

    // Fetch data from API
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await fetchEntityData();
            setResults(data);

            // Initialize selected entities
            const initialSelectedEntities: {[key: string]: boolean} = {};
            Object.keys(data.entities).forEach(type => {
                setEntityTypes(Object.keys(data.entities));
                data.entities[type].forEach((_, index) => {
                    initialSelectedEntities[`${type}-${index}`] = true;
                });
            });
            setSelectedEntities(initialSelectedEntities);

            // Set the first entity type as active
            if (data.entities && Object.keys(data.entities).length > 0) {
                setActiveEntityType(Object.keys(data.entities)[0]);
            }

            // Calculate stats
            const calculatedStats = calculateStats(data);
            setStats(calculatedStats);

        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to fetch entity data. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle entity selection
    const handleEntitySelection = (type: string, index: number, checked: boolean) => {
        setSelectedEntities(prev => ({
            ...prev,
            [`${type}-${index}`]: checked
        }));

        // Update selectAll state
        const allSelected = Object.values({
            ...selectedEntities,
            [`${type}-${index}`]: checked
        }).every(value => value);

        setSelectAll(allSelected);
    };

    // Handle select all
    const handleSelectAll = (checked: boolean) => {
        if (!results) return;

        const newSelectedEntities: {[key: string]: boolean} = {};
        Object.keys(results.entities).forEach(type => {
            results.entities[type].forEach((_, index) => {
                newSelectedEntities[`${type}-${index}`] = checked;
            });
        });

        setSelectedEntities(newSelectedEntities);
        setSelectAll(checked);
    };

    // Handle feedback (thumbs up/down)
    const handleFeedback = (type: string | null, index: number, feedback: 'up' | 'down') => {
        if (!results || !type) return;

        const updatedResults = { ...results };
        updatedResults.entities[type][index].feedback = feedback;

        // If thumbs down, set up for editing
        if (feedback === 'down') {
            setEditingEntity({ type, index });
            setCorrection(updatedResults.entities[type][index].text);
            // Set initial entity type to the current type or empty string
            setEntityType(updatedResults.entities[type][index].entityType || '');
        } else if (editingEntity?.type === type && editingEntity?.index === index) {
            // If changing from down to up, clear editing state
            setEditingEntity(null);
        }

        // Check if all entities have thumbs up
        const allUp = Object.keys(updatedResults.entities).every(entityType =>
            updatedResults.entities[entityType].every(entity => entity.feedback === 'up')
        );

        setAllApproved(allUp);
        setResults(updatedResults);

        // Update stats
        const calculatedStats = calculateStats(updatedResults);
        setStats(calculatedStats);
    };

    // Handle entity type change
    const handleEntityTypeChange = (type: string) => {
        setEntityType(type);
    };

    // Handle entity type submission
    const handleCorrectionSubmit = () => {
        if (!editingEntity || !results) return;

        const { type, index } = editingEntity;
        const updatedResults = { ...results };
        const entity = updatedResults.entities[type][index];

        // Update with entity type only
        entity.entityType = entityType;
        entity.feedback = 'up'; // Auto-approve after classification

        setResults(updatedResults);
        setEditingEntity(null);

        // Check if all entities now have thumbs up
        const allUp = Object.keys(updatedResults.entities).every(entityType =>
            updatedResults.entities[entityType].every(entity => entity.feedback === 'up')
        );

        setAllApproved(allUp);

        // Update stats
        const calculatedStats = calculateStats(updatedResults);
        setStats(calculatedStats);
    };

    // Handle save
    const handleSave = async () => {
        if (!results) return;

        setIsLoading(true);

        try {
            await saveEntityData(results);

            // Show success message
            setError("Results saved successfully!");

            // Refresh data to show updated stats
            fetchData();
        } catch (err) {
            console.error("Error saving results:", err);
            setError("Failed to save results. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Download as CSV
    const downloadCSV = () => {
        if (!results) return;
        downloadAsCSV(results, selectedEntities);
    };

    // Download as JSON
    const downloadJSON = () => {
        if (!results) return;
        downloadAsJSON(results, selectedEntities);
    };

    return (
        <div className="flex flex-col max-w-6xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">All Named Entity Recognition (NER)</h1>

            {/* Stats Section */}
            <StatsSection
                stats={stats}
                isLoading={isLoading}
                error={error}
                activeStatusFilter={activeStatusFilter}
                setActiveStatusFilter={setActiveStatusFilter}
                setCurrentPage={setCurrentPage}
            />

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-8">
                <h2 className="text-xl font-semibold mb-4">View Specific Entity Types</h2>
                {isLoading ? (
                    <p className="text-gray-500">Loading entity types...</p>
                ) : error ? (
                    <p className="text-red-500">{error}</p>
                ) : entityTypes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {entityTypes.map((type) => (
                            <Link
                                key={type}
                                href={`/ner/entity/${type}`}
                                className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                                <h3 className="text-lg font-medium mb-2">{type}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    View all entities of type {type}
                                </p>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No entity types found.</p>
                )}

                <div className="inline-flex items-center px-1 pt-1" style={{zIndex: 999}}>
                    <EntityTypeDropdown/>
                </div>
            </div>


            {/* Results Section */}
            {isLoading ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md text-center">
                    <p className="text-gray-500">Loading entities...</p>
                </div>
            ) : error ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                    <p className="text-red-500">{error}</p>
                </div>
            ) : results && (
                <>
                    <EntityList
                        results={results}
                        isLoading={isLoading}
                        error={error}
                        activeEntityType={activeEntityType}
                        setActiveEntityType={setActiveEntityType}
                        showAllEntityTypes={showAllEntityTypes}
                        setShowAllEntityTypes={setShowAllEntityTypes}
                        activeStatusFilter={activeStatusFilter}
                        setActiveStatusFilter={setActiveStatusFilter}
                        selectedEntities={selectedEntities}
                        setSelectedEntities={setSelectedEntities}
                        selectAll={selectAll}
                        setSelectAll={setSelectAll}
                        editingEntity={editingEntity}
                        setEditingEntity={setEditingEntity}
                        correction={correction}
                        setCorrection={setCorrection}
                        entityType={entityType}
                        setEntityType={setEntityType}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        stats={stats}
                        handleEntitySelection={handleEntitySelection}
                        handleSelectAll={handleSelectAll}
                        handleFeedback={handleFeedback}
                        handleCorrectionSubmit={handleCorrectionSubmit}
                        handleEntityTypeChange={handleEntityTypeChange}
                        setSelectedEntity={setSelectedEntity}
                        downloadCSV={downloadCSV}
                        downloadJSON={downloadJSON}
                    />

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
                </>
            )}
        </div>
    );
}
