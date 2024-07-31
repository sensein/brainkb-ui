"use client";

import yaml from "@/src/app/components/config-home.yaml";
import {useEffect, useState} from "react";
import {getData} from "@/src/app/components/getData";

export default function Home() {
    const [modelBoxCountHeaderTitle, setModelBoxCountHeaderTitle] = useState("");
    const [modelBoxCountHeaderSubTitle, setModelBoxCountHeaderSubTitle] = useState("");

    const [structuedModelHeaderTitle, setStructuedModelHeaderTitle] = useState("");
    const [structuedModelHeaderSubTitle, setStructuedModelHeaderSubTitle] = useState("");

    const [brainkbMainPageTitle, setBrainkbMainPageTitle] = useState("");
    const [brainkbMainPageSubTitle, setBrainkbMainPageSubTitle] = useState("");

    const [dataCount, setCountData] = useState<any[]>([])

    const fetchAndSetData = async () => {
        setModelBoxCountHeaderTitle("");
        setModelBoxCountHeaderSubTitle("");
        setStructuedModelHeaderTitle("");
        setStructuedModelHeaderSubTitle("");
        setBrainkbMainPageTitle("");
        setBrainkbMainPageSubTitle("");
        setCountData([]);


        const boxiconsdetailsCounter = yaml.headersboxpage.find((page) => page.slug === "statisticsboxheader");
        // console.log(boxiconsdetailsCounter);

        const page_title = boxiconsdetailsCounter ? boxiconsdetailsCounter.title : "";
        const page_sub_title = boxiconsdetailsCounter ? boxiconsdetailsCounter.subtitle : "";
        setModelBoxCountHeaderTitle(page_title);
        setModelBoxCountHeaderSubTitle(page_sub_title);

        const structuredmodelHeader = yaml.headersboxpage.find((page) => page.slug === "structuredmodelsheader");
        // console.log(structuredmodelHeader);

        const structured_page_title = structuredmodelHeader ? structuredmodelHeader.title : "";
        const structured_page_sub_title = structuredmodelHeader ? structuredmodelHeader.subtitle : "";
        setStructuedModelHeaderTitle(structured_page_title);
        setStructuedModelHeaderSubTitle(structured_page_sub_title);

        const brainkbmainpge = yaml.headersboxpage.find((page) => page.slug === "brainkbmainpge");
        // console.log(brainkbmainpge);

        const brainkb_title = brainkbmainpge ? brainkbmainpge.title : "";
        const brainkb_sub_title = brainkbmainpge ? brainkbmainpge.subtitle : "";
        setBrainkbMainPageTitle(brainkb_title);
        setBrainkbMainPageSubTitle(brainkb_sub_title);
    };

    useEffect(() => {
        fetchAndSetData();

        const fetchAllData = async () => {
            const updatedDataCount = await Promise.all(
                yaml.boxiconsstatisticscount.map(async (page) => {
                    const response = await fetchData(page.sparql_query);
                    return response ? response.message.results.bindings[0].count.value : null;
                })
            );
            setCountData(updatedDataCount);
        };

        fetchAllData();
    }, []);

    const fetchData = async (query_to_execute) => {
        const queryParameter = {sparql_query: query_to_execute};

        const baseurl = process.env.NEXT_PUBLIC_API_ADMIN_HOST || "http://3.134.90.242:8010";
        const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql"; //default is "query/sparql"

        // console.log("Fetching data with parameters:", queryParameter, endpoint, baseurl);

        try {
            const response = await getData(queryParameter, endpoint, baseurl);
            // console.log("Raw response:", response);

            if (response.status === "success" && response.message?.results?.bindings) {
                const bindings = response.message.results.bindings;
                // console.log("Bindings:", bindings[0].count.value);
                return response;
            } else {
                console.error("Unexpected response format:", response);
            }
        } catch (e) {
            const error = e;
            console.error("Error fetching data:");
        }
    };

    return (
        <div className="main-holder-brainkb">
            <div className="pt-32 sm:pt-40 md:pt-48">
                <div className="lg:w-2/3 mx-auto animate-fade-in">
                    <h3 className="animate-slide-up text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400 sm:text-5xl lg:text-6xl">
                        {brainkbMainPageTitle}
                    </h3>
                </div>
                <br/>
                <br/>
                <p className="text-2xl font-light text-sky-900 text-center animate-slide-up">
                    {brainkbMainPageSubTitle}
                </p>
                <div className="h-64"></div>
            </div>

            <div className="pt-32 sm:pt-40 md:pt-48 bg-gray-100">
                <div className="lg:w-2/3 mx-auto animate-fade-in px-4 sm:px-6 lg:px-8">
                    <h3 className="animate-slide-up text-center text-2xl sm:text-3xl md:text-4xl font-bold ">
                        {structuedModelHeaderTitle}
                    </h3>
                </div>
                <br/>
                <p className="text-lg sm:text-xl md:text-2xl font-light text-sky-900 text-center animate-slide-up"
                   dangerouslySetInnerHTML={{__html: structuedModelHeaderSubTitle}}></p>
                <br/>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
                    {yaml.structuredmodelsbox.map((page, index) => (
                        <div
                            key={index}
                            className="p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
                        >
                            <a href="#">
                                <h5 className="mb-2 text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{page.title}</h5>
                            </a>
                            <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">{page.description}</p>
                            <a
                                href={page.links}
                                className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                            >
                                Read more
                                <svg
                                    className="rtl:rotate-180 w-3.5 h-3.5 ms-2"
                                    aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 14 10"
                                >
                                    <path
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M1 5h12m0 0L9 1m4 4L9 9"
                                    />
                                </svg>
                            </a>
                        </div>
                    ))}
                </div>
                <br/>
            </div>


            <div className="pt-32 sm:pt-40 md:pt-48">
                <div className="lg:w-2/3 mx-auto animate-fade-in px-4 sm:px-6 lg:px-8">
                    <h3 className="animate-slide-up text-center text-2xl sm:text-3xl md:text-4xl font-bold ">
                        {modelBoxCountHeaderTitle}
                    </h3>
                </div>
                <br/>
                <p className="text-lg sm:text-xl md:text-2xl font-light text-sky-900 text-center animate-slide-up">
                    {modelBoxCountHeaderSubTitle}
                </p>
                <br/>
                <div className="flex flex-wrap justify-center space-x-0 sm:space-x-10 animate-slide-up">
                    {dataCount.map((count, index) => (
                        <div
                            key={index}
                            className="max-w-full sm:max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 m-4"
                        >
                            <div className="flex flex-col items-center">
                                <h2 className="mb-2 text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">{count}</h2>
                                <h5 className="mb-2 text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{yaml.boxiconsstatisticscount[index]?.name}</h5>
                            </div>
                            <p className="mb-3 font-light text-gray-700 dark:text-gray-400">{yaml.boxiconsstatisticscount[index]?.short_description}</p>
                        </div>
                    ))}
                </div>
                <br/>
            </div>

        </div>
    );
}
