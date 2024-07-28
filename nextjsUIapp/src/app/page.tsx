"use client";
import {getServerSession} from "next-auth";
import {redirect, useRouter} from "next/navigation";
import {authOptions} from "@/lib/auth";
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

    const fetchAndSetData = async () => {

        setModelBoxCountHeaderTitle(null);
        setModelBoxCountHeaderSubTitle(null);

        const boxiconsdetailsCounter = yaml.headersboxpage.find((page) => page.slug === "statisticsboxheader");
        console.log(boxiconsdetailsCounter)

        const page_title = boxiconsdetailsCounter ? boxiconsdetailsCounter.title : "";
        const page_sub_title = boxiconsdetailsCounter ? boxiconsdetailsCounter.subtitle : "";
        setModelBoxCountHeaderTitle(page_title);
        setModelBoxCountHeaderSubTitle(page_sub_title);

        const structuredmodelHeader = yaml.headersboxpage.find((page) => page.slug === "structuredmodelsheader");
        console.log(structuredmodelHeader)


        const structured_page_title = structuredmodelHeader ? structuredmodelHeader.title : "";
        const structured_page_sub_title = structuredmodelHeader ? structuredmodelHeader.subtitle : "";
        setStructuedModelHeaderTitle(structured_page_title);
        setStructuedModelHeaderSubTitle(structured_page_sub_title);

         const brainkbmainpge = yaml.headersboxpage.find((page) => page.slug === "brainkbmainpge");
         console.log(brainkbmainpge)

        const brainkb_title = brainkbmainpge ? brainkbmainpge.title : "";
        const brainkb_sub_title = brainkbmainpge ? brainkbmainpge.subtitle : "";
        setBrainkbMainPageTitle(brainkb_title);
        setBrainkbMainPageSubTitle(brainkb_sub_title);


    };

    useEffect(() => {
        fetchAndSetData();
    }, []);


    return (
        <div className="main-holder-brainkb">

            <div className="pt-32 sm:pt-40 md:pt-48">
                <div className="lg:w-2/3 mx-auto animate-fade-in">
                    <h3 className="animate-slide-up text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400 sm:text-5xl lg:text-6xl">
                        {brainkbMainPageTitle}
                    </h3>
                </div>
                <br/><br/>
                <p className="text-2xl  font-light text-sky-900 text-center animate-slide-up">
                    {brainkbMainPageSubTitle}
                </p>
                <div className="h-64"></div>
            </div>

            <div className="pt-32 sm:pt-40 md:pt-48 bg-gray-100">
                <div className="lg:w-2/3 mx-auto animate-fade-in">
                    <h3 className="animate-slide-up text-center text-4xl font-bold ">
                        {structuedModelHeaderTitle}
                    </h3>
                </div>
                <br/>
                <p className="text-2xl  font-light text-sky-900 text-center animate-slide-up" dangerouslySetInnerHTML={{ __html: structuedModelHeaderSubTitle }}>

                </p>
                <br/>
                <div className="flex justify-center space-x-10 animate-slide-up">
                    {yaml.structuredmodelsbox.map((page, index) => (
                        <div key={index}
                        className="max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
                        <a href="#">
                            <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{page.title}</h5>
                        </a>
                        <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">{page.description}</p>
                        <a href={page.links}
                           className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            Read more
                            <svg className="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true"
                                 xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                <path stroke="currentColor" strokeLinecap="round" stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M1 5h12m0 0L9 1m4 4L9 9"/>
                            </svg>
                        </a>
                    </div>
                        ))}

                </div>
                <br/>
            </div>


            <div className="pt-32 sm:pt-40 md:pt-48">
                <div className="lg:w-2/3 mx-auto animate-fade-in">
                    <h3 className="animate-slide-up text-center text-4xl font-bold ">
                        {modelBoxCountHeaderTitle}
                    </h3>
                </div>
                <br/>
                <p className="text-2xl  font-light text-sky-900 text-center animate-slide-up">
                    {modelBoxCountHeaderSubTitle}
                </p>
                <br/>
                <div className="flex justify-center space-x-10 animate-slide-up">
                    <div
                        className="max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
                        <a href="#">
                            <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Assertions</h5>
                        </a>
                        <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">A data model designed to
                            represent types and relationships of evidence and assertions.</p>
                        <a href="#"
                           className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            Read more
                            <svg className="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true"
                                 xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M1 5h12m0 0L9 1m4 4L9 9"/>
                            </svg>
                        </a>
                    </div>

                    <div
                        className="max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
                        <a href="#">
                            <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Evidence</h5>
                        </a>
                        <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">A data model designed to
                            represent types and relationships of an organism&apos;s annotated genome.</p>
                        <a href="https://brain-bican.github.io/models/index_genome_annotation" target="_blank"
                           className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            Read more
                            <svg className="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true"
                                 xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M1 5h12m0 0L9 1m4 4L9 9"/>
                            </svg>
                        </a>
                    </div>

                    <div
                        className="max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
                        <a href="#">
                            <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">a</h5>
                        </a>
                        <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">A data model designed to
                            represent types and relationships of anatomical brain structures.</p>
                        <a href="https://brain-bican.github.io/models/index_anatomical_structure" target="_blank"
                           className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            Read more
                            <svg className="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true"
                                 xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M1 5h12m0 0L9 1m4 4L9 9"/>
                            </svg>
                        </a>
                    </div>

                    <div
                        className="max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
                        <a href="#">
                            <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">a</h5>
                        </a>
                        <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">A data model designed to
                            represent types and relationships of anatomical brain structures.</p>
                        <a href="https://brain-bican.github.io/models/index_anatomical_structure" target="_blank"
                           className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            Read more
                            <svg className="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true"
                                 xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M1 5h12m0 0L9 1m4 4L9 9"/>
                            </svg>
                        </a>
                    </div>

                </div>
                <br/>
            </div>

        </div>

    );
}
