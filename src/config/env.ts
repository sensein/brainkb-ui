/**
 * Centralized environment variable configuration
 * Provides type-safe access to environment variables
 */

interface EnvConfig {
  // API Configuration
  NEXT_PUBLIC_API_ADMIN_HOST: string;
  NEXT_PUBLIC_API_QUERY_ENDPOINT: string;
  NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT?: string;
  NEXT_PUBLIC_API_ADMIN_GET_NER_ENDPOINT?: string;
  NEXT_PUBLIC_TOKEN_ENDPOINT?: string;
  NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE?: string;
  NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE?: string;

  // Auth Configuration
  NEXT_PUBLIC_JWT_USER?: string;
  NEXT_PUBLIC_JWT_PASSWORD?: string;
  NEXT_PUBLIC_USE_BEARER_TOKEN?: string;

  // Feature flags and API keys
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
      NEXT_PUBLIC_TOKEN_ENDPOINT: process.env.NEXT_PUBLIC_TOKEN_ENDPOINT,
      NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE:
        process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE,
      NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE:
        process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE,
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

  public get nerApiKey(): string | undefined {
    return this.config.NER_API_KEY;
  }

  public get resourceEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT;
  }

  public get nerEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_ADMIN_GET_NER_ENDPOINT;
  }
}

export const env = EnvConfigManager.getInstance();
export type { EnvConfig };

