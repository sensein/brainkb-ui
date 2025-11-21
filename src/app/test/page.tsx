"use client";

import yaml from "@/src/config/yaml/pages-config-test.yaml";
import {useState, useEffect} from 'react';
import {getData} from "@/src/app/components/getData";


const ITEMS_PER_PAGE = 50;

const TestData = () => {
    const [data, setData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        setData([]);
        setHeaders([]);
        const page = yaml.pages.find((page) => page.slug === "test");
        const query_to_execute = page ? page.sparql_query : "";

        const queryParameter = {sparql_query: query_to_execute};

        try {
            const response = await getData(queryParameter);

            if (response.status === 'success' && response.message?.results?.bindings) {
                const bindings = response.message.results.bindings;
                const vars = response.message.head.vars;

                setHeaders(vars);
                setData(bindings);
            } else {

                setError("Invalid data format");
            }
        } catch (e) {
            const error = e as Error;
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

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const currentPageData = data.slice(startIndex, endIndex);

        return (
            <table className="table-auto border-collapse border border-gray-400 w-full">
                <thead>
                <tr>
                    {headers.map((header, index) => (
                        <th key={index} className="border border-gray-400 px-4 py-2">{header}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {currentPageData.map((item, index) => (
                    <tr key={index}>
                        {headers.map((header, headerIndex) => (
                            <td key={headerIndex}
                                className="border border-gray-400 px-4 py-2">{item[header]?.value}</td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        );
    };

    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);

    return (
        <div
            className="set-margin-hundred flex items-center justify-center h-48 mb-4 rounded bg-gray-50 dark:bg-gray-800">
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Test Data Fetch</h1>
            {loading && <p>Loading...</p>}
            {error && <p style={{color: 'red'}}>Error: {error}</p>}
            {renderTable()}
            {data.length > 0 && (
                <div className="pagination">
                    <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span> Page {currentPage} of {totalPages} </span>
                    <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
            {data.length > 0 && <pre className="jsondatapre">{JSON.stringify(data, null, 2)}</pre>}
        </div>
    );
};

export default TestData;
