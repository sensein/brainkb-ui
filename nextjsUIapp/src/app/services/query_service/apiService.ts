interface ApiConfig {
  baseUrl: string;
  jwtUser: string;
  jwtPassword: string;
  tokenEndpoint: string;
  useBearerToken: boolean;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class ApiService {
  private static instance: ApiService;
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private config: ApiConfig;

  private constructor() {
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_API_ADMIN_HOST || "https://queryservice.brainkb.org",
      jwtUser: process.env.NEXT_PUBLIC_JWT_USER || "",
      jwtPassword: process.env.NEXT_PUBLIC_JWT_PASSWORD || "",
      tokenEndpoint: process.env.NEXT_PUBLIC_TOKEN_ENDPOINT || "",
      useBearerToken: process.env.NEXT_PUBLIC_USE_BEARER_TOKEN !== "false" // Default to true unless explicitly set to false
    };
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async getToken(): Promise<string> {
    // Check if we have a valid token
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    // Get new token
    try {
      const response = await fetch(this.config.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.config.jwtUser,
          password: this.config.jwtPassword
        })
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const tokenData: TokenResponse = await response.json();
      this.token = tokenData.access_token;
      // Set expiry to 5 minutes before actual expiry to be safe
      this.tokenExpiry = Date.now() + (tokenData.expires_in - 300) * 1000;

      return this.token;
    } catch (error) {
      console.error('Failed to get JWT token:', error);
      throw new Error('Authentication failed');
    }
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.config.useBearerToken) {
      try {
        const token = await this.getToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.warn('Failed to get bearer token, proceeding without authentication');
      }
    }

    return headers;
  }

  public async query(
    queryParameter: Record<string, string> = {}, 
    endpoint?: string,
    useBearerToken?: boolean
  ): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const apiEndpoint = endpoint 
        ? `${this.config.baseUrl}/${endpoint}`
        : `${this.config.baseUrl}/${process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql"}`;
      
      // Construct query string from query_parameter object if it is not empty
      const queryString = new URLSearchParams(queryParameter).toString();
      const urlWithQuery = queryString ? `${apiEndpoint}?${queryString}` : apiEndpoint;

      const response = await fetch(urlWithQuery, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok. Status: ${urlWithQuery} - ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      const err = error as Error;
      throw new Error(`API Error: ${err.message}`);
    }
  }

  public async queryWithCustomBaseUrl(
    queryParameter: Record<string, string> = {}, 
    endpoint?: string,
    baseUrl?: string,
    useBearerToken?: boolean
  ): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const finalBaseUrl = baseUrl || this.config.baseUrl;
      const finalEndpoint = endpoint || process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
      const apiEndpoint = `${finalBaseUrl}/${finalEndpoint}`;
      
      // Construct query string from query_parameter object if it is not empty
      const queryString = new URLSearchParams(queryParameter).toString();
      const urlWithQuery = queryString ? `${apiEndpoint}?${queryString}` : apiEndpoint;

      const response = await fetch(urlWithQuery, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok. Status: ${urlWithQuery} - ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      const err = error as Error;
      throw new Error(`API Error: ${err.message}`);
    }
  }
}

export default ApiService; 