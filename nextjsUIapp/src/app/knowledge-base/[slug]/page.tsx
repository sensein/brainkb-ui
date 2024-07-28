"use client";
import {useState, useEffect} from 'react';
import {getData} from "@/src/app/components/getData";
import yaml from "@/src/app/components/config-knowledgebases.yaml";
import SideBarKBFromConfig from "@/src/app/components/SideBarKBFromConfig";

const ITEMS_PER_PAGE = 50;

const KbIndividualPageAllData = (
    {
        params,
    }: {
        params: {
            slug: string;
        }
    }
) => {
    const [data, setData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagetitle, setPageTitle] = useState("");
    const [pagesubtitle, setSubPageTitle] = useState("");

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        setData([]);
        setHeaders([]);
        setPageTitle(null);
        setSubPageTitle(null);
        const page = yaml.pages.find((page) => page.slug === params.slug);
        const query_to_execute = page ? page.sparql_query : "";
        console.log(query_to_execute);
        const page_title = page ? page.page : "";
        const page_sub_title = page ? page.description : "";
        setPageTitle(page_title);
        setSubPageTitle(page_sub_title);

        const queryParameter = {sparql_query: query_to_execute};

        const baseurl = process.env.NEXT_PUBLIC_API_ADMIN_HOST;
        const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT;

        console.log('Fetching data with parameters:', queryParameter, endpoint, baseurl);

        try {
            const response = await getData(queryParameter, endpoint, baseurl);
            console.log('Raw response:', response);

            if (response.status === 'success' && response.message?.results?.bindings) {
                const bindings = response.message.results.bindings;
                const vars = response.message.head.vars;
                console.log('Bindings:', bindings);
                console.log('Vars:', vars);
                setHeaders(vars);
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

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const currentPageData = data.slice(startIndex, endIndex);

        return (
            <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead
                    className="sticky top-0 text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    {headers.map((header, index) => (
                        <th key={index} className="border border-gray-400 px-4 py-2">{header}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {currentPageData.map((item, index) => (
                    <tr key={index}
                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        {headers.map((header, headerIndex) => (
                            <td key={headerIndex}
                                className="px-6 py-4">{item[header]?.value.substring(item[header]?.value.lastIndexOf('/') + 1)}</td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        );
    };

    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);

    return (
        <div className="kb-page-margin">
          <SideBarKBFromConfig/>

          <div className="grid fix-left-margin grid-cols-1 ">
            <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
              <div className="text-center">
                <p className="text-2xl text-gray-400 dark:text-gray-500">
                  {pagetitle}
                </p>
                <p className="text-gray-400 dark:text-gray-500">
                  {pagesubtitle}
                </p>
              </div>
            </div>
          </div>
          <div className="grid fix-left-margin grid-cols-1">


            <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
              {renderTable()}

              {data.length > 0 && (
                  <nav className="flex items-center flex-column flex-wrap md:flex-row justify-between pt-4"
                       aria-label="Table navigation">
    <span
        className="text-sm font-normal text-gray-500 dark:text-gray-400 mb-4 md:mb-0 block w-full md:inline md:w-auto">
      Showing <span className="font-semibold text-gray-900 dark:text-white">1-10</span> of <span
        className="font-semibold text-gray-900 dark:text-white">{data.length}</span>
    </span>
                    <ul className="inline-flex -space-x-px rtl:space-x-reverse text-sm h-8">
                      <li>
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="flex items-center justify-center px-3 h-8 ms-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                        >
                          Previous
                        </button>
                      </li>
                      {Array.from({length: totalPages}, (_, index) => (
                          <li key={index}>
                            <button
                                onClick={() => setCurrentPage(index + 1)}
                                className={`flex items-center justify-center px-3 h-8 leading-tight ${currentPage === index + 1 ? 'text-blue-600 border border-gray-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700' : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700'} dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white`}
                                aria-current={currentPage === index + 1 ? 'page' : undefined}
                            >
                              {index + 1}
                            </button>
                          </li>
                      ))}
                      <li>
                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
              )}

            </div>
          </div>

        </div>
    );
};

export default KbIndividualPageAllData;
