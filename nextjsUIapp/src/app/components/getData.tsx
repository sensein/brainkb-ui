
export async function getData(query_parameter = {}, endpoint: string, baseurl: string) {
  try {
    const apiEndpointbase =  baseurl
    if (!apiEndpointbase) {
      throw new Error('NEXT_PUBLIC_API_ADMIN_HOST is not defined in the environment variables');
    }

    const api_endpoint = `${apiEndpointbase}/${endpoint}`;


    // Construct query string from query_parameter object if it is not empty
    const queryString = new URLSearchParams(query_parameter).toString();
    const urlWithQuery = queryString ? `${api_endpoint}?${queryString}` : api_endpoint;



    const response = await fetch(urlWithQuery, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Network response was not ok. Status: '+ urlWithQuery+ ' - ' + response.status);
    }

    return await response.json();
  } catch (e) {
    const error = e as Error;
    throw new Error('Error: ' + error.message);
  }
}
