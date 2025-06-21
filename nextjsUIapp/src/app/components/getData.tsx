import ApiService from '@/src/app/services/query_service/apiService';

export async function getData(
  query_parameter = {}, 
  endpoint?: string, 
  baseurl?: string,
  useBearerToken?: boolean
) {
  try {
    const apiService = ApiService.getInstance();
    
    // Use the centralized API service with dynamic configuration
    if (endpoint && baseurl) {
      // If both custom endpoint and baseurl are provided, use the custom method
      return await apiService.queryWithCustomBaseUrl(query_parameter, endpoint, baseurl, useBearerToken);
    } else if (endpoint) {
      // If only custom endpoint is provided, use default baseurl
      return await apiService.query(query_parameter, endpoint, useBearerToken);
    } else {
      // Use default endpoint from environment
      return await apiService.query(query_parameter, undefined, useBearerToken);
    }
  } catch (e) {
    const error = e as Error;
    throw new Error('Error: ' + error.message);
  }
}
