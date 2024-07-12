export async function getData(query_parameter, endpoint) {
  try {
    const apiEndpointbase = process.env.NEXT_PUBLIC_API_ADMIN_HOST as string;
    if (!apiEndpointbase) {
      throw new Error('NEXT_PUBLIC_API_ADMIN_HOST is not defined in the environment variables');
    }

    const api_endpoint = `${apiEndpointbase}/${endpoint}`;
    alert(api_endpoint)

    // Construct query string from query_parameter object
    const queryString = new URLSearchParams(query_parameter).toString();
    const urlWithQuery = `${api_endpoint}?${queryString}`;

    console.log(urlWithQuery);
    const response = await fetch(urlWithQuery, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },

    });

    if (!response.ok) {
      throw new Error('Network response was not ok. Status: ' + response.status);
    }

    return await response.json(); // Assuming you want to parse the response as JSON
  } catch (error) {
    throw new Error('Error: ' + error.message);
  }
}
