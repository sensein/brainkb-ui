"use client";

import { ContributionStats } from "@/src/app/ner/types";

interface StatsSectionProps {
    stats: ContributionStats;
    isLoading: boolean;
    error: string | null;
}

export default function StatsSection({ stats, isLoading, error }: StatsSectionProps) {
    return (
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
    );
}
