import ApiService from '@/src/services/query-service/apiService';

/**
 * Centralized data fetching function
 * Handles both SPARQL queries (with parameters) and simple GET requests (without parameters)
 * 
 * @param query_parameter - Query parameters for SPARQL queries, or empty object for simple GET requests
 * @param endpoint - Optional custom endpoint URL. If not provided, uses default SPARQL endpoint
 * @param useAuth - Whether to use authentication (default: true). Set to false for public endpoints
 * @param tokenEndpointType - Token endpoint type: 'ml' for ML service, 'query' for query service, 'default' for default (default: 'query')
 * @returns Promise with the API response
 * 
 * @example
 * // SPARQL query with query service token (default)
 * const result = await getData({ sparql_query: "SELECT * WHERE { ?s ?p ?o }" });
 *
 * 
 * // Simple GET request with query service token (default)
 * const graphs = await getData({}, "http://localhost:8010/api/query/registered-named-graphs", 'query');
 *
 * 
 * // Simple GET request without auth
 * const publicData = await getData({}, "http://localhost:8010/api/public/data", false);
 */
export async function getData(
  query_parameter: Record<string, string> = {}, 
  endpoint?: string,
  useAuth: boolean = true,
  tokenEndpointType?: 'ml' | 'query' | 'default'
) {
  try {
    const apiService = ApiService.getInstance();
    
    // Use the centralized API service with dynamic configuration
    // Supports both SPARQL queries and simple GET requests
    // Authentication can be enabled/disabled via useAuth flag (default: true)
    // Token endpoint type can be specified: 'ml', 'query', or 'default' (default: 'query')
    return await apiService.query(query_parameter, endpoint, useAuth, tokenEndpointType);

  } catch (e) {
    const error = e as Error;
    throw new Error('Error: ' + error.message);
  }
}
