"use client";

import { ContributionStats, StatusFilter } from "@/src/app/ner/types";

interface StatusFilterTabsProps {
    stats: ContributionStats;
    activeStatusFilter: StatusFilter;
    onFilterChange: (filter: StatusFilter) => void;
}

export default function StatusFilterTabs({ 
    stats, 
    activeStatusFilter, 
    onFilterChange 
}: StatusFilterTabsProps) {
    return (
        <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
            <nav className="-mb-px flex space-x-8">
                {/* Always show All tab */}
                <button
                    onClick={() => onFilterChange('all')}
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
                        onClick={() => onFilterChange('approved')}
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
                        onClick={() => onFilterChange('corrected')}
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
                        onClick={() => onFilterChange('pending')}
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
    );
}
