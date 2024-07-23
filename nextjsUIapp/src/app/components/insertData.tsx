
export async function insertData(formData, endpoint) {
  try {
    const apiEndpointbase = process.env.NEXT_PUBLIC_API_ADMIN_HOST as string;
    if (!apiEndpointbase) {
      throw new Error('NEXT_PUBLIC_API_ADMIN_HOST is not defined in the environment variables');
    }

    const api_endpoint = `${apiEndpointbase}/${endpoint}`
    console.log(api_endpoint);
    const response = await fetch(`${api_endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok. Status: '+ response.status);
    }

    return await response;
  } catch (e) {
     const error = e as Error;
    throw new Error('Error: ' + error.message);
  }
}
