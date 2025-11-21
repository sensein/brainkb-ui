import { env } from '@/src/config/env';
import { TokenResponse } from '@/src/types/api';

class ApiService {
  private static instance: ApiService;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  private constructor() {
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

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const tokenEndpoint = env.tokenEndpointQueryService;
    const jwtUser = env.jwtUser;
    const jwtPassword = env.jwtPassword;

    if (!tokenEndpoint || !jwtUser || !jwtPassword) {
      throw new Error("JWT authentication credentials not configured");
    }

    try {
      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: jwtUser,
          password: jwtPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const tokenData: TokenResponse = await response.json();
      this.token = tokenData.access_token;
      this.tokenExpiry = Date.now() + (tokenData.expires_in - 300) * 1000; // refresh 5 min early
      console.info("=====================Token issue token==================");
      console.info(this.token);
      console.info("=====================Token issue token==================");

      return this.token;
    } catch (error) {
      console.error("Failed to get JWT token:", error);
      throw new Error("Authentication failed");
    }
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (env.useBearerToken && env.tokenEndpointQueryService) {
      try {
        const token = await this.getToken();
        headers["Authorization"] = `Bearer ${token}`;
      } catch (error) {
        console.warn("Failed to get bearer token, proceeding without authentication");
        // Don't throw - allow requests without auth if token fails
      }
    }

    return headers;
  }

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

      const headers = await this.getHeaders();
      console.info("Headers:", Object.keys(headers));

      const apiEndpoint = endpoint || env.get('NEXT_PUBLIC_API_QUERY_ENDPOINT') || 'https://queryservice.brainkb.org/query/sparql';

      const queryString = new URLSearchParams(queryParameter).toString();
      const urlWithQuery = queryString
        ? `${apiEndpoint}?${queryString}`
        : apiEndpoint;

      console.info("Full URL (first 500 chars):", urlWithQuery.substring(0, 500));
      console.info("Full URL length:", urlWithQuery.length);
      console.info("Making GET request...");

      const response = await fetch(urlWithQuery, {
        method: "GET",
        headers,
      });

      console.info("Response status:", response.status);
      console.info("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error text:", errorText);
        throw new Error(
          `Network response was not ok. Status: ${urlWithQuery} - ${response.status}`
        );
      }

      const jsonResponse = await response.json();
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

  public async queryWithCustomEndpoint(
    queryParameter: Record<string, string> = {},
    endpoint?: string
  ): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const apiEndpoint = endpoint || env.get('NEXT_PUBLIC_API_QUERY_ENDPOINT') || 'https://queryservice.brainkb.org/query/sparql';

      const queryString = new URLSearchParams(queryParameter).toString();
      const urlWithQuery = queryString
        ? `${apiEndpoint}?${queryString}`
        : apiEndpoint;

      const response = await fetch(urlWithQuery, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(
          `Network response was not ok. Status: ${urlWithQuery} - ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      const err = error as Error;
      throw new Error(`API Error: ${err.message}`);
    }
  }
}

export default ApiService;
