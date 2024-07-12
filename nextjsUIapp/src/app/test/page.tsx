"use client";
import { useState } from 'react';
import {getData} from "@/src/app/components/getData";
const TestData = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    const queryParameter = { sparql_query: "select ?s ?p ?o where { ?s ?p ?o} limit 10"};

    const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT;
    alert(endpoint)

    try {
      const response = await getData(queryParameter, endpoint);
      setData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="flex items-center justify-center h-48 mb-4 rounded bg-gray-50 dark:bg-gray-800">
          <br/>

          <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Test Data Fetch</h1><br/>
          <button onClick={fetchData} disabled={loading}
                  className="max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
              {loading ? 'Loading...' : 'Fetch Data'}
          </button>
          {error && <p style={{color: 'red'}}>Error: {error}</p>}
          {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      </div>
  );
};

export default TestData;
