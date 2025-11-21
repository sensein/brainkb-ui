"use client";


import yaml from "@/src/config/yaml/config-data-release.yaml";
import {getData} from "@/src/app/components/getData";
import {useEffect, useRef, useState} from "react";
import {get_rapid_release_file} from "@/src/app/components/helper";
import {
    CloudArrowDownIcon,
    CheckCircleIcon,
    CalendarIcon,
    DocumentTextIcon,
    LockOpenIcon,
} from "@heroicons/react/24/solid";

type AwsDataType = Array<{
    date: string;
    folders: {
        [folderName: string]: {
            release: string;
            released_date: string;
            combined: {
                [url: string]: string;
            };
            individualtypes: {
                [url: string]: string;
            };
        };
    };
}>

export default function BrainKBDataReleases() {
    const releaseTypes = [
        {
            title: "Monthly Releases",
            description:
                "These comprehensive releases provide a full snapshot of the current BrainKB database, including all validated entities and knowledge representations. Ideal for users requiring the most up-to-date dataset for analysis.",
        },
        {
            title: "Nightly Releases",
            description:
                "Incremental updates capturing any new or modified entities since the last release. Perfect for users needing real-time data for ongoing projects.",
        },
    ];

    const fileFormats = [
        {
            title: "CSV (Comma-Separated Values)",
            description:
                "Tabular representation of the data, suitable for most data processing pipelines.",
        },
        {
            title: "JSON (JavaScript Object Notation)",
            description:
                "Structured, hierarchical format ideal for applications requiring detailed metadata or integration with other systems.",
        },
    ];

    const hasFetched = useRef(false);
    const [awsData, setAWSData] = useState<AwsDataType | null>(null);
    const fetchDataRapidRelease = async () => {
        if (hasFetched.current) return; // Prevent multiple calls
        hasFetched.current = true;

        const bucketDetails = yaml.datareleasesetup.find((setup) => setup.slug === "bucketsetup");

        const data = {};
        data["bucketdetails"] = bucketDetails;
        const files = await get_rapid_release_file(data);
        setAWSData(files as AwsDataType);

    }

    useEffect(() => {
        fetchDataRapidRelease();
    }, []);


    return (
        <div className="set-margin-hundred">
            <div className="w-full p-8 space-y-12">
                {/* Title */}
                <div className="text-center">
                    <h2 className="text-4xl font-bold text-sky-900 mb-6 animate-slide-up">BrainKB Data Releases</h2>
                </div>

                {/* Overview */}
                <section className="bg-gray-100 p-8 rounded-lg shadow-md animate-slide-up">
                    <h3 className="text-3xl font-bold text-sky-900 mb-4 flex items-center">
                        <CloudArrowDownIcon className="w-8 h-8 text-blue-500 mr-3"/>
                        Overview
                    </h3>
                    <p className="text-lg text-gray-700">
                        BrainKB provides regular data releases, including comprehensive records of primary entities such
                        as
                        <b> Assertions, Evidence, Library Aliquots</b>, and <b>Barcoded Cell Samples</b>. These releases
                        are available
                        in multiple formats, including <b>CSV</b>, <b>JSON</b>, and <b>API access</b>. Users can
                        download specific
                        entity types and formats directly from the BrainKB platform.
                    </p>
                </section>

                {/* Release Frequency */}
                <section className="bg-gray-100 p-8 rounded-lg shadow-md animate-slide-up">
                    <h3 className="text-3xl font-bold text-sky-900 mb-4 flex items-center">
                        <CalendarIcon className="w-8 h-8 text-blue-500 mr-3"/>
                        Release Frequency
                    </h3>
                    <p className="text-lg text-gray-700 mb-6">
                        BrainKB offers two types of data release schedules to meet different user needs:
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                        {releaseTypes.map((release, index) => (
                            <div key={index} className="flex items-start space-x-4 p-5 bg-white rounded-lg shadow">
                                <CheckCircleIcon className="w-8 h-8 text-green-500 flex-shrink-0"/>
                                <div>
                                    <h4 className="text-xl font-semibold text-gray-800">{release.title}</h4>
                                    <p className="text-gray-600">{release.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* File Formats */}
                <section className="bg-gray-100 p-8 rounded-lg shadow-md animate-slide-up">
                    <h3 className="text-3xl font-bold text-sky-900 mb-4 flex items-center">
                        <DocumentTextIcon className="w-8 h-8 text-blue-500 mr-3"/>
                        File Formats
                    </h3>
                    <p className="text-lg text-gray-700 mb-6">BrainKB data is available in two primary file formats:</p>
                    <div className="grid md:grid-cols-2 gap-6">
                        {fileFormats.map((format, index) => (
                            <div key={index} className="flex items-start space-x-4 p-5 bg-white rounded-lg shadow">
                                <CheckCircleIcon className="w-8 h-8 text-green-500 flex-shrink-0"/>
                                <div>
                                    <h4 className="text-xl font-semibold text-gray-800">{format.title}</h4>
                                    <p className="text-gray-600">{format.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Compliance */}
                <section className="bg-gray-100 p-8 rounded-lg shadow-md">
                    <h3 className="text-3xl font-bold text-sky-900 mb-4 flex items-center">
                        <CheckCircleIcon className="w-8 h-8 text-blue-500 mr-3"/>
                        Compliance
                    </h3>
                    <p className="text-lg text-gray-700">
                        BrainKB follows best practices and format specifications to ensure high-quality data. However,
                        some limitations may apply depending on the file type.
                        <b> CSV files</b> may include entities with incomplete metadata, whereas <b>JSON
                        files</b> ensure comprehensive metadata inclusion.
                    </p>
                </section>

                {/* Licensing */}
                <section className="bg-gray-100 p-8 rounded-lg shadow-md animate-slide-up">
                    <h3 className="text-3xl font-bold text-sky-900 mb-4 flex items-center">
                        <LockOpenIcon className="w-8 h-8 text-blue-500 mr-3"/>
                        Licensing
                    </h3>
                    <p className="text-lg text-gray-700">
                        All BrainKB data is released under the <b>CC0 license (Creative Commons Public Domain
                        Dedication, CC0 1.0 Universal)</b>,
                        allowing unrestricted use, sharing, and adaptation. We encourage users to cite BrainKB in their
                        publications.
                    </p>
                </section>
            </div>

            <div className="relative overflow-x-auto shadow-md sm:rounded-lg animate-slide-up">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                    <thead
                        className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">
                            Date
                        </th>
                        <th scope="col" className="px-6 py-3">
                            <div className="flex items-center">
                                Release

                            </div>
                        </th>
                        <th scope="col" className="px-6 py-3">
                            <div className="flex items-center">
                                Individual KGs by Type

                            </div>
                        </th>

                        <th scope="col" className="px-6 py-3">
                            <div className="flex items-center">
                                Combined
                            </div>
                        </th>

                    </tr>
                    </thead>
                    <tbody>
                    {Array.isArray(awsData) &&
                        awsData.map((item, dataIndex) =>
                            Object.entries(item.folders || {}).map(([folderKey, folderValue], folderIndex) => {
                                // Assert or validate the type of folderValue
                                const folder = folderValue as {
                                    release: string;
                                    released_date: string;
                                    combined: { [url: string]: string };
                                    individualtypes: { [url: string]: string };
                                };

                                return (
                                    <tr
                                        key={`${dataIndex}-${folderIndex}`}
                                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                                    >
                                        {/* Date */}
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            {item.date.replace(/_/g, "/") || "N/A"}
                                        </td>

                                        {/* Release Type */}
                                        <td className="px-6 py-4">
                                            {folder.release || "N/A"}
                                        </td>


                                        {/* Individual Types */}
                                        <td className="px-6 py-4">
                                            {folder.individualtypes
                                                ? Object.entries(folder.individualtypes).map(([key, value], index, arr) => (
                                                    <span key={key}>
                                        <a href={key} target="_blank" rel="noopener noreferrer">
                                            {value}
                                        </a>
                                                        {index < arr.length - 1 && " | "}
                                    </span>
                                                ))
                                                : ""}
                                        </td>

                                        {/* Combined */}
                                        <td className="px-6 py-4">
                                            {folder.combined
                                                ? Object.entries(folder.combined).map(([key, value]) => (
                                                    <a key={key} href={key} target="_blank"
                                                       rel="noopener noreferrer">
                                                        {value === "COMBINED" ? "All Data" : ""}
                                                    </a>
                                                ))
                                                : ""}
                                        </td>
                                    </tr>
                                );
                            })
                        )}

                    </tbody>
                </table>
            </div>


        </div>
    );

}

