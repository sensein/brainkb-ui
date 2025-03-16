"use client";

import { useState } from "react";
import { Entity, EntityResults, ProcessingResult, StatusFilter } from "@/src/app/ner/types";
import StatusFilterTabs from "./StatusFilterTabs";
import EntityTypeTabs from "./EntityTypeTabs";
import EntityItem from "./EntityItem";
import PaginationControls from "./PaginationControls";

interface EntityListProps {
    results: ProcessingResult;
    isLoading: boolean;
    error: string | null;
    activeEntityType: string | null;
    setActiveEntityType: (type: string | null) => void;
    showAllEntityTypes: boolean;
    setShowAllEntityTypes: (show: boolean) => void;
    activeStatusFilter: StatusFilter;
    setActiveStatusFilter: (filter: StatusFilter) => void;
    selectedEntities: {[key: string]: boolean};
    setSelectedEntities: (entities: {[key: string]: boolean}) => void;
    selectAll: boolean;
    setSelectAll: (select: boolean) => void;
    editingEntity: {type: string, index: number} | null;
    setEditingEntity: (entity: {type: string, index: number} | null) => void;
    correction: string;
    setCorrection: (correction: string) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    itemsPerPage: number;
    setItemsPerPage: (count: number) => void;
    stats: any;
    handleEntitySelection: (type: string, index: number, checked: boolean) => void;
    handleSelectAll: (checked: boolean) => void;
    handleFeedback: (type: string | null, index: number, feedback: 'up' | 'down') => void;
    handleCorrectionSubmit: () => void;
    setSelectedEntity: (entity: {type: string, entity: Entity} | null) => void;
    downloadCSV: () => void;
    downloadJSON: () => void;
}

export default function EntityList({
    results,
    isLoading,
    error,
    activeEntityType,
    setActiveEntityType,
    showAllEntityTypes,
    setShowAllEntityTypes,
    activeStatusFilter,
    setActiveStatusFilter,
    selectedEntities,
    setSelectedEntities,
    selectAll,
    setSelectAll,
    editingEntity,
    setEditingEntity,
    correction,
    setCorrection,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    stats,
    handleEntitySelection,
    handleSelectAll,
    handleFeedback,
    handleCorrectionSubmit,
    setSelectedEntity,
    downloadCSV,
    downloadJSON
}: EntityListProps) {
    // Helper function to filter entities based on status and search term
    const filterEntity = (entity: Entity) => {
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
    };

    // Get filtered entities for pagination
    const getFilteredEntities = () => {
        if (showAllEntityTypes) {
            return Object.keys(results.entities).flatMap(type => 
                results.entities[type]
                    .filter(filterEntity)
                    .map((entity, index) => ({ type, entity, index }))
            );
        } else if (activeEntityType) {
            return results.entities[activeEntityType]
                .filter(filterEntity)
                .map((entity, index) => ({ type: activeEntityType, entity, index }));
        }
        return [];
    };

    const filteredEntities = getFilteredEntities();
    const totalPages = Math.ceil(filteredEntities.length / itemsPerPage);
    const paginatedEntities = filteredEntities.slice(
        (currentPage - 1) * itemsPerPage, 
        currentPage * itemsPerPage
    );

    const handlePreviousPage = () => {
        setCurrentPage(Math.max(currentPage - 1, 1));
    };

    const handleNextPage = () => {
        setCurrentPage(Math.min(currentPage + 1, totalPages));
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Extracted Entities</h2>
                    
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
                            onClick={downloadCSV}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                        >
                            Download CSV
                        </button>
                        <button
                            onClick={downloadJSON}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                            Download JSON
                        </button>
                    </div>
                </div>
                
                {/* Search Box */}
                <div className="mb-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search entities across all types..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1); // Reset to first page on search
                                if (e.target.value.trim() !== '') {
                                    setShowAllEntityTypes(true);
                                } else {
                                    setShowAllEntityTypes(false);
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                    </div>
                    <div className="flex items-center mt-2">
                        <input
                            type="checkbox"
                            id="searchAllTypes"
                            checked={showAllEntityTypes}
                            onChange={(e) => setShowAllEntityTypes(e.target.checked)}
                            className="mr-2"
                        />
                        <label htmlFor="searchAllTypes" className="text-sm text-gray-600">
                            Search across all entity types
                        </label>
                    </div>
                </div>
                
                {/* Items Per Page Selector */}
                <div className="flex items-center justify-end mb-2">
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
                        <option value="100">100</option>
                    </select>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <StatusFilterTabs 
                stats={stats}
                activeStatusFilter={activeStatusFilter}
                onFilterChange={setActiveStatusFilter}
            />

            {/* Entity Type Tabs */}
            {!showAllEntityTypes && (
                <EntityTypeTabs 
                    entities={results.entities}
                    activeEntityType={activeEntityType}
                    onEntityTypeChange={setActiveEntityType}
                />
            )}

            {/* Entity List */}
            {(activeEntityType || showAllEntityTypes) && (
                <div className="space-y-4">
                    <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300">
                        {showAllEntityTypes ? "Search Results" : `${activeEntityType} Entities`}
                    </h3>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                        {paginatedEntities.length > 0 ? (
                            <ul className="space-y-4">
                                {paginatedEntities.map(({ type, entity, index }) => (
                                    <EntityItem
                                        key={`${type}-${index}`}
                                        type={type}
                                        entity={entity}
                                        index={index}
                                        isSelected={selectedEntities[`${type}-${index}`] || false}
                                        onSelectionChange={(checked) => handleEntitySelection(type, index, checked)}
                                        onFeedback={(feedback) => handleFeedback(type, index, feedback)}
                                        onViewDetails={() => setSelectedEntity({ type, entity })}
                                        isEditing={editingEntity?.type === type && editingEntity?.index === index}
                                        correction={correction}
                                        onCorrectionChange={setCorrection}
                                        onCorrectionSubmit={handleCorrectionSubmit}
                                    />
                                ))}
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
                </div>
            )}

            {/* Pagination Controls */}
            {filteredEntities.length > itemsPerPage && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPreviousPage={handlePreviousPage}
                    onNextPage={handleNextPage}
                />
            )}

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Document: {results.documentName} • Processed
                at: {new Date(results.processedAt).toLocaleString()}
            </div>
        </div>
    );
}
