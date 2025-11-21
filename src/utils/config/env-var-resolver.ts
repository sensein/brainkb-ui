/**
 * Resolves environment variable names to their actual values
 * Uses the env config manager for type-safe access
 */
import { clientEnv } from '@/src/config/env';

/**
 * Maps environment variable names to their getter methods in the env config
 */
const envVarMap: Record<string, () => string | undefined> = {
  'NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT': () => clientEnv.resourceEndpoint,
  'NEXT_PUBLIC_API_ADMIN_GET_NER_ENDPOINT': () => clientEnv.nerGetEndpoint,
  'NEXT_PUBLIC_API_ADMIN_SAVE_STRUCTURED_RESOURCE_ENDPOINT': () => clientEnv.saveStructuredResourceEndpoint,
  'NEXT_PUBLIC_API_ADMIN_EXTRACT_STRUCTURED_RESOURCE_ENDPOINT': () => clientEnv.extractStructuredResourceEndpoint,
  'NEXT_PUBLIC_API_PDF2REPROSCHEMA_ENDPOINT': () => clientEnv.pdf2ReproschemaEndpoint,
  'NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT': () => clientEnv.namedGraphQueryEndpoint,
  'NEXT_PUBLIC_API_NER_ENDPOINT': () => clientEnv.nerEndpoint,
  'NEXT_PUBLIC_CHAT_SERVICE_API_ENDPOINT': () => clientEnv.chatServiceEndpoint,
  'NEXT_PUBLIC_NER_SAVE_ENDPOINT': () => clientEnv.nerSaveEndpoint,
  'NEXT_PUBLIC_STRUCTSENSE_ENDPOINT': () => clientEnv.structsenseEndpoint,
  'NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT': () => clientEnv.taxonomyEndpoint,
  'NEXT_PUBLIC_TOKEN_ENDPOINT': () => clientEnv.tokenEndpoint,
  'NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE': () => clientEnv.tokenEndpointMLService,
  'NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE': () => clientEnv.tokenEndpointQueryService,
  'NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE': () => clientEnv.tokenEndpointUserManagementService,
  'NEXT_PUBLIC_JWT_USER': () => clientEnv.jwtUser,
  'NEXT_PUBLIC_JWT_PASSWORD': () => clientEnv.jwtPassword,
};

/**
 * Resolves an environment variable name to its actual value
 * @param envVarName - The name of the environment variable (e.g., "NEXT_PUBLIC_API_ADMIN_GET_NER_ENDPOINT")
 * @returns The value of the environment variable, or undefined if not found
 */
export function resolveEnvVar(envVarName: string): string | undefined {
  // First try the mapping (preferred method)
  const getter = envVarMap[envVarName];
  if (getter) {
    return getter();
  }
  
  // Fallback to direct process.env access (for any unmapped vars)
  // This works because Next.js embeds NEXT_PUBLIC_* vars at build time
  return (process.env as any)[envVarName] as string | undefined;
}

