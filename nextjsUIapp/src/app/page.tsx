import type {Metadata} from "next";
import {getServerSession} from "next-auth";
import {redirect, useRouter} from "next/navigation";
import {authOptions} from "@/lib/auth";

export const metadata: Metadata = {
    title: "Home",

};
export default async function Home() {
    const current_session = await getServerSession(authOptions);
    //user is logged in so redirect to admin page
    if (current_session) return redirect("/admin");
    return (
        <div className="main-holder-brainkb">

            <div className="pt-32 sm:pt-40 md:pt-48">
                <div className="lg:w-2/3 mx-auto animate-fade-in">
                    <h3 className="animate-slide-up text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400 sm:text-5xl lg:text-6xl">
                        BrainKB: A Large Scale Neuroscience Knowledge Graph
                    </h3>
                </div>
                <br/><br/>
                <p className="text-2xl  font-light text-sky-900 text-center animate-slide-up">
                    Facilitating Evidence-Based Decision Making to Unlock the Mysteries of the Mind
                </p>
                <div className="h-64"></div>
            </div>

            <div className="pt-32 sm:pt-40 md:pt-48 bg-gray-100">
                <div className="lg:w-2/3 mx-auto animate-fade-in">
                    <h3 className="animate-slide-up text-center text-4xl font-bold ">
                        Structured Models
                    </h3>
                </div>
                <br/>
                <p className="text-2xl  font-light text-sky-900 text-center animate-slide-up">
                    Structured models used in BrainKB. <a href="https://sensein.group/brainkbdocs" target="_blank">Click
                    here</a> to view all models.
                </p>
                <br/>
                <div className="flex justify-center space-x-10 animate-slide-up">
                    <div
                        className="max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
                        <a href="#">
                            <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Evidence
                                Assertion Ontology</h5>
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
                            <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Genome
                                Annotation Registry Service (GARS)</h5>
                        </a>
                        <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">A data model designed to
                            represent types and relationships of an organism's annotated genome.</p>
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
                            <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Anatomical
                                Structure Reference Service (AnSRS)</h5>
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
                            <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Library Generation Schema</h5>
                        </a>
                        <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">A schema that is designed to represent types and relationships of samples and digital data assets generated during processes that generate multimodal genomic data..</p>
                        <a href="https://brain-bican.github.io/models/index_library_generation/" target="_blank"
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


            <div className="pt-32 sm:pt-40 md:pt-48">
                <div className="lg:w-2/3 mx-auto animate-fade-in">
                    <h3 className="animate-slide-up text-center text-4xl font-bold ">
                        Knolwedge Base Statistics
                    </h3>
                </div>
                <br/>
                <p className="text-2xl  font-light text-sky-900 text-center animate-slide-up">
                    Structured models used in BrainKB. <a href="https://sensein.group/brainkbdocs" target="_blank">Click
                    here</a> to view all models.
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
                            represent types and relationships of an organism's annotated genome.</p>
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
