"use client";

import { useState, useEffect } from "react";


interface Entity {
    text: string;
    start: number;
    end: number;
    confidence: number;
    sentence?: string;
    feedback?: 'up' | 'down';
    corrected?: boolean;
    originalText?: string;
    correction?: string;
}

interface EntityResults {
    [key: string]: Entity[];
}

interface ProcessingResult {
    entities: EntityResults;
    documentName: string;
    processedAt: string;
}

interface ContributionStats {
    totalEntities: number;
    approvedEntities: number;
    correctedEntities: number;
    pendingReview: number;
}

export default function NamedEntityRecognitionViewer() {
    const [results, setResults] = useState<ProcessingResult | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeEntityType, setActiveEntityType] = useState<string | null>(null);
    const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | 'approved' | 'corrected' | 'pending'>('all');
    const [selectedEntities, setSelectedEntities] = useState<{[key: string]: boolean}>({});
    const [selectAll, setSelectAll] = useState<boolean>(true);
    const [editingEntity, setEditingEntity] = useState<{type: string, index: number} | null>(null);
    const [correction, setCorrection] = useState<string>('');
    const [allApproved, setAllApproved] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    const [stats, setStats] = useState<ContributionStats>({
        totalEntities: 0,
        approvedEntities: 0,
        correctedEntities: 0,
        pendingReview: 0
    });

    // Fetch data on component mount
    useEffect(() => {
        fetchData();
    }, []);

    // Fetch data from API (using dummy data for now)
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // In a real implementation, this would be an API call
            // For now, use dummy data
            const dummyData = {
                documentName: "neuroscience-research-paper.pdf",
                processedAt: new Date().toISOString(),
                entities: {
                    GENE: [
                        {
                            text: 'BDNF',
                            start: 46,
                            end: 50,
                            confidence: 0.98,
                            sentence: "Brain-derived neurotrophic factor (BDNF) plays a crucial role in synaptic plasticity, especially within the hippocampus.",
                            feedback: 'up' as 'up'
                        },
                        {
                            text: 'APOE',
                            start: 206,
                            end: 210,
                            confidence: 0.97,
                            sentence: "Additionally, mutations in the APOE gene have been linked to neurodegenerative disorders, impacting astrocytes and microglia function.",
                            feedback: 'up' as 'up'
                        },
                        {
                            text: 'GRIN2B',
                            start: 440,
                            end: 446,
                            confidence: 0.96,
                            sentence: "Understanding the role of genes like GRIN2B in synaptic modulation provides deeper insight into cognitive functions and psychiatric conditions.",
                            feedback: 'down' as 'down',
                            corrected: true,
                            originalText: 'GRIN2B'
                        }
                    ],
                    CELL_TYPE: [
                        {
                            text: 'astrocytes',
                            start: 247,
                            end: 257,
                            confidence: 0.95,
                            sentence: "Additionally, mutations in the APOE gene have been linked to neurodegenerative disorders, impacting astrocytes and microglia function.",
                            feedback: 'up' as 'up'
                        },
                        {
                            text: 'microglia',
                            start: 262,
                            end: 270,
                            confidence: 0.96,
                            sentence: "Additionally, mutations in the APOE gene have been linked to neurodegenerative disorders, impacting astrocytes and microglia function.",
                            feedback: 'up' as 'up'
                        }
                    ],
                    ANATOMICAL_REGION: [
                        {
                            text: 'hippocampus',
                            start: 82,
                            end: 93,
                            confidence: 0.97,
                            sentence: "Brain-derived neurotrophic factor (BDNF) plays a crucial role in synaptic plasticity, especially within the hippocampus.",
                            feedback: 'up' as 'up'
                        },
                        {
                            text: 'prefrontal cortex',
                            start: 159,
                            end: 177,
                            confidence: 0.95,
                            sentence: "Research suggests that pyramidal neurons in the prefrontal cortex are heavily influenced by BDNF signaling.",
                            feedback: 'down' as 'down'
                        },
                        {
                            text: 'amygdala',
                            start: 303,
                            end: 311,
                            confidence: 0.94,
                            sentence: "The amygdala also shows significant changes in connectivity due to alterations in dopaminergic neurons.",
                            feedback: 'up' as 'up'
                        }
                    ],
                    NEURON_TYPE: [
                        {
                            text: 'pyramidal neurons',
                            start: 114,
                            end: 131,
                            confidence: 0.95,
                            sentence: "Research suggests that pyramidal neurons in the prefrontal cortex are heavily influenced by BDNF signaling.",
                            feedback: 'up' as 'up'
                        },
                        {
                            text: 'dopaminergic neurons',
                            start: 326,
                            end: 346,
                            confidence: 0.96,
                            sentence: "The amygdala also shows significant changes in connectivity due to alterations in dopaminergic neurons.",
                            feedback: 'up' as 'up'
                        }
                    ]
                }
            };

            setResults(dummyData as ProcessingResult);

            // Initialize selected entities
            const initialSelectedEntities: {[key: string]: boolean} = {};
            Object.keys(dummyData.entities).forEach(type => {
                dummyData.entities[type].forEach((entity, index) => {
                    initialSelectedEntities[`${type}-${index}`] = true;
                });
            });
            setSelectedEntities(initialSelectedEntities);

            // Set the first entity type as active
            if (dummyData.entities && Object.keys(dummyData.entities).length > 0) {
                setActiveEntityType(Object.keys(dummyData.entities)[0]);
            }

            // Calculate stats
            let total = 0;
            let approved = 0;
            let corrected = 0;
            let pending = 0;

            Object.keys(dummyData.entities).forEach(type => {
                dummyData.entities[type].forEach(entity => {
                    total++;
                    if (entity.feedback === 'up') {
                        approved++;
                        if (entity.corrected) {
                            corrected++;
                        }
                    } else if (entity.feedback === 'down') {
                        pending++;
                    }
                });
            });

            setStats({
                totalEntities: total,
                approvedEntities: approved,
                correctedEntities: corrected,
                pendingReview: pending
            });

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
        updateStats(updatedResults);
    };

    // Handle correction submission
    const handleCorrectionSubmit = () => {
        if (!editingEntity || !results) return;

        const { type, index } = editingEntity;
        const updatedResults = { ...results };
        const entity = updatedResults.entities[type][index];

        // Store original text if not already stored
        if (!entity.originalText) {
            entity.originalText = entity.text;
        }

        // Update with correction
        entity.correction = correction;
        entity.corrected = true;
        entity.feedback = 'up'; // Auto-approve after correction

        setResults(updatedResults);
        setEditingEntity(null);

        // Check if all entities now have thumbs up
        const allUp = Object.keys(updatedResults.entities).every(entityType =>
            updatedResults.entities[entityType].every(entity => entity.feedback === 'up')
        );

        setAllApproved(allUp);

        // Update stats
        updateStats(updatedResults);
    };

    // Handle save
    const handleSave = async () => {
        if (!results) return;

        setIsLoading(true);

        try {
            // In a real implementation, this would be an API call to save the feedback and corrections
            // For now, just simulate a delay
            await new Promise(resolve => setTimeout(resolve, 1000));

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

    // Update stats based on current results
    const updateStats = (data: ProcessingResult) => {
        let total = 0;
        let approved = 0;
        let corrected = 0;
        let pending = 0;

        Object.keys(data.entities).forEach(type => {
            data.entities[type].forEach(entity => {
                total++;
                if (entity.feedback === 'up') {
                    approved++;
                    if (entity.corrected) {
                        corrected++;
                    }
                } else if (entity.feedback === 'down') {
                    pending++;
                }
            });
        });

        setStats({
            totalEntities: total,
            approvedEntities: approved,
            correctedEntities: corrected,
            pendingReview: pending
        });
    };

    // Download as CSV
    const downloadCSV = () => {
        if (!results) return;

        // Prepare CSV content
        let csvContent = "Type,Text,Confidence,Feedback,Sentence\n";

        Object.keys(results.entities).forEach(type => {
            results.entities[type].forEach((entity, index) => {
                if (selectedEntities[`${type}-${index}`]) {
                    // Clean sentence text for CSV (remove newlines, escape quotes)
                    const cleanSentence = entity.sentence
                        ? entity.sentence.replace(/\n/g, ' ').replace(/"/g, '""')
                        : '';

                    csvContent += `${type},"${entity.text}",${(entity.confidence * 100).toFixed(1)}%,${entity.feedback || 'none'},"${cleanSentence}"\n`;
                }
            });
        });

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `ner-results-${results.documentName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Download as JSON
    const downloadJSON = () => {
        if (!results) return;

        // Prepare JSON content
        const jsonData: any = {
            documentName: results.documentName,
            processedAt: results.processedAt,
            entities: {}
        };

        Object.keys(results.entities).forEach(type => {
            jsonData.entities[type] = [];

            results.entities[type].forEach((entity, index) => {
                if (selectedEntities[`${type}-${index}`]) {
                    jsonData.entities[type].push(entity);
                }
            });
        });

        // Create and download file
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `ner-results-${results.documentName}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col max-w-6xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Named Entity Recognition Viewer</h1>

            {/* Stats Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-6">
                <h2 className="text-lg font-semibold mb-4">Contribution Statistics</h2>

                {isLoading ? (
                    <p className="text-gray-500">Loading statistics...</p>
                ) : error ? (
                    <p className="text-red-500">{error}</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{stats.totalEntities}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Total Entities</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-300">{stats.approvedEntities}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Approved</p>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">{stats.correctedEntities}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Corrected</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-red-600 dark:text-red-300">{stats.pendingReview}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Pending Review</p>
                        </div>
                    </div>
                )}
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
                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Search entities..."
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
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                        <nav className="-mb-px flex space-x-8">
                            {/* Always show All tab */}
                            <button
                                onClick={() => setActiveStatusFilter('all')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeStatusFilter === 'all'
                                        ? "border-blue-500 text-blue-500"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                All ({stats.totalEntities})
                            </button>

                            {/* Only show Approved tab if there are approved entities */}
                            {stats.approvedEntities > 0 && (
                                <button
                                    onClick={() => setActiveStatusFilter('approved')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                        activeStatusFilter === 'approved'
                                            ? "border-green-500 text-green-500"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    Approved ({stats.approvedEntities})
                                </button>
                            )}

                            {/* Only show Corrected tab if there are corrected entities */}
                            {stats.correctedEntities > 0 && (
                                <button
                                    onClick={() => setActiveStatusFilter('corrected')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                        activeStatusFilter === 'corrected'
                                            ? "border-yellow-500 text-yellow-500"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    Corrected ({stats.correctedEntities})
                                </button>
                            )}

                            {/* Only show Pending Review tab if there are pending entities */}
                            {stats.pendingReview > 0 && (
                                <button
                                    onClick={() => setActiveStatusFilter('pending')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                        activeStatusFilter === 'pending'
                                            ? "border-red-500 text-red-500"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    Pending Review ({stats.pendingReview})
                                </button>
                            )}
                        </nav>
                    </div>

                    {/* Entity Type Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                        <nav className="-mb-px flex space-x-8">
                            {Object.keys(results.entities)
                                // Only show entity types that have entities
                                .filter(type => results.entities[type].length > 0)
                                .map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setActiveEntityType(type)}
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
                    {activeEntityType && (
                        <div className="space-y-4">
                            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300">
                                {activeEntityType} Entities
                            </h3>

                            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                                {results.entities[activeEntityType].length > 0 ? (
                                    <ul className="space-y-4">
                                        {results.entities[activeEntityType]
                                            .filter(entity => {
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
                                            })
                                            // Pagination
                                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                            .map((entity, index) => (
                                            <li key={index} className="border-b border-gray-200 dark:border-gray-600 pb-3">
                                                <div className="flex items-center mb-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`entity-${activeEntityType}-${index}`}
                                                        checked={selectedEntities[`${activeEntityType}-${index}`] || false}
                                                        onChange={(e) => handleEntitySelection(activeEntityType, index, e.target.checked)}
                                                        className="mr-3"
                                                    />
                                                    <div className="flex-1 flex flex-col">
                                                        <div className="flex justify-between items-center">
                                                            <span className={`text-sm font-medium ${(entity.correction || entity.corrected) ? 'bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded' : ''}`}>
                                                                {entity.correction || entity.text}
                                                                {(entity.correction || entity.corrected) && (
                                                                    <span className="text-xs text-gray-500 ml-2">
                                                                        (corrected from: <span className="line-through">{entity.originalText || entity.text}</span>)
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <div className="flex items-center">
                                                                <div className="flex space-x-2 mr-3">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleFeedback(activeEntityType, index, 'up')}
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
                                                                        onClick={() => handleFeedback(activeEntityType, index, 'down')}
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

                                                        {/* Correction input field */}
                                                        {editingEntity?.type === activeEntityType && editingEntity?.index === index && (
                                                            <div className="mt-2 flex items-center space-x-2">
                                                                <input
                                                                    type="text"
                                                                    value={correction}
                                                                    onChange={(e) => setCorrection(e.target.value)}
                                                                    className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                                                                    placeholder="Enter correct term"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={handleCorrectionSubmit}
                                                                    className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
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
                                        ))}

                                        {/* No results message */}
                                        {results.entities[activeEntityType]
                                            .filter(entity => {
                                                const statusMatch =
                                                    activeStatusFilter === 'all' ? true :
                                                    activeStatusFilter === 'approved' ? entity.feedback === 'up' :
                                                    activeStatusFilter === 'corrected' ? entity.corrected :
                                                    activeStatusFilter === 'pending' ? entity.feedback === 'down' :
                                                    true;

                                                const searchMatch = searchTerm === '' ? true :
                                                    entity.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    (entity.correction && entity.correction.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                                    (entity.sentence && entity.sentence.toLowerCase().includes(searchTerm.toLowerCase()));

                                                return statusMatch && searchMatch;
                                            }).length === 0 && (
                                            <li className="text-center py-4">
                                                <p className="text-gray-500">No matching entities found.</p>
                                                {searchTerm && (
                                                    <button
                                                        onClick={() => setSearchTerm('')}
                                                        className="text-blue-500 underline mt-2"
                                                    >
                                                        Clear search
                                                    </button>
                                                )}
                                            </li>
                                        )}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        No {activeEntityType} entities found in the document.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {activeEntityType && results.entities[activeEntityType] &&
                     results.entities[activeEntityType].filter(entity => {
                        const statusMatch =
                            activeStatusFilter === 'all' ? true :
                            activeStatusFilter === 'approved' ? entity.feedback === 'up' :
                            activeStatusFilter === 'corrected' ? entity.corrected :
                            activeStatusFilter === 'pending' ? entity.feedback === 'down' :
                            true;

                        const searchMatch = searchTerm === '' ? true :
                            entity.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (entity.correction && entity.correction.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (entity.sentence && entity.sentence.toLowerCase().includes(searchTerm.toLowerCase()));

                        return statusMatch && searchMatch;
                    }).length > itemsPerPage && (
                        <div className="flex justify-center mt-6 space-x-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                                Page {currentPage} of {Math.ceil(
                                    (activeEntityType ? results.entities[activeEntityType] : []).filter(entity => {
                                        const statusMatch =
                                            activeStatusFilter === 'all' ? true :
                                            activeStatusFilter === 'approved' ? entity.feedback === 'up' :
                                            activeStatusFilter === 'corrected' ? entity.corrected :
                                            activeStatusFilter === 'pending' ? entity.feedback === 'down' :
                                            true;

                                        const searchMatch = searchTerm === '' ? true :
                                            entity.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (entity.correction && entity.correction.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                            (entity.sentence && entity.sentence.toLowerCase().includes(searchTerm.toLowerCase()));

                                        return statusMatch && searchMatch;
                                    }).length / itemsPerPage
                                )}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => {
                                    const filteredEntities = (activeEntityType ? results.entities[activeEntityType] : []).filter(entity => {
                                        const statusMatch =
                                            activeStatusFilter === 'all' ? true :
                                            activeStatusFilter === 'approved' ? entity.feedback === 'up' :
                                            activeStatusFilter === 'corrected' ? entity.corrected :
                                            activeStatusFilter === 'pending' ? entity.feedback === 'down' :
                                            true;

                                        const searchMatch = searchTerm === '' ? true :
                                            entity.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (entity.correction && entity.correction.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                            (entity.sentence && entity.sentence.toLowerCase().includes(searchTerm.toLowerCase()));

                                        return statusMatch && searchMatch;
                                    });
                                    const maxPage = Math.ceil(filteredEntities.length / itemsPerPage);
                                    return Math.min(prev + 1, maxPage);
                                })}
                                disabled={
                                    currentPage >= Math.ceil(
                                        (activeEntityType ? results.entities[activeEntityType] : []).filter(entity => {
                                            const statusMatch =
                                                activeStatusFilter === 'all' ? true :
                                                activeStatusFilter === 'approved' ? entity.feedback === 'up' :
                                                activeStatusFilter === 'corrected' ? entity.corrected :
                                                activeStatusFilter === 'pending' ? entity.feedback === 'down' :
                                                true;

                                            const searchMatch = searchTerm === '' ? true :
                                                entity.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                (entity.correction && entity.correction.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                                (entity.sentence && entity.sentence.toLowerCase().includes(searchTerm.toLowerCase()));

                                            return statusMatch && searchMatch;
                                        }).length / itemsPerPage
                                    )
                                }
                                className={`px-3 py-1 rounded ${
                                    currentPage >= Math.ceil(
                                        (activeEntityType ? results.entities[activeEntityType] : []).filter(entity => {
                                            const statusMatch = 
                                                activeStatusFilter === 'all' ? true :
                                                activeStatusFilter === 'approved' ? entity.feedback === 'up' :
                                                activeStatusFilter === 'corrected' ? entity.corrected :
                                                activeStatusFilter === 'pending' ? entity.feedback === 'down' :
                                                true;
                                            
                                            const searchMatch = searchTerm === '' ? true :
                                                entity.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                (entity.correction && entity.correction.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                                (entity.sentence && entity.sentence.toLowerCase().includes(searchTerm.toLowerCase()));
                                            
                                            return statusMatch && searchMatch;
                                        }).length / itemsPerPage
                                    )
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                            >
                                Next
                            </button>
                        </div>
                    )}

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

                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                        Document: {results.documentName} • Processed
                        at: {new Date(results.processedAt).toLocaleString()}
                    </div>
                </div>
            )}
        </div>
    );
}
