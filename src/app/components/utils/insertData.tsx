import { postData } from '../../../utils/api/api-client';

/**
 * Insert data to an endpoint with authentication
 * @deprecated Use postData from @/src/utils/api/api-client directly
 */
export async function insertData(formData: unknown, endpoint: string) {
  try {
    console.log('Inserting data to:', endpoint);
    const response = await postData(endpoint, formData, {
      useAuth: true,
      tokenEndpointType: 'query',
    });
    return response;
  } catch (error) {
    const err = error as Error;
    throw new Error('Error: ' + err.message);
  }
}
