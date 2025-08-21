import ApiService from '../services/query_service/apiService';

export async function getData(
  query_parameter = {}, 
  endpoint?: string,
  useBearerToken?: boolean
) {
  try {
    const apiService = ApiService.getInstance();
    
    // Use the centralized API service with dynamic configuration
      return await apiService.query(query_parameter, endpoint, useBearerToken);

  } catch (e) {
    const error = e as Error;
    throw new Error('Error: ' + error.message);
  }
}
