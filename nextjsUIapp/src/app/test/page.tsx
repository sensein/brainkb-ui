"use client";
import { useState, useEffect } from 'react';
import { getData } from "@/src/app/components/getData";
import yaml from './pages-config.yml';

const TestData = () => {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData([]);
    const page = yaml.pages.find((page) => page.slug === "test");
    const query_to_execute = page ? page.sparql_query : "";

    const queryParameter = { sparql_query: query_to_execute };

    const baseurl = process.env.NEXT_PUBLIC_API_ADMIN_HOST;
    const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT;

    console.log('Fetching data with parameters:', queryParameter, endpoint, baseurl);

    try {
      const response = await getData(queryParameter, endpoint, baseurl);
      console.log('Raw response:', response);

      if (response.status === 'success' && response.message?.results?.bindings) {
        const bindings = response.message.results.bindings;
        console.log('Bindings:', bindings);
        setData(bindings);
      } else {
        console.error('Unexpected response format:', response);
        setError("Invalid data format");
      }
    } catch (e) {
      const error = e as Error;
      console.log('Error fetching data:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderTable = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    return (
      <table className="table-auto border-collapse border border-gray-400 w-full">
        <thead>
          <tr>
            <th className="border border-gray-400 px-4 py-2">ID</th>
            <th className="border border-gray-400 px-4 py-2">Label</th>
            <th className="border border-gray-400 px-4 py-2">Category</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td className="border border-gray-400 px-4 py-2">{item.id?.value}</td>
              <td className="border border-gray-400 px-4 py-2">{item.label?.value}</td>
              <td className="border border-gray-400 px-4 py-2">{item.category?.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="set-margin-hundred flex items-center justify-center h-48 mb-4 rounded bg-gray-50 dark:bg-gray-800">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Test Data Fetch</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {renderTable()}
      {data.length > 0 && <pre className="jsondatapre">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
};

export default TestData;
