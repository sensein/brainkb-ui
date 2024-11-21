"use client";


import yaml from "@/src/app/components/config-data-release.yaml";
import {getData} from "@/src/app/components/getData";
import {useEffect, useRef, useState} from "react";
import {get_rapid_release_file} from "@/src/app/components/helper";

export default function Contact() {

    const hasFetched = useRef(false);
    const [awsData, setAWSData] = useState({});
    const fetchDataRapidRelease = async () => {
        if (hasFetched.current) return; // Prevent multiple calls
        hasFetched.current = true;

        const bucketDetails = yaml.datareleasesetup.find((setup) => setup.slug === "bucketsetup");

        const data = {};
        data["bucketdetails"] = bucketDetails;
        const files = await get_rapid_release_file(data);
        setAWSData(files);

    }

    useEffect(() => {
        fetchDataRapidRelease();
    }, []);
    console.log(awsData);
    return (
        <div className="set-margin-hundred">
            <div className="flex justify-center">
                <h2 className="mb-4 text-3xl font-extrabold leading-none text-sky-900 animate-slide-up">
                    BrainKB Data Releases
                </h2>
            </div>
            <h3 className="mb-4 text-2xl font-extrabold leading-none text-sky-900 animate-slide-up">
                Overview
            </h3>

            <p className="mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                BrainKB provides regular data releases that include comprehensive records of all primary entities such
                as Assertions, Evidence, Library Aliquot and Barcoded Cell Sample. These releases are available in
                various formats, including CSV and JSON or API-access. Users can easily download the specific entity
                type and data
                format they need by selecting the corresponding download button on the BrainKB platform.

            </p>
            <h3 className="mb-4 text-2xl font-extrabold leading-none text-sky-900 animate-slide-up">
                Release Frequency
            </h3>
            <p className="mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                BrainKB offers two types of data release schedules to meet different user needs:</p>
            <ul className="list-disc pl-5 mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                <li><b>Monthly Releases:</b> These comprehensive releases provide a full snapshot of the current
                    BrainKB database, including all validated entities and knowledge representations. They are ideal
                    for users who require the most up-to-date and complete dataset for their analyses.
                </li>
                <li><b>Nightly Releases:</b> These releases include incremental updates to the BrainKB database,
                    capturing
                    any new or updated entities since the last release. Nightly releases are perfect for users who
                    need the latest data for ongoing projects or applications requiring real-time information.
                </li>
            </ul>


            <h3 className="mb-4 text-2xl font-extrabold leading-none text-sky-900 animate-slide-up">
                File Formats
            </h3>
            <p className="mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                BrainKB data is available in two primary file formats</p>
            <ul className="list-disc pl-5 mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                <li><b>CSV (Comma-Separated Values):</b> These files provide a tabular representation of the data,
                    suitable for most data processing pipelines.
                </li>
                <li><b>JSON (JavaScript Object Notation):</b> These files offer a structured, hierarchical format that
                    is ideal for applications requiring detailed metadata or integration with other systems.
                </li>
            </ul>

            <h3 className="mb-4 text-2xl font-extrabold leading-none text-sky-900 animate-slide-up">
                Compliance
            </h3>
            <p className="mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                To adhere to best practices and format specifications, certain limitations may apply, depending on the
                file type. For example, CSV files may include entities with incomplete metadata, while JSON
                files ensure comprehensive metadata inclusion.

            </p>
            <h3 className="mb-4 text-2xl font-extrabold leading-none text-sky-900 animate-slide-up">
                Licensing
            </h3>
            <p className="mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                All data made available through BrainKB is released under the <b>CC0 license (Creative Commons Public
                Domain Dedication, CC0 1.0 Universal)</b>, ensuring that the data can be freely used, shared, and
                adapted
                without restrictions. We encourage users to cite BrainKB in their publications when utilizing the
                platform’s data.

            </p>
            <br/><br/>

            <div className="relative overflow-x-auto shadow-md sm:rounded-lg animate-slide-up">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
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
                            Object.entries(item.folders || {}).map(([folderKey, folderValue], folderIndex) => (
                                <tr key={`${dataIndex}-${folderIndex}`}
                                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                    {/* Date */}
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        {item.date || "N/A"}
                                    </td>

                                    {/* Release Type */}
                                    <td className="px-6 py-4">
                                        {folderValue.release || "N/A"}
                                    </td>

                                    {/* Released Date */}
                                    <td className="px-6 py-4">
                                        {folderValue.released_date || "N/A"}
                                    </td>

                                    {/* Individual Types */}
                                    <td className="px-6 py-4">
                                        {folderValue.individualtypes
                                            ? Object.entries(folderValue.individualtypes).map(([key, value], index, arr) => (
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
                                        {folderValue.combined
                                            ? Object.entries(folderValue.combined).map(([key, value]) => (
                                                <a key={key} href={key} target="_blank" rel="noopener noreferrer">
                                                    {value === "COMBINED" ? "All Data" : ""}
                                                </a>
                                            ))
                                            : ""}
                                    </td>
                                </tr>
                            ))
                        )}


                    </tbody>
                </table>
            </div>


        </div>
    );

}