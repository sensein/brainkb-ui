import type { Metadata } from "next";
 
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {redirect} from "next/navigation";


export const metadata: Metadata = {
    title:"About",

};

 
export default async function About(){
        const current_session = await getServerSession(authOptions);
    //user is logged in so redirect to admin page
    if (current_session) return redirect("/admin");
    return (
        <div className="set-margin-hundred">


            <div className="text-left">
                <h2 className="mb-4 text-3xl font-extrabold font-extrabold leading-none text-sky-900 animate-slide-up">What is BrainKB?</h2>
                <br/>
                <p className="mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                    BrainKB serves as a knowledge base platform that provides scientists worldwide with tools for
                    searching, exploring, and visualizing Neuroscience knowledge represented by knowledge graphs (KGs).
                    Moreover, BrainKB provides cutting-edge tools that enable scientists to contribute new information
                    (or knowledge) to the platform and is expected to be a go-to destination for all
                    neuroscience-related research needs.

                </p>
                <br/>
            </div>

            <div className="text-left">
                <h2 className="mb-4 text-3xl font-extrabold font-extrabold leading-none text-sky-900 animate-slide-up">Objective(s)</h2>
                <br/>
                <p className="mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                    The main objective of BrainKB is to represent neuroscience knowledge as a knowledge graph such that
                    it can be used for different downstream tasks, such as making predictions and new inferences in
                    addition to querying and viewing information.

                </p>
                <br/>
            </div>

            <div className="text-left">
                <h2 className="mb-4 text-3xl font-extrabold font-extrabold leading-none text-sky-900 animate-slide-up">Expected outcome</h2>
                <br/>
                <p className="mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                    The expected outcome of the BrainKB includes the following:</p>
                    <ul className="list-disc pl-5 mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
                        <li>
                            (Semi-)Automated extraction of neuroscience knowledge from structured, semi-structured, and unstructured sources, and representing the knowledge via KGs.
Visualization of the KGs.
                        </li>
                        <li>
                            Platform to perform different analytics operations over the BrainKB KGs.
                        </li>
                        <li>
                            (Semi-)Automated validation of the BrainKGs to ensure the high quality of the content.

                        </li>
                        <li>
                            Provides the ability to ingest data in batch or streaming mode for the automated extraction of KGs.
                        </li>
                    </ul>


            </div>

        </div>
    );
}