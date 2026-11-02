/**
 * Centralized environment variable configuration
 * Provides type-safe access to environment variables
 * 
 * Note: Only NEXT_PUBLIC_* variables are available in client components.
 */

interface EnvConfig {
  // API Configuration
  NEXT_PUBLIC_API_ADMIN_HOST: string;
  NEXT_PUBLIC_API_QUERY_ENDPOINT: string;
  NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT?: string;
  NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_ENDPOINT?: string;
  NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT?: string;
  NEXT_PUBLIC_API_ADMIN_INSERT_ALL_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT?: string;
  NEXT_PUBLIC_API_ADMIN_INSERT_RECOVERY_JOB_ENDPOINT?: string;
  NEXT_PUBLIC_API_ADMIN_INSERT_CHECK_RECOVERABLE_JOB_ENDPOINT?: string;
  NEXT_PUBLIC_CHAT_SERVICE_API_ENDPOINT?: string;
  NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT?: string;
  NEXT_PUBLIC_TOKEN_ENDPOINT?: string;
  NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE?: string;
  NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE?: string;
  NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE?: string;
  NEXT_PUBLIC_USER_MANAGEMENT_API_BASE?: string;
  // Host of the BrainKB MCP server; differs per deployment (sandbox vs prod).
  NEXT_PUBLIC_MCP_BASE_URL?: string;

  // Auth Configuration
  NEXT_PUBLIC_USE_BEARER_TOKEN?: string;
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
      NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT:
        process.env.NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT,
      NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_ENDPOINT:
        process.env.NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_ENDPOINT,
      NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT:
        process.env.NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT,
      NEXT_PUBLIC_API_ADMIN_INSERT_ALL_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT:
        process.env.NEXT_PUBLIC_API_ADMIN_INSERT_ALL_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT,
      NEXT_PUBLIC_API_ADMIN_INSERT_RECOVERY_JOB_ENDPOINT:
        process.env.NEXT_PUBLIC_API_ADMIN_INSERT_RECOVERY_JOB_ENDPOINT,
      NEXT_PUBLIC_API_ADMIN_INSERT_CHECK_RECOVERABLE_JOB_ENDPOINT:
        process.env.NEXT_PUBLIC_API_ADMIN_INSERT_CHECK_RECOVERABLE_JOB_ENDPOINT,
      NEXT_PUBLIC_CHAT_SERVICE_API_ENDPOINT:
        process.env.NEXT_PUBLIC_CHAT_SERVICE_API_ENDPOINT,
      NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT:
        process.env.NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT,
      NEXT_PUBLIC_TOKEN_ENDPOINT: process.env.NEXT_PUBLIC_TOKEN_ENDPOINT,
      NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE:
        process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE,
      NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE:
        process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE,
      NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE:
        process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE,
      NEXT_PUBLIC_USER_MANAGEMENT_API_BASE:
        process.env.NEXT_PUBLIC_USER_MANAGEMENT_API_BASE,
      NEXT_PUBLIC_MCP_BASE_URL: process.env.NEXT_PUBLIC_MCP_BASE_URL,
      NEXT_PUBLIC_USE_BEARER_TOKEN: process.env.NEXT_PUBLIC_USE_BEARER_TOKEN,
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

  /**
   * Base URL of the user management backend (e.g. http://localhost:8004).
   * Falls back to deriving from the token endpoint if the explicit var isn't set.
   */
  public get userManagementApiBase(): string {
    const explicit = this.config.NEXT_PUBLIC_USER_MANAGEMENT_API_BASE;
    if (explicit) return explicit.replace(/\/+$/, '');
    const tokenEndpoint = this.config.NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE;
    if (tokenEndpoint) {
      try {
        const u = new URL(tokenEndpoint);
        return `${u.protocol}//${u.host}`;
      } catch {
        /* ignored */
      }
    }
    return 'http://localhost:8004';
  }

  /**
   * Origin of the query service (e.g. http://localhost:8010), taken from the
   * SPARQL endpoint when that is an absolute URL, else NEXT_PUBLIC_API_ADMIN_HOST.
   */
  public get queryServiceBase(): string {
    const endpoint = this.config.NEXT_PUBLIC_API_QUERY_ENDPOINT;
    try {
      return new URL(endpoint).origin;
    } catch {
      return this.config.NEXT_PUBLIC_API_ADMIN_HOST.replace(/\/+$/, '');
    }
  }

  /**
   * Public MCP endpoint shown on the marketing pages, e.g.
   * https://mcp.sandbox.brainkb.org/mcp (sandbox) or
   * https://mcp.brainkb.org/mcp (production, the default).
   */
  public get mcpEndpoint(): string {
    const base = (this.config.NEXT_PUBLIC_MCP_BASE_URL || 'https://mcp.brainkb.org').replace(/\/+$/, '');
    return `${base}/mcp`;
  }

  public get taxonomyEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT;
  }

  public get namedGraphQueryEndpoint(): string | undefined {
      console.info(this.config.NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT);
    return this.config.NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT;
  }

  public get kgInsertEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_ENDPOINT;
  }

  public get kgJobStatusEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT;
  }

  public get kgAllJobsStatusEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_ADMIN_INSERT_ALL_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT;
  }

  public get kgRecoveryJobEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_ADMIN_INSERT_RECOVERY_JOB_ENDPOINT;
  }

  public get kgCheckRecoverableJobEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_API_ADMIN_INSERT_CHECK_RECOVERABLE_JOB_ENDPOINT;
  }

  public get chatServiceEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_CHAT_SERVICE_API_ENDPOINT;
  }

  /**
   * Resolves an environment variable by its name (string)
   * This is useful when the env var name comes from configuration (e.g., YAML)
   * @param envVarName - The name of the environment variable (e.g., "NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT")
   * @returns The value of the environment variable, or undefined if not found
   */
  public resolveEnvVar(envVarName: string): string | undefined {
    // Map of env var names to their getter methods
    const envVarMap: Record<string, () => string | undefined> = {
      'NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT': () => this.namedGraphQueryEndpoint,
      'NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_ENDPOINT': () => this.kgInsertEndpoint,
      'NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT': () => this.kgJobStatusEndpoint,
      'NEXT_PUBLIC_CHAT_SERVICE_API_ENDPOINT': () => this.chatServiceEndpoint,
      'NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT': () => this.taxonomyEndpoint,
      'NEXT_PUBLIC_TOKEN_ENDPOINT': () => this.tokenEndpoint,
      'NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE': () => this.tokenEndpointMLService,
      'NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE': () => this.tokenEndpointQueryService,
      'NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE': () => this.tokenEndpointUserManagementService,
      'NEXT_PUBLIC_API_ADMIN_HOST': () => this.apiHost,
      'NEXT_PUBLIC_MCP_BASE_URL': () => this.config.NEXT_PUBLIC_MCP_BASE_URL,
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

