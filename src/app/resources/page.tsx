"use client";
import {useState, useEffect, useMemo} from 'react';
import {Database, Loader2, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Search} from "lucide-react";
import Link from "next/link";

const ITEMS_PER_PAGE = 50;

// Simplified Resource data headers to display
const RESOURCE_HEADERS = [
    "Name",
    "Category",
    "Type",
    "Judge Score"
];

// Helper function to get array value (first element if array, otherwise the value itself)
const getValue = (field: any): string => {
    if (Array.isArray(field)) {
        return field.length > 0 ? String(field[0]) : '';
    }
    return field ? String(field) : '';
};

// Helper function to extract resource data from nested structure
const extractResourceData = (item: any) => {
    const resourceData = item?.judged_structured_information?.judge_resource?.["1"]?.[0];
    if (!resourceData) return null;
    
    return {
        _id: item._id,
        name: resourceData.name,
        description: resourceData.description,
        type: resourceData.type,
        category: resourceData.category,
        target: resourceData.target,
        specific_target: resourceData.specific_target,
        mapped_target_concept: resourceData.mapped_target_concept,
        mapped_specific_target_concept: resourceData.mapped_specific_target_concept,
        url: resourceData.url,
        judge_score: resourceData.judge_score,
        mentions: resourceData.mentions,
        documentName: item.documentName,
        contributed_by: item.contributed_by,
        created_at: item.created_at,
        updated_at: item.updated_at,
        processedAt: item.processedAt,
        history: item.history,
        version: item.version
    };
};

const Resources = () => {
    const [data, setData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    const fetchData = async (skip: number = 0, search: string = '') => {
        setLoading(true);
        setError(null);

        try {
            // Use API route without token authentication
            const endpoint = process.env.NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT;
            if (!endpoint) {
                throw new Error('NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT environment variable is not set');
            }
            
            const { fetchPaginatedDataWithoutToken } = await import('@/src/utils/api/api-client-without-token');
            
            console.info("Resources: Fetching data from API route");
            console.info("Resources: Skip:", skip, "Limit:", ITEMS_PER_PAGE, "Search:", search);

            const result = await fetchPaginatedDataWithoutToken({
                endpoint: '/api/resources/withouttoken',
                limit: String(ITEMS_PER_PAGE),
                skip: String(skip),
                search: search.trim() || undefined,
                params: { endpoint }, // Pass endpoint as query param
            }) as { success: boolean; data?: any[]; total?: number; has_more?: boolean; error?: string };

            console.info("Resources: API response received");
            console.info("Resources: Result success:", result.success);
            console.info("Resources: Result data type:", Array.isArray(result.data) ? 'array' : typeof result.data);
            console.info("Resources: Result data length:", Array.isArray(result.data) ? result.data.length : 'N/A');
            console.info("Resources: Total:", result.total);
            console.info("Resources: Has more:", result.has_more);

            if (result.success && Array.isArray(result.data)) {
                // Extract resource data from nested structure
                const extractedData = result.data
                    .map(extractResourceData)
                    .filter((item: any) => item !== null);
                
                // Always replace data for pagination (don't append)
                setData(extractedData);
                setTotalCount(result.total || extractedData.length);
                setHasMore(result.has_more || false);
            } else {
                throw new Error(result.error || 'Invalid response format: data is not an array');
            }
        } catch (e) {
            const error = e as Error;
            console.error("Resources: Error in fetchData:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch data when page or search changes
    useEffect(() => {
        const skip = (currentPage - 1) * ITEMS_PER_PAGE;
        fetchData(skip, searchQuery);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, searchQuery]);

    // Reset to page 1 when search changes
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);
    
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const renderTable = () => {
        if (!data || !Array.isArray(data) || data.length === 0) return null;

        // Data is already paginated from the server
        const paginatedData = data;

        return (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {RESOURCE_HEADERS.map((header) => (
                                <th
                                    key={header}
                                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700"
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {paginatedData.map((item, index) => {
                            const uniqueKey = item._id || `${item.name}-${index}`;
                            const name = getValue(item.name);
                            const category = getValue(item.category);
                            const type = getValue(item.type);
                            const judgeScore = getValue(item.judge_score);

                            return (
                                <tr key={uniqueKey} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <Link 
                                            href={`/resources/${encodeURIComponent(uniqueKey)}`}
                                            className="font-medium text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                                        >
                                            {name || '-'}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{category || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{type || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{judgeScore || '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="kb-page-margin">
            {/* Hero Section */}
            <div className="grid fix-left-margin grid-cols-1 mb-8">
                <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-blue-500 to-emerald-500 rounded-2xl shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-600/20 to-transparent"></div>
                    <div className="relative px-8 py-12">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                            Structured Resources
                        </h1>
                        <p className="text-sky-100 text-base leading-relaxed">
                            Browse extracted resources from neuroscience publications, including models, code, datasets, and benchmarks.
                        </p>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="grid fix-left-margin grid-cols-1 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Search resources by name, category, type, description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Loading State */}
            {loading && data.length === 0 && (
                <div className="grid fix-left-margin grid-cols-1">
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
                        <p className="text-gray-600">Loading resources...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="grid fix-left-margin grid-cols-1 mb-6">
                    <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                            <div>
                                <h3 className="text-lg font-semibold text-red-800">Error Loading Data</h3>
                                <p className="text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="grid fix-left-margin grid-cols-1">
                {!loading && !error && renderTable()}

                {/* Empty State */}
                {!loading && !error && (!data || data.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-lg">
                        <Database className="w-16 h-16 text-gray-400 mb-4" />
                        <p className="text-gray-600 text-lg">No resources found</p>
                    </div>
                )}

                {/* Pagination */}
                {!loading && !error && data.length > 0 && (
                    <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} resources
                            {searchQuery.trim() && ` (filtered by: "${searchQuery}")`}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-sm text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Resources;

