import { env } from '@/src/config/env';
import { BaseApiService } from '@/src/services/api/base-service';

/**
 * Query Service for SPARQL queries
 * Extends BaseApiService to share common API logic
 */
class ApiService extends BaseApiService {
  private static instance: ApiService;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  private constructor() {
    super();
    console.info("=====================ApiService Constructor ==================");
    console.info("Token Endpoint:", env.tokenEndpointQueryService);
    console.info("Use Bearer Token:", env.useBearerToken);
    console.info("Query Endpoint:", env.get('NEXT_PUBLIC_API_QUERY_ENDPOINT'));
    console.info("=====================ApiService Constructor ==================");
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  protected getBaseEndpoint(): string | undefined {
    return env.apiHost;
  }

  protected getTokenEndpointType(): 'ml' | 'query' | 'default' {
    return 'query';
  }

  /**
   * Execute a SPARQL query or simple GET request
   * @param queryParameter - Query parameters (for SPARQL) or empty object (for simple GET)
   * @param endpoint - Optional custom endpoint URL
   * @param useAuth - Whether to use authentication (default: true)
   * @param tokenEndpointType - Token endpoint type: 'ml' for ML service, 'query' for query service, 'default' for default (default: uses getTokenEndpointType() which returns 'query')
   */
  public async query(
    queryParameter: Record<string, string> = {},
    endpoint?: string,
    useAuth: boolean = true,
    tokenEndpointType?: 'ml' | 'query' | 'default'
  ): Promise<any> {
    try {
      console.info("=====================ApiService.query called ==================");
      console.info("Query parameters keys:", Object.keys(queryParameter));
      console.info("SPARQL Query (from parameters):", queryParameter.sparql_query);
      const defaultEndpoint = env.get('NEXT_PUBLIC_API_QUERY_ENDPOINT') || 'http://localhost:8010/api/query/sparql/';
      console.info("Endpoint:", endpoint || defaultEndpoint);
      console.info("Use Auth:", useAuth);
      console.info("Token Endpoint Type:", tokenEndpointType || this.getTokenEndpointType());

      const apiEndpoint = endpoint || env.get('NEXT_PUBLIC_API_QUERY_ENDPOINT') || 'http://localhost:8010/api/query/sparql/';

      // Build query string - only add if there are parameters
      const queryString = new URLSearchParams(queryParameter).toString();
      const urlWithQuery = queryString
        ? `${apiEndpoint}?${queryString}`
        : apiEndpoint;

      console.info("Full URL (first 500 chars):", urlWithQuery.substring(0, 500));
      console.info("Full URL length:", urlWithQuery.length);
      console.info("Making GET request...");

      // Determine which token endpoint to use
      // If explicitly provided, use it; otherwise use the service default (from getTokenEndpointType)
      const finalTokenEndpoint = tokenEndpointType || this.getTokenEndpointType();
      
      // Check if auth should be enabled based on the token endpoint type
      const shouldUseAuth = useAuth && env.useBearerToken && (
        (finalTokenEndpoint === 'query' && !!env.tokenEndpointQueryService) ||
        (finalTokenEndpoint === 'ml' && !!env.tokenEndpointMLService) ||
        (finalTokenEndpoint === 'default' && !!env.tokenEndpoint)
      );

      // Use base service's requestFullUrl method with dynamic auth
      const jsonResponse = await this.requestFullUrl<any>(urlWithQuery, {
        method: 'GET',
        useAuth: shouldUseAuth,
        tokenEndpoint: finalTokenEndpoint,
      });

      console.info("Response received, status:", jsonResponse?.status);
      console.info("Response has message:", !!jsonResponse?.message);
      console.info("=====================ApiService.query completed ==================");
      return jsonResponse;
    } catch (error) {
      const err = error as Error;
      console.error("=====================ApiService.query ERROR ==================");
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      console.error("=====================ApiService.query ERROR ==================");
      throw new Error(`API Error: ${err.message}`);
    }
  }

  /**
   * Execute a query with custom endpoint
   * @param queryParameter - Query parameters (for SPARQL) or empty object (for simple GET)
   * @param endpoint - Optional custom endpoint URL
   * @param useAuth - Whether to use authentication (default: true)
   * @param tokenEndpointType - Token endpoint type: 'ml' for ML service, 'query' for query service, 'default' for default (default: uses getTokenEndpointType() which returns 'query')
   */
  public async queryWithCustomEndpoint(
    queryParameter: Record<string, string> = {},
    endpoint?: string,
    useAuth: boolean = true,
    tokenEndpointType?: 'ml' | 'query' | 'default'
  ): Promise<any> {
    try {
      const apiEndpoint = endpoint || env.get('NEXT_PUBLIC_API_QUERY_ENDPOINT');

      const queryString = new URLSearchParams(queryParameter).toString();
      const urlWithQuery = queryString
        ? `${apiEndpoint}?${queryString}`
        : apiEndpoint;

      // Determine which token endpoint to use
      const finalTokenEndpoint = tokenEndpointType || this.getTokenEndpointType();
      
      // Check if auth should be enabled based on the token endpoint type
      const shouldUseAuth = useAuth && env.useBearerToken && (
        (finalTokenEndpoint === 'query' && !!env.tokenEndpointQueryService) ||
        (finalTokenEndpoint === 'ml' && !!env.tokenEndpointMLService) ||
        (finalTokenEndpoint === 'default' && !!env.tokenEndpoint)
      );

      return await this.requestFullUrl<any>(urlWithQuery, {
        method: 'GET',
        useAuth: shouldUseAuth,
        tokenEndpoint: finalTokenEndpoint,
      });
    } catch (error) {
      const err = error as Error;
      throw new Error(`API Error: ${err.message}`);
    }
  }
}

export default ApiService;
