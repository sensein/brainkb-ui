"use client";
import { useState } from 'react';
import {getData} from "@/src/app/components/getData";
import {apiBaseUrl} from "next-auth/client/_utils";
import yaml from './pages-config.yml'
const TestData = () => {
  const [data, setData] = useState(null);
 const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData(null);
   const page = yaml.pages.find((page) => page.slug === "test");
    const query_to_execute = page ? page.sparql_query : "";

    const queryParameter = { sparql_query:query_to_execute};

    const baseurl = process.env.NEXT_PUBLIC_API_ADMIN_HOST;
    const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT;
    alert(endpoint)

    try {
      const response = await getData(queryParameter, endpoint, baseurl);
      setData(response);
    } catch (e) {
      const error = e as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="set-margin-hundred flex items-center justify-center h-48 mb-4 rounded bg-gray-50 dark:bg-gray-800">
          <br/>


          <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Test Data Fetch</h1><br/>
          <br/><br/><br/><br/>
          {yaml.pages.map((page, index) => (
              <div key={index}>
                  <h2>{page.page}</h2>
                  <p>Slug: {page.slug}</p>
                  <pre>{page.sparql_query}</pre>
                  <p>Default KB: {page.default_kb.toString()}</p>
                  <p>Display
                      Columns: {page.display_column_first}, {page.display_column_second}{page.display_column_third ? `, ${page.display_column_third}` : ''}</p>
              </div>
          ))}



        <button onClick={fetchData} disabled={loading}
                  className="max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
              {loading ? 'Loading...' : 'Fetch Data'}
          </button>
          {error && <p style={{color: 'red'}}>Error: {error}</p>}
          {data && <pre>{JSON.stringify(data, null, 2)}</pre>}

          <br/>

      </div>
  );
};

export default TestData;
