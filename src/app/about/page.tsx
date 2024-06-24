import type { Metadata } from "next";

export const metadata: Metadata = {
    title:"About",

};

export default function About(){
    return (
        <div>

            <div className="text-left">
                <h2 className="text-3xl dark:text-white">What is BrainKB?</h2>
                <br/>
                <p className="mb-3 font-normal text-justify text-gray-500 dark:text-gray-400">
                    BrainKB serves as a knowledge base platform that provides scientists worldwide with tools for
                    searching, exploring, and visualizing Neuroscience knowledge represented by knowledge graphs (KGs).
                    Moreover, BrainKB provides cutting-edge tools that enable scientists to contribute new information
                    (or knowledge) to the platform and is expected to be a go-to destination for all
                    neuroscience-related research needs.

                </p>
                <br/>
            </div>

            <div className="text-left">
                <h2 className="text-3xl dark:text-white">Objective(s)</h2>
                <br/>
                <p className="mb-3 font-normal text-justify text-gray-500 dark:text-gray-400">
                    The main objective of BrainKB is to represent neuroscience knowledge as a knowledge graph such that
                    it can be used for different downstream tasks, such as making predictions and new inferences in
                    addition to querying and viewing information.

                </p>
                <br/>
            </div>

            <div className="text-left">
                <h2 className="text-3xl dark:text-white">Expected outcome</h2>
                <br/>
                <p className="mb-3 font-normal text-justify text-gray-500 dark:text-gray-400">
                    The expected outcome of the BrainKB includes the following:
                    <ul className="list-disc pl-5 mb-3">
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

                </p>
                <br/>
            </div>

        </div>
    );
}