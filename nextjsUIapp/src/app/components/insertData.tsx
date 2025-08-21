
export async function insertData(formData, endpoint) {
  try {
    const api_endpoint = endpoint;
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
