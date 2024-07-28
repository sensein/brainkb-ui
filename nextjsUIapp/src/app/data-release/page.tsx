import type {Metadata} from "next";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {redirect} from "next/navigation";

export const metadata: Metadata = {
    title: "Data Release",

};

export default async function Contact() {
    const current_session = await getServerSession(authOptions);
    //user is logged in so redirect to admin page
    if (current_session) return redirect("/admin");
    return (
        <div className="set-margin-hundred">
            <h2 className="mb-4 text-3xl font-extrabold font-extrabold leading-none text-sky-900 animate-slide-up">Data
                Release</h2>


            <p className="mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                BrainKB serves as a knowledge base platform that provides scientists worldwide with tools for
                searching, exploring, and visualizing Neuroscience knowledge represented by knowledge graphs (KGs).
                Moreover, BrainKB provides cutting-edge tools that enable scientists to contribute new information
                (or knowledge) to the platform and is expected to be a go-to destination for all
                neuroscience-related research needs.

            </p><br/><br/>


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
                    <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                        <th scope="row"
                            className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                            Apple MacBook Pro 17"
                        </th>
                        <td className="px-6 py-4">
                            Silver
                        </td>
                        <td className="px-6 py-4">
                            Laptop
                        </td>
                        <td className="px-6 py-4">
                            $2999
                        </td>

                    </tr>
                    <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                        <th scope="row"
                            className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                            Microsoft Surface Pro
                        </th>
                        <td className="px-6 py-4">
                            White
                        </td>
                        <td className="px-6 py-4">
                            Laptop PC
                        </td>
                        <td className="px-6 py-4">
                            $1999
                        </td>

                    </tr>
                    <tr className="bg-white dark:bg-gray-800">
                        <th scope="row"
                            className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                            Magic Mouse 2
                        </th>
                        <td className="px-6 py-4">
                            Black
                        </td>
                        <td className="px-6 py-4">
                            Accessories
                        </td>
                        <td className="px-6 py-4">
                            $99
                        </td>

                    </tr>
                    </tbody>
                </table>
            </div>


        </div>
    );

}