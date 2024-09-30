"use client";
import SideBarKBFromConfig from "@/src/app/components/SideBarKBFromConfig";
import {useEffect, useState} from "react";
import enititycardmapperconfig from '@/src/app/components/enititycardmapper.yaml';
import {getData} from "@/src/app/components/getData";
import {fetchBoxes} from "@/src/app/components/fetchBoxes";
interface EntityCard {
    slug: string;
    cardtype: string;
    description: string;
    name?: string;
    sparql_query?: string;
}
const IndividualEntityPage = ({params}) => {
    const {slug, id} = params;
    const [mainCardTitle, setMainCardTitle] = useState("");
    const [mainCardDescription, setMainCardDescription] = useState("");
    const [extractedBoxes, setExtractedBoxes] =  useState<EntityCard[]>([]);//useState([]);
    const [data, setData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const baseurl = process.env.NEXT_PUBLIC_API_ADMIN_HOST || "http://3.134.90.242:8010";
    const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql"; //default is "query/sparql"
    const queryParameter = {sparql_query: decodeURIComponent(id)};
    const fetchData = async () => {
        try {
            const response = await getData(queryParameter, endpoint, baseurl);
            if (response.status === 'success' && response.message?.results?.bindings) {
                const bindings = response.message.results.bindings;
                const vars = response.message.head.vars;
                setData(bindings);
            } else {

                setError("Invalid data format");
            }
        } catch (e) {
            const error = e as Error;

            setError(error.message);
        } finally {
            setLoading(false);
        }

    };

    const loadData = async () => {
        setMainCardTitle("");
        setData([]);
        setMainCardDescription("");

        try {
            // Fetch the mapper file
            const page = enititycardmapperconfig.EntityViewCardsMaper.find((page) => page.slug === slug);
            const filename = page ? page.filename : "";

            // Read entity card design models dynamically
            const model_data = await import(`@/src/app/components/${filename}`);
            const extracted_data = model_data.default;

            // Set card title and description
            setMainCardTitle(extracted_data?.name || "");
            setMainCardDescription(extracted_data?.description || "");
            setExtractedBoxes(extracted_data?.boxes || []);
            console.log(extracted_data?.boxes);
        } catch (error) {
            console.error('Failed to fetch YAML data or Query:', error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);


    return (
        <div className="kb-page-margin">
            <SideBarKBFromConfig/>
            <div className="grid fix-left-margin grid-cols-1">
                <div className="w-full bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="p-4">
                        <h2 className="text-xl font-bold">{mainCardTitle}</h2>
                        <p className="text-gray-700">{mainCardDescription}</p>
                    </div>
                    <div className="p-4 border-t border-gray-200 flex">
                        {extractedBoxes.map((entitycards, index) => (
                            entitycards.cardtype === "summarybox" ? (
                                <div key={index} className="text-gray-700 text-base space-x-4">
                                    {entitycards.slug === "summarybox" ? (
                                        <div className="w-full bg-white shadow-md rounded-lg overflow-hidden">
                                            <div className="bg-gray-400 p-4">
                                                <h2 className="text-white text-xl font-bold">{
                                                    decodeURIComponent(id).substring(decodeURIComponent(id).lastIndexOf('/') + 1)
                                                }
                                                </h2>
                                            </div>
                                            <div className="p-4">
                                                <p className="text-gray-700">{entitycards.description}</p>
                                                <p className="text-gray-700">
                                                    {fetchBoxes(entitycards.sparql_query?.replace(/\{0\}/g, decodeURIComponent(id)) || 'No query available')}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="max-w-screen-md w-full bg-white shadow-md rounded-lg overflow-hidden">
                                            <div className="bg-gray-400 p-4">
                                                <h2 className="text-white text-xl font-bold">{entitycards.name}</h2>
                                            </div>
                                            <div className="p-4">
                                                <p className="text-gray-700">{entitycards.description}</p>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            ) : (
                                <div key={index} className="text-gray-700 text-base">no card</div>
                            )
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IndividualEntityPage;
