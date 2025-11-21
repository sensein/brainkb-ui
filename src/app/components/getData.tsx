import ApiService from '@/src/services/query-service/apiService';

export async function getData(
  query_parameter = {}, 
  endpoint?: string,
  useBearerToken?: boolean
) {
  try {
    const apiService = ApiService.getInstance();
    
    // Use the centralized API service with dynamic configuration
    // Note: useBearerToken is configured via environment variables in ApiService
      return await apiService.query(query_parameter, endpoint);

  } catch (e) {
    const error = e as Error;
    throw new Error('Error: ' + error.message);
  }
}
