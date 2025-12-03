/**
 * Centralized environment variable configuration
 * Provides type-safe access to environment variables
 * 
 * Note: Only NEXT_PUBLIC_* variables are available in client components.
 * Server-only variables (like NER_API_KEY) will be undefined on the client.
 */

interface EnvConfig {
  // API Configuration
  NEXT_PUBLIC_API_ADMIN_HOST: string;
  NEXT_PUBLIC_API_QUERY_ENDPOINT: string;
  NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT?: string;
  NEXT_PUBLIC_API_ADMIN_GET_NER_ENDPOINT?: string;
  NEXT_PUBLIC_API_ADMIN_SAVE_STRUCTURED_RESOURCE_ENDPOINT?: string;
  NEXT_PUBLIC_API_ADMIN_EXTRACT_STRUCTURED_RESOURCE_ENDPOINT?: string;
  NEXT_PUBLIC_API_PDF2REPROSCHEMA_ENDPOINT?: string;
  NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT?: string;
  NEXT_PUBLIC_API_NER_ENDPOINT?: string;
  NEXT_PUBLIC_CHAT_SERVICE_API_ENDPOINT?: string;
  NEXT_PUBLIC_NER_GET_ENDPOINT?: string;
  NEXT_PUBLIC_NER_SAVE_ENDPOINT?: string;
  NEXT_PUBLIC_STRUCTSENSE_ENDPOINT?: string;
  NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT?: string;
  NEXT_PUBLIC_TOKEN_ENDPOINT?: string;
  NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE?: string;
  NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE?: string;
  NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE?: string;

  // Auth Configuration
  NEXT_PUBLIC_JWT_USER?: string;
  NEXT_PUBLIC_JWT_PASSWORD?: string;
  NEXT_PUBLIC_USE_BEARER_TOKEN?: string;

  // Server-only (will be undefined on client)
  NER_API_KEY?: string;
}

class EnvConfigManager {
  private static instance: EnvConfigManager;
  private config: EnvConfig;

  private constructor() {
    this.config = {
      NEXT_PUBLIC_API_ADMIN_HOST:
        process.env.NEXT_PUBLIC_API_ADMIN_HOST ||
        'https://queryservice.brainkb.org',
      NEXT_PUBLIC_API_QUERY_ENDPOINT:
        process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || 'query/sparql',
      NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT:
        process.env.NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT,
      NEXT_PUBLIC_API_ADMIN_GET_NER_ENDPOINT:
        process.env.NEXT_PUBLIC_API_ADMIN_GET_NER_ENDPOINT,
      NEXT_PUBLIC_API_ADMIN_SAVE_STRUCTURED_RESOURCE_ENDPOINT:
        process.env.NEXT_PUBLIC_API_ADMIN_SAVE_STRUCTURED_RESOURCE_ENDPOINT,
      NEXT_PUBLIC_API_ADMIN_EXTRACT_STRUCTURED_RESOURCE_ENDPOINT:
        process.env.NEXT_PUBLIC_API_ADMIN_EXTRACT_STRUCTURED_RESOURCE_ENDPOINT,
      NEXT_PUBLIC_API_PDF2REPROSCHEMA_ENDPOINT:
        process.env.NEXT_PUBLIC_API_PDF2REPROSCHEMA_ENDPOINT,
      NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT:
        process.env.NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT,
      NEXT_PUBLIC_API_NER_ENDPOINT:
        process.env.NEXT_PUBLIC_API_NER_ENDPOINT,
      NEXT_PUBLIC_CHAT_SERVICE_API_ENDPOINT:
        process.env.NEXT_PUBLIC_CHAT_SERVICE_API_ENDPOINT,
      NEXT_PUBLIC_NER_GET_ENDPOINT:
        process.env.NEXT_PUBLIC_NER_GET_ENDPOINT,
      NEXT_PUBLIC_NER_SAVE_ENDPOINT:
        process.env.NEXT_PUBLIC_NER_SAVE_ENDPOINT,
      NEXT_PUBLIC_STRUCTSENSE_ENDPOINT:
        process.env.NEXT_PUBLIC_STRUCTSENSE_ENDPOINT,
      NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT:
        process.env.NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT,
      NEXT_PUBLIC_TOKEN_ENDPOINT: process.env.NEXT_PUBLIC_TOKEN_ENDPOINT,
      NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE:
        process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE,
      NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE:
        process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE,
      NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE:
        process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE,
      NEXT_PUBLIC_JWT_USER: process.env.NEXT_PUBLIC_JWT_USER,
      NEXT_PUBLIC_JWT_PASSWORD: process.env.NEXT_PUBLIC_JWT_PASSWORD,
      NEXT_PUBLIC_USE_BEARER_TOKEN: process.env.NEXT_PUBLIC_USE_BEARER_TOKEN,
      NER_API_KEY: process.env.NER_API_KEY,
    };
  }

  public static getInstance(): EnvConfigManager {
    if (!EnvConfigManager.instance) {
      EnvConfigManager.instance = new EnvConfigManager();
    }
    return EnvConfigManager.instance;
  }

  public get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  // Convenience getters
  public get apiHost(): string {
    return this.config.NEXT_PUBLIC_API_ADMIN_HOST;
  }

  public get useBearerToken(): boolean {
    return this.config.NEXT_PUBLIC_USE_BEARER_TOKEN !== 'false';
  }

