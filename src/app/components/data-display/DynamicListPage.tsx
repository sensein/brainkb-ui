"use client";
import { useState, useEffect } from 'react';
import { Database, Loader2, AlertCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { ListPageConfig } from '@/src/types/page-config';

interface DynamicListPageProps {
  config: ListPageConfig;
}

const ITEMS_PER_PAGE = 50;

// Helper function to get array value (first element if array, otherwise the value itself)
const getValue = (field: any): string => {
  if (Array.isArray(field)) {
    return field.length > 0 ? String(field[0]) : '';
  }
  return field ? String(field) : '';
};

export default function DynamicListPage({ config }: DynamicListPageProps) {
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const itemsPerPage = config.itemsPerPage || ITEMS_PER_PAGE;

  const fetchData = async (skip: number = 0, search: string = '') => {
    setLoading(true);
    setError(null);

    try {
      const { dataSource } = config;
      let result: any;

      if (dataSource.type === 'api-get') {
         //           @/src/utils/api/api-client-without-token
        const { fetchPaginatedData } = await import('@/src/utils/api/api-client');
        
        // Determine if we should use auth based on config or default to true
        const useAuth = (dataSource.params as any)?.useAuth !== false;
        const tokenEndpointType = (dataSource.params as any)?.tokenEndpointType || 'query';

        // Get the API route (e.g., "/api/ner/withouttoken" or "/api/ner")
        let apiRoute = dataSource.endpoint.startsWith('/api/') 
          ? dataSource.endpoint 
          : `/api/${dataSource.endpoint}`;
        
        // If auth is enabled, automatically switch from /withouttoken route to authenticated route
        if (useAuth && apiRoute.includes('/withouttoken')) {
          apiRoute = apiRoute.replace('/withouttoken', '');
          console.log('[DynamicListPage] Switched to authenticated route:', apiRoute);
        }
        
        // Get the backend endpoint URL from environment variable
        const envVarName = (dataSource.params as any)?.envVarName || dataSource.endpoint;
        
        // Use the env config manager to resolve the env var by name
        const { clientEnv } = await import('@/src/config/env');
        const backendEndpoint = clientEnv.resolveEnvVar(envVarName);
        
        if (!backendEndpoint) {
          throw new Error(`${envVarName} environment variable is not set`);
        }

        // Filter out internal config params that shouldn't be sent to the API
        const { tokenEndpointType: _, useAuth: __, envVarName: ___, ...apiParams } = (dataSource.params as any) || {};

        // Debug logging for token endpoint type
        console.log('[DynamicListPage] Token endpoint type:', tokenEndpointType);
        console.log('[DynamicListPage] Use auth:', useAuth);
        console.log('[DynamicListPage] API route:', apiRoute);
        console.log('[DynamicListPage] Backend endpoint:', backendEndpoint);
        console.log('[DynamicListPage] API params (filtered):', apiParams);

        result = await fetchPaginatedData({
          endpoint: apiRoute,
          limit: String(itemsPerPage),
          skip: String(skip),
          search: search.trim() || undefined,
          params: { 
            endpoint: backendEndpoint, 
            ...(useAuth ? { tokenEndpointType } : {}), // Only pass tokenEndpointType if auth is enabled
            ...apiParams 
          },
        }, useAuth, tokenEndpointType) as { success: boolean; data?: any[]; total?: number; has_more?: boolean; error?: string };

        if (result.success && Array.isArray(result.data)) {
          let processedData = result.data;
          
          // Apply data extractor if provided
          if (dataSource.dataExtractor) {
            processedData = result.data.map(dataSource.dataExtractor).filter((item: any) => item !== null);
          }
          
          setData(processedData);
          setTotalCount(result.total || processedData.length);
          setHasMore(result.has_more || false);
        } else {
          throw new Error(result.error || 'Invalid response format: data is not an array');
        }
      } else if (dataSource.type === 'sparql') {
        // SPARQL queries are handled via POST to knowledge-base API
        const sparqlQuery = dataSource.params?.sparqlQuery;
        
        if (!sparqlQuery || sparqlQuery.trim() === '') {
          throw new Error('SPARQL query is required but not provided in configuration');
        }
        
        const { postData } = await import('@/src/utils/api/api-client');
        
        result = await postData<{ success: boolean; data: any; headers?: any[]; error?: string }>(
          '/api/knowledge-base',
          {
            slug: dataSource.params?.slug || 'default',
            sparqlQuery: sparqlQuery,
          },
          {
            useAuth: false,
          }
        );

        if (result.success) {
          const dataArray = Array.isArray(result.data) ? result.data : [];
          setData(dataArray);
          
          if (result.headers) {
            setHeaders(Array.isArray(result.headers) ? result.headers : []);
          } else if (dataSource.headersExtractor) {
            setHeaders(dataSource.headersExtractor(result));
          }
          
          setTotalCount(dataArray.length);
          setHasMore(false);
        } else {
          throw new Error(result.error || "Failed to fetch data");
        }
      }
    } catch (e) {
      const error = e as Error;
      console.error("DynamicListPage: Error in fetchData:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when page or search changes
  useEffect(() => {
    // For SPARQL, fetch once on mount and do client-side filtering/pagination
    if (config.dataSource.type === 'sparql') {
      if (data.length === 0) {
        // Only fetch if we don't have data yet
        fetchData(0, '');
      }
      return;
    }

    // For API sources, fetch with pagination
    const skip = (currentPage - 1) * itemsPerPage;
    fetchData(skip, searchQuery);
  }, [currentPage, searchQuery, config.dataSource.type]);

  // Reset to page 1 when search changes (only for non-SPARQL)
  useEffect(() => {
    if (config.dataSource.type !== 'sparql' && currentPage !== 1 && searchQuery.trim()) {
      setCurrentPage(1);
    }
  }, [searchQuery, config.dataSource.type]);

  // For SPARQL results, apply client-side pagination
  const filteredData = config.dataSource.type === 'sparql' && searchQuery.trim()
    ? data.filter((item: any) => {
        return Object.values(item).some((val: any) => {
          const str = val?.value || String(val || '');
          return str.toLowerCase().includes(searchQuery.toLowerCase());
        });
      })
    : data;

  const totalPages = Math.ceil((config.dataSource.type === 'sparql' ? filteredData.length : totalCount) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = config.dataSource.type === 'sparql' 
    ? filteredData.slice(startIndex, endIndex)
    : data;

  const renderTable = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // For SPARQL results, use headers from API
    const displayHeaders = config.dataSource.type === 'sparql' && headers.length > 0
      ? headers
      : config.columns.map(col => col.label);

    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-gray-200">
              <tr>
                {displayHeaders.map((header, index) => (
                  <th key={index} className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPageData.map((item, index) => {
                const uniqueKey = item._id || item.id?.value || index;
                
                return (
                  <tr key={uniqueKey} className="hover:bg-sky-50/50 transition-colors duration-150">
                    {config.dataSource.type === 'sparql' && headers.length > 0 ? (
                      // SPARQL result rendering
                      headers.map((header, headerIndex) => {
                        const cellValue = item[header]?.value || '';
                        const displayValue = cellValue ? cellValue.substring(cellValue.lastIndexOf('/') + 1) : '';
                        
                        return (
                          <td key={headerIndex} className="px-6 py-4 whitespace-nowrap">
                            {headerIndex === 0 ? (
                              <a
                                href={`/knowledge-base/${config.dataSource.params?.entityPageSlug || config.slug || 'default'}/${encodeURIComponent(cellValue)}`}
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium transition-colors group"
                              >
                                {displayValue}
                              </a>
                            ) : (
                              <span className="text-gray-700">{displayValue}</span>
                            )}
                          </td>
                        );
                      })
                    ) : (
                      // Regular column-based rendering
                      config.columns.map((column, colIndex) => {
                        const value = item[column.key];
                        const displayValue = getValue(value);
                        
                        let cellContent: React.ReactNode = displayValue || '-';
                        
                        // Handle badge type
                        if ((column as any).type === 'badge') {
                          const badgeValue = Array.isArray(value) ? value[0] : value;
                          if (badgeValue) {
                            const variant = (column as any).badgeVariant || 'secondary';
                            cellContent = (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                variant === 'default' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {String(badgeValue)}
                              </span>
                            );
                          } else {
                            cellContent = '-';
                          }
                        } else if ((column as any).type === 'text') {
                          const textValue = Array.isArray(value) ? value[0] : value;
                          cellContent = textValue ? (
                            <span className="text-gray-700 truncate block" title={String(textValue)}>
                              {String(textValue)}
                            </span>
                          ) : '-';
                        }
                        
                        if (column.render) {
                          cellContent = column.render(value, item);
                        }

                        return (
                          <td key={colIndex} className="px-6 py-4">
                            {column.link ? (
                              <Link
                                href={`${column.link.basePath}/${encodeURIComponent(uniqueKey)}`}
                                className="font-medium text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                              >
                                {cellContent}
                              </Link>
                            ) : (
                              cellContent
                            )}
                          </td>
                        );
                      })
                    )}
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
      {config.hero?.enabled !== false && (
        <div className="grid fix-left-margin grid-cols-1 mb-8">
          <div className={`relative overflow-hidden ${config.hero?.gradient || 'bg-gradient-to-br from-sky-500 via-blue-500 to-emerald-500'} rounded-2xl shadow-xl`}>
            <div className="absolute inset-0 bg-gradient-to-r from-sky-600/20 to-transparent"></div>
            <div className="relative px-8 py-12">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                {config.title}
              </h1>
              <p className="text-sky-100 text-base leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="grid fix-left-margin grid-cols-1">
        {/* Search Bar */}
        {!loading && !error && data.length > 0 && config.search?.enabled !== false && (
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={config.search?.placeholder || "Search..."}
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
            <p className="text-gray-600">Loading {config.title.toLowerCase()}...</p>
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

            {(config.dataSource.type === 'sparql' ? filteredData.length : data.length) > 0 && (
              <nav className="flex items-center flex-wrap md:flex-row justify-between pt-6 gap-4"
                   aria-label="Table navigation">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span
                  className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, config.dataSource.type === 'sparql' ? filteredData.length : totalCount)}</span> of <span
                  className="font-semibold text-gray-900">{config.dataSource.type === 'sparql' ? filteredData.length : totalCount}</span> entries
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

            {!loading && !error && (config.dataSource.type === 'sparql' ? filteredData.length : data.length) === 0 && (
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
                    <p className="text-xl font-semibold text-gray-600 mb-2">No data available</p>
                    <p className="text-gray-500">There are no entries yet.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

