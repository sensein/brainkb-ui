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
   * Execute a SPARQL query
   */
  public async query(
    queryParameter: Record<string, string> = {},
    endpoint?: string
  ): Promise<any> {
    try {
      console.info("=====================ApiService.query called ==================");
      console.info("Query parameters keys:", Object.keys(queryParameter));
      console.info("SPARQL Query (from parameters):", queryParameter.sparql_query);
      const defaultEndpoint = env.get('NEXT_PUBLIC_API_QUERY_ENDPOINT') || 'https://queryservice.brainkb.org/query/sparql';
      console.info("Endpoint:", endpoint || defaultEndpoint);

      const apiEndpoint = endpoint || env.get('NEXT_PUBLIC_API_QUERY_ENDPOINT') || 'https://queryservice.brainkb.org/query/sparql';

      // Build query string
      const queryString = new URLSearchParams(queryParameter).toString();
      const urlWithQuery = queryString
        ? `${apiEndpoint}?${queryString}`
        : apiEndpoint;

      console.info("Full URL (first 500 chars):", urlWithQuery.substring(0, 500));
      console.info("Full URL length:", urlWithQuery.length);
      console.info("Making GET request...");

      // Use base service's requestFullUrl method
      const jsonResponse = await this.requestFullUrl<any>(urlWithQuery, {
        method: 'GET',
        useAuth: env.useBearerToken && !!env.tokenEndpointQueryService,
        tokenEndpoint: 'query',
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
   */
  public async queryWithCustomEndpoint(
    queryParameter: Record<string, string> = {},
    endpoint?: string
  ): Promise<any> {
    try {
      const apiEndpoint = endpoint || env.get('NEXT_PUBLIC_API_QUERY_ENDPOINT') || 'https://queryservice.brainkb.org/query/sparql';

      const queryString = new URLSearchParams(queryParameter).toString();
      const urlWithQuery = queryString
        ? `${apiEndpoint}?${queryString}`
        : apiEndpoint;

      return await this.requestFullUrl<any>(urlWithQuery, {
        method: 'GET',
        useAuth: env.useBearerToken && !!env.tokenEndpointQueryService,
        tokenEndpoint: 'query',
      });
    } catch (error) {
      const err = error as Error;
      throw new Error(`API Error: ${err.message}`);
    }
  }
}

export default ApiService;