  public get jwtUser(): string | undefined {
    return this.config.NEXT_PUBLIC_JWT_USER;
  }

  public get jwtPassword(): string | undefined {
    return this.config.NEXT_PUBLIC_JWT_PASSWORD;
  }

  public get tokenEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_TOKEN_ENDPOINT;
  }

  public get tokenEndpointMLService(): string | undefined {
    return this.config.NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE;
  }

  public get tokenEndpointQueryService(): string | undefined {
    return this.config.NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE;
  }

  public get tokenEndpointUserManagementService(): string | undefined {
    return this.config.NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE;
  }

  public get nerApiKey(): string | undefined {
    return this.config.NER_API_KEY;
  }

  public get resourceEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT;
  }

  public get nerGetEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_ADMIN_GET_NER_ENDPOINT;
  }

  public get saveStructuredResourceEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_ADMIN_SAVE_STRUCTURED_RESOURCE_ENDPOINT;
  }

  public get nerSaveEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_NER_SAVE_ENDPOINT;
  }

  public get structsenseEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_STRUCTSENSE_ENDPOINT;
  }

  public get taxonomyEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT;
  }

  public get pdf2ReproschemaEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_PDF2REPROSCHEMA_ENDPOINT;
  }

  public get extractStructuredResourceEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_ADMIN_EXTRACT_STRUCTURED_RESOURCE_ENDPOINT;
  }

  public get namedGraphQueryEndpoint(): string | undefined {
      console.info(this.config.NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT);
    return this.config.NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT;
  }

  public get nerEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_NER_ENDPOINT;
  }

  public get chatServiceEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_CHAT_SERVICE_API_ENDPOINT;
  }

  /**
   * Resolves an environment variable by its name (string)
   * This is useful when the env var name comes from configuration (e.g., YAML)
   * @param envVarName - The name of the environment variable (e.g., "NEXT_PUBLIC_API_ADMIN_GET_NER_ENDPOINT")
   * @returns The value of the environment variable, or undefined if not found
   */
  public resolveEnvVar(envVarName: string): string | undefined {
    // Map of env var names to their getter methods
    const envVarMap: Record<string, () => string | undefined> = {
      'NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT': () => this.resourceEndpoint,
      'NEXT_PUBLIC_API_ADMIN_GET_NER_ENDPOINT': () => this.nerGetEndpoint,
      'NEXT_PUBLIC_NER_GET_ENDPOINT': () => this.config.NEXT_PUBLIC_NER_GET_ENDPOINT,
      'NEXT_PUBLIC_API_ADMIN_SAVE_STRUCTURED_RESOURCE_ENDPOINT': () => this.saveStructuredResourceEndpoint,
      'NEXT_PUBLIC_API_ADMIN_EXTRACT_STRUCTURED_RESOURCE_ENDPOINT': () => this.extractStructuredResourceEndpoint,
      'NEXT_PUBLIC_API_PDF2REPROSCHEMA_ENDPOINT': () => this.pdf2ReproschemaEndpoint,
      'NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT': () => this.namedGraphQueryEndpoint,
      'NEXT_PUBLIC_API_NER_ENDPOINT': () => this.nerEndpoint,
      'NEXT_PUBLIC_CHAT_SERVICE_API_ENDPOINT': () => this.chatServiceEndpoint,
      'NEXT_PUBLIC_NER_SAVE_ENDPOINT': () => this.nerSaveEndpoint,
      'NEXT_PUBLIC_STRUCTSENSE_ENDPOINT': () => this.structsenseEndpoint,
      'NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT': () => this.taxonomyEndpoint,
      'NEXT_PUBLIC_TOKEN_ENDPOINT': () => this.tokenEndpoint,
      'NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE': () => this.tokenEndpointMLService,
      'NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE': () => this.tokenEndpointQueryService,
      'NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE': () => this.tokenEndpointUserManagementService,
      'NEXT_PUBLIC_JWT_USER': () => this.jwtUser,
      'NEXT_PUBLIC_JWT_PASSWORD': () => this.jwtPassword,
      'NEXT_PUBLIC_API_ADMIN_HOST': () => this.apiHost,
      'NEXT_PUBLIC_API_QUERY_ENDPOINT': () => this.config.NEXT_PUBLIC_API_QUERY_ENDPOINT,
    };

    // Try the mapping first (preferred method - type-safe)
    const getter = envVarMap[envVarName];
    if (getter) {
      const value = getter();
      // If value is undefined, also try direct process.env access as fallback
      // (useful if env var was added after build but before runtime)
      if (value === undefined && typeof window !== 'undefined') {
        // Client-side: try direct access (Next.js embeds NEXT_PUBLIC_* at build time)
        return (process.env as any)[envVarName] as string | undefined;
      }
      return value;
    }

    // Fallback to direct config access
    const configValue = this.config[envVarName as keyof EnvConfig] as string | undefined;
    if (configValue !== undefined) {
      return configValue;
    }

    // Last resort: try direct process.env access (for any unmapped vars)
    if (typeof window !== 'undefined') {
      return (process.env as any)[envVarName] as string | undefined;
    }
    
    return undefined;
  }
}

// Export client-safe alias (same instance, but makes it clear it's for client use)
export const clientEnv = EnvConfigManager.getInstance();

export const env = EnvConfigManager.getInstance();
export type { EnvConfig };

