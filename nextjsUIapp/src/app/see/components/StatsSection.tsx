"use client";

import { ContributionStats, StatusFilter } from "@/src/app/see/types";

interface StatsSectionProps {
    stats: ContributionStats;
    isLoading: boolean;
    error: string | null;
    activeStatusFilter?: StatusFilter;
    setActiveStatusFilter?: (filter: StatusFilter) => void;
    setCurrentPage?: (page: number) => void;
    customClickHandler?: (filter: StatusFilter) => void;
}

export default function StatsSection({
    stats,
    isLoading,
    error,
    activeStatusFilter = 'all',
    setActiveStatusFilter,
    setCurrentPage,
    customClickHandler
}: StatsSectionProps) {

    // Handle stat click to filter results
    const handleStatClick = (filter: StatusFilter) => {
        if (customClickHandler) {
            // If a custom click handler is provided, use it
            customClickHandler(filter);
        } else if (setActiveStatusFilter && setCurrentPage) {
            // Otherwise use the default behavior
            setActiveStatusFilter(filter);
            setCurrentPage(1); // Reset to first page when changing filter
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-6">
            <h2 className="text-lg font-semibold mb-4">Contribution Statistics</h2>

            {isLoading ? (
                <p className="text-gray-500">Loading statistics...</p>
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div
                        className={`bg-blue-50 dark:bg-blue-900 p-4 rounded-lg text-center cursor-pointer hover:shadow-md transition-shadow ${activeStatusFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => handleStatClick('all')}
                    >
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{stats.totalEntities}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Total Entities</p>
                    </div>
                    <div
                        className={`bg-green-50 dark:bg-green-900 p-4 rounded-lg text-center cursor-pointer hover:shadow-md transition-shadow ${activeStatusFilter === 'approved' ? 'ring-2 ring-green-500' : ''}`}
                        onClick={() => stats.approvedEntities > 0 && handleStatClick('approved')}
                    >
                        <p className="text-2xl font-bold text-green-600 dark:text-green-300">{stats.approvedEntities}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Approved</p>
                    </div>
                    <div
                        className={`bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg text-center cursor-pointer hover:shadow-md transition-shadow ${activeStatusFilter === 'corrected' ? 'ring-2 ring-yellow-500' : ''}`}
                        onClick={() => stats.correctedEntities > 0 && handleStatClick('corrected')}
                    >
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">{stats.correctedEntities}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Corrected</p>
                    </div>
                    <div
                        className={`bg-red-50 dark:bg-red-900 p-4 rounded-lg text-center cursor-pointer hover:shadow-md transition-shadow ${activeStatusFilter === 'pending' ? 'ring-2 ring-red-500' : ''}`}
                        onClick={() => stats.pendingReview > 0 && handleStatClick('pending')}
                    >
                        <p className="text-2xl font-bold text-red-600 dark:text-red-300">{stats.pendingReview}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Pending Review</p>
                    </div>
                </div>
            )}
        </div>
    );
}
