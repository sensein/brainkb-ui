"use client";
import {useState, useEffect} from 'react';
import {getData} from "@/src/app/components/utils/getData";
import yaml from "@/src/config/yaml/config-knowledgebases.yaml";
import SideBarKBFromConfig from "@/src/app/components/layout/SideBarKBFromConfig";

const ITEMS_PER_PAGE = 50;

const Assertions = (
) => {
    // these are retained here because later we would like to implement the pagination
    const [data, setData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagetitle, setPageTitle] = useState("");
    const [pagesubtitle, setSubPageTitle] = useState("");
    const [entityPageSlug, setEntityPageSlug] = useState("");


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
                            <td key={headerIndex} className="px-6 py-4">
                                {headerIndex === 0 ? (
                                    <a href={`knowledge-base/${entityPageSlug}/${encodeURIComponent(item[header]?.value)}`}
                                       rel="noopener noreferrer">
                                        {item[header]?.value.substring(item[header]?.value.lastIndexOf('/') + 1)}
                                    </a>
                                ) : (
                                    item[header]?.value.substring(item[header]?.value.lastIndexOf('/') + 1)
                                )}

                            </td>
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
                            On this page, you'll find all the assertions extracted from the paper, along with their corresponding links to the evidence. Our team is actively working on this, and we anticipate releasing the first version by May 30, 2025. Please check back for updates!
<br/>
Would you like to contribute? If so, we’d love your support—feel free to get involved! Please contact tekraj@mit.edu.
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
                               Showing <span
                                className="font-semibold text-gray-900 dark:text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span
                                className="font-semibold text-gray-900 dark:text-white">{Math.min(currentPage * ITEMS_PER_PAGE, data.length)}</span> of <span
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

export default Assertions;

