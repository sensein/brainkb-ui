import { useMemo } from 'react';

type SparqlBinding = Record<string, { value: string; [key: string]: any }>;

/**
 * Filters table data based on a search query across all columns
 * @param data - Array of data items to filter
 * @param headers - Array of column headers to search through
 * @param searchQuery - The search query string
 * @returns Filtered array of data items
 */
export function useFilteredTableData(
    data: SparqlBinding[],
    headers: string[],
    searchQuery: string
): SparqlBinding[] {
    return useMemo(() => {
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery === "") {
            return data;
        }
        const lowerCaseQuery = trimmedQuery.toLowerCase();
        return data.filter((item: SparqlBinding) => {
            return headers.some((header) => {
                const value = item[header]?.value || "";
                return value.toLowerCase().includes(lowerCaseQuery);
            });
        });
    }, [data, headers, searchQuery]);
}

