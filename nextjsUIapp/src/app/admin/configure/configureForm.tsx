"use client";

import {redirect, useRouter} from "next/navigation";
import {useState} from "react";
import {
    insertData
} from "@/src/app/components/insertData";



export default function ConfigureFormPage(){


    const router = useRouter();
    const [step1Data, setStep1Data] = useState({
        endpoint_title: "",
        query_url: "",
        query_endpoint_type: "get",
        endpoint_service_type: "query"
    });
    const handleStep1Change = (e) => {
        const {id, value} = e.target;
        setStep1Data((prev) => ({...prev, [id]: value}));
    };


    const [isLoading, setIsLoading] = useState(false);

    const [step2Data, setStep2Data] = useState({
        leftmenutitle: "",
        sparqlquery: "",
        displaycolumnfirst: "",
        displaycolumnsecond: "",
        displaycolumnthird: "",
        defaultMenu: false,
        status: true,
    });
    const handleStep1Submit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const endpoint = process.env.NEXT_PUBLIC_API_ADMIN_CREATE_QUERY_ENDPOINT as string;
            const response = await insertData(step1Data, endpoint);
            alert("Data inserted successfully:");
            if (response.status == 201) {
                router.push("/admin/configure");
            }
        } catch (error) {
            alert("Error inserting Step 1 data:"+ error);
            console.error("Error inserting Step 1 data:", error);
        }
    };

    return (
        <>
            {/* titles for configure options */}
            <div className="grid grid-cols-2 gap-4 p-4">
                <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
                    <p className="text-2xl text-gray-400 dark:text-gray-500 text-center">
                        Step 1<br/>
                        Query Endpoint Configuration

                    </p>
                </div>
                <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
                    <p className="text-2xl text-gray-400 dark:text-gray-500 text-center">
                        Step 2 <br/>
                        Knowledge Base Page Configuration
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-6 p-4">
                {/* Step 1 form */}
                <div className="items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
                    {/* Step 1 input form configure query endpoints  */}
                    <form className="w-full" onSubmit={handleStep1Submit}>
                        <div className="mb-5">
                            <label htmlFor="endpoint_title"
                                   className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Endpoint
                                title
                            </label>
                            <input type="text" id="endpoint_title"
                                   value={step1Data.endpoint_title}
                                   onChange={handleStep1Change}
                                   className="w-full shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500   p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-sm-light"
                                   placeholder="Query Endpoint" required/>
                        </div>

                        <div className="mb-5">
                            <label htmlFor="query_url"
                                   className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Endpoint
                                URL
                            </label>
                            <input type="text" id="query_url"
                                   value={step1Data.query_url}
                                   onChange={handleStep1Change}
                                   className="w-full shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500  p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-sm-light"
                                   placeholder="http://4.124.50.24:2080/query/sparql" required/>
                        </div>


                        <div className="mb-5">
                            <label htmlFor="query_endpoint_type"
                                   className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Query
                                endpoint type</label>
                            <select id="query_endpoint_type"
                                    value={step1Data.query_endpoint_type}
                                    onChange={handleStep1Change}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">

                                <option value="get">GET</option>
                                <option value="post">POST</option>
                                <option value="put">UPDATE</option>
                                <option value="delete">DELETE</option>
                            </select>
                        </div>

                        <div className="mb-5">
                            <label htmlFor="endpoint_service_type"
                                   className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Service
                                endpoint type </label>
                            <select id="endpoint_service_type"
                                    value={step1Data.endpoint_service_type}
                                    onChange={handleStep1Change}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">

                                <option value="query">QUERY</option>
                                <option value="search">SEARCH</option>
                            </select>
                        </div>

                        <button type="submit"

                                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            {isLoading && <span>Saving Data...</span>}
                            {!isLoading && <span>Save</span>}
                        </button>
                    </form>
                </div>
                {/* Step 2 */}
                <div className="items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
                    {/* Step 2 input form configure knowledge base pages */}
                    <form className="w-full">
                        <div className="mb-5">
                            <label htmlFor="leftmenutitle"
                                   className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Left
                                menu title
                            </label>
                            <input type="text" id="leftmenutitle"
                                   className="w-full shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500   p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-sm-light"
                                   placeholder="Barcoded Cell Sample" required/>
                        </div>

                        <div className="mb-5">
                            <label htmlFor="large-input"
                                   className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                Sparql query</label>
                            <textarea id="large-input" rows={5}
                                      className="block w-full shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-sm-light"
                                      required/>
                        </div>

                        <div className="mb-5">
                            <label htmlFor="displaycolumnfirst"
                                   className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Enter
                                the name for the first column
                            </label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                The column that will be displayed as a header when the page loads.
                            </p>
                            <input type="text" id="displaycolumnfirst"
                                   className="w-full shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500   p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-sm-light"
                                   placeholder="First column name" required/>
                        </div>

                        <div className="mb-5">
                            <label htmlFor="displaycolumnsecond"
                                   className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Enter
                                the name for the first column
                            </label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                The column that will be displayed as a header when the page loads.
                            </p>
                            <input type="text" id="displaycolumnsecond"
                                   className="w-full shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500   p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-sm-light"
                                   placeholder="Second column name"/>
                        </div>

                        <div className="mb-5">
                            <label htmlFor="displaycolumnthird"
                                   className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Enter
                                the name for the first column
                            </label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                The column that will be displayed as a header when the page loads.
                            </p>
                            <input type="text" id="displaycolumnthird"
                                   className="w-full shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500   p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-sm-light"
                                   placeholder="Third column name"/>
                        </div>

                        <div className="mb-5">

                            <div className="flex items-center">
                                <input id="default-checkbox" type="checkbox" value=""
                                       className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"/>
                                <label htmlFor="default-checkbox"
                                       className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">Default
                                    menu</label>

                            </div>
                            <div className="flex items-center">
                                <input checked id="checked-checkbox" type="checkbox" value=""
                                       className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"/>
                                <label htmlFor="checked-checkbox"
                                       className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">Status
                                </label>
                            </div>


                        </div>

                        <button type="submit"
                                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Save
                        </button>
                    </form>
                </div>
            </div>

            {/* Configured pages info */}

            <div className="grid grid-cols-2 gap-4 p-4">
                <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
                    <p className="text-2xl text-gray-400 dark:text-gray-500 text-center">
                        Configured
                        Query Endpoints

                    </p>
                </div>
                <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
                    <p className="text-2xl text-gray-400 dark:text-gray-500 text-center">
                        Configured
                        Knowledge Base Pages
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 p-4">
                <div className="items-center justify-center rounded bg-gray-50 dark:bg-gray-800">

                    {/* Table configured  query endpoints */}
                    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                            <thead
                                className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">
                                    Endpoint Title
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    URL
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    Type
                                </th>

                                <th scope="col" className="px-6 py-3">
                                    Action
                                </th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
                                <th scope="row"
                                    className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                    Query Endpoint
                                </th>
                                <td className="px-4 py-3">
                                    http://13.114.30.241:9010/query/sparql
                                </td>

                                <td className="px-4 py-3">
                                    GET
                                </td>
                                <td className="px-4 py-3">
                                    <a href="#"
                                       className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Edit</a>
                                    <br/> <a
                                    href="#"
                                    className="font-medium text-rose-600 dark:text-red-500 hover:underline">Delete</a>
                                </td>

                            </tr>


                            </tbody>
                        </table>
                    </div>


                </div>
                <div className="items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
                    {/* Table configured  kb pages */}
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <thead
                            className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">
                                Menu Title
                            </th>
                            <th scope="col" className="px-6 py-3">
                                First column name
                            </th>
                            <th scope="col" className="px-6 py-3">
                                First column name
                            </th>
                            <th scope="col" className="px-6 py-3">
                                Third column name
                            </th>

                            <th scope="col" className="px-6 py-3">
                                Action
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
                            <th scope="row"
                                className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                Barcoded Cell Sample
                            </th>
                            <td className="px-4 py-3">
                                id
                            </td>

                            <td className="px-4 py-3">
                                local_name
                            </td>
                            <td className="px-4 py-3">
                                category
                            </td>
                            <td className="px-4 py-3">
                                <a href="#"
                                   className="font-medium text-green-600 dark:text-green-500 hover:underline">View</a>
                                <br/>
                                <a href="#"
                                   className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Edit</a>
                                <br/> <a
                                href="#"
                                className="font-medium text-rose-600 dark:text-red-500 hover:underline">Delete</a>
                            </td>

                        </tr>

                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}