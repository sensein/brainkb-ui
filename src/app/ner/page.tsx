"use client";
import {useState, useEffect, useMemo} from 'react';
import {Database, Loader2, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Search} from "lucide-react";
import Link from "next/link";

const ITEMS_PER_PAGE = 50;

// Simplified NER data headers to display
const NER_HEADERS = [
    "Entity",
    "Label",
    "Paper Title",
    "Judge Score"
];

// Helper function to get array value (first element if array, otherwise the value itself)
const getValue = (field: any): string => {
    if (Array.isArray(field)) {
        return field.length > 0 ? String(field[0]) : '';
    }
    return field ? String(field) : '';
};

// Helper function to format date
const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateString;
    }
};

const NER = () => {
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
            const endpoint = process.env.NEXT_PUBLIC_NER_GET_ENDPOINT;
            if (!endpoint) {
                throw new Error('NEXT_PUBLIC_NER_GET_ENDPOINT environment variable is not set');
            }
            
            const { fetchPaginatedDataWithoutToken } = await import('@/src/utils/api/api-client-without-token');
            
            console.info("NER: Fetching data from API route");
            console.info("NER: Skip:", skip, "Limit:", ITEMS_PER_PAGE, "Search:", search);

            const result = await fetchPaginatedDataWithoutToken({
                endpoint: '/api/ner/withouttoken',
                limit: ITEMS_PER_PAGE,
                skip,
                search: search.trim() || undefined,
                params: { endpoint }, // Pass endpoint as query param
            });

            console.info("NER: API response received");
            console.info("NER: Result success:", result.success);
            console.info("NER: Result data type:", Array.isArray(result.data) ? 'array' : typeof result.data);
            console.info("NER: Result data length:", Array.isArray(result.data) ? result.data.length : 'N/A');
            console.info("NER: Total:", result.total);
            console.info("NER: Has more:", result.has_more);

            if (result.success && Array.isArray(result.data)) {
                // Always replace data for pagination (don't append)
                setData(result.data);
                setTotalCount(result.total || result.data.length);
                setHasMore(result.has_more || false);
            } else {
                throw new Error(result.error || 'Invalid response format: data is not an array');
            }
        } catch (e) {
            const error = e as Error;
            console.error("NER: Error in fetchData:", error);
            console.error("NER: Error message:", error.message);
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
        const currentPageData = data;

        return (
            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-700">
                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-gray-200">
                            <tr>
                                {NER_HEADERS.map((header, index) => (
                                    <th key={index} className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentPageData.map((item, index) => {
                                const uniqueKey = item._id || index;
                                const entity = getValue(item.entity);
                                const label = getValue(item.label);
                                const paperTitle = getValue(item.paper_title);
                                const judgeScore = getValue(item.judge_score);
                                
                                return (
                                <tr key={uniqueKey} className="hover:bg-sky-50/50 transition-colors duration-150">
                                    <td className="px-6 py-4">
                                        <Link 
                                            href={`/ner/terms/${encodeURIComponent(uniqueKey)}`}
                                            className="font-medium text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                                        >
                                            {entity || '-'}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {label || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-md">
                                        <span className="text-gray-700 truncate block" title={paperTitle}>
                                            {paperTitle || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {judgeScore ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                                {judgeScore}
                                            </span>
                                        ) : (
                                            <span className="text-gray-500">-</span>
                                        )}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
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
                            Neuroscientific Named Entity Recognition (NER) Terms
                        </h1>
                        <p className="text-sky-100 text-base leading-relaxed">
                            Browse and search extracted neuroscientific named entities from research papers.
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="grid fix-left-margin grid-cols-1">
                {/* Search Bar */}
                {!loading && !error && data.length > 0 && (
                    <div className="mb-6">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search entities, labels, papers, DOIs..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="block w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                            />
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
                        <p className="text-gray-600">Loading NER data...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 mb-6">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                            <div>
                                <h3 className="text-lg font-semibold text-red-800">Error Loading Data</h3>
                                <p className="text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {renderTable()}

                        {data.length > 0 && (
                            <nav className="flex items-center flex-wrap md:flex-row justify-between pt-6 gap-4"
                                 aria-label="Table navigation">
                                <div className="text-sm text-gray-600">
                                    Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span
                                    className="font-semibold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> of <span
                                    className="font-semibold text-gray-900">{totalCount}</span> entries
                                    {searchQuery.trim() && (
                                        <span className="text-gray-500"> (filtered by: "{searchQuery}")</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({length: Math.min(totalPages, 10)}, (_, index) => {
                                            let pageNum;
                                            if (totalPages <= 10) {
                                                pageNum = index + 1;
                                            } else if (currentPage <= 5) {
                                                pageNum = index + 1;
                                            } else if (currentPage >= totalPages - 4) {
                                                pageNum = totalPages - 9 + index;
                                            } else {
                                                pageNum = currentPage - 5 + index;
                                            }
                                            return (
                                                <button
                                                    key={index}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                        currentPage === pageNum
                                                            ? 'bg-sky-600 text-white shadow-md'
                                                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                    aria-current={currentPage === pageNum ? 'page' : undefined}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </nav>
                        )}

                        {!loading && !error && data.length === 0 && (
                            <>
                                {searchQuery.trim() !== "" ? (
                                    <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                                        <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                        <p className="text-xl font-semibold text-gray-600 mb-2">No results found</p>
                                        <p className="text-gray-500">Try adjusting your search query.</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                                        <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                        <p className="text-xl font-semibold text-gray-600 mb-2">No NER data available</p>
                                        <p className="text-gray-500">There are no named entity recognition entries yet.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default NER;

