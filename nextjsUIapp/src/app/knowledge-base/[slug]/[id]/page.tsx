"use client";
import SideBarKBFromConfig from "@/src/app/components/SideBarKBFromConfig";
import { useEffect, useState } from "react";
import enititycardmapperconfig from '@/src/app/components/enititycardmapper.yaml';
import { getData } from "@/src/app/components/getData";
import {extractPredicateObjectPairs} from "@/src/app/components/helper";
import {formatextractPredicateObjectPairs} from "@/src/app/components/helper";
const IndividualEntityPage = ({ params }) => {
    const { slug, id } = params;
    const [mainCardTitle, setMainCardTitle] = useState("");
    const [mainCardDescription, setMainCardDescription] = useState("");
    const [extractedBoxes, setExtractedBoxes] = useState([]);
    const [data, setData] = useState({});
    const [error, setError] = useState<string | null>(null);

    const fetchData = async (queryParameter) => {
        const baseurl = process.env.NEXT_PUBLIC_API_ADMIN_HOST;
        const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";

        try {
            const response = await getData(queryParameter, endpoint, baseurl);
            if (response.status === "success" && response.message?.results?.bindings) {
                return response.message.results.bindings;
            }
            return [];
        } catch (err) {
            console.error("Error fetching data:", err);
            return [];
        }
    };

    const loadData = async () => {
        try {
            const page = enititycardmapperconfig.EntityViewCardsMaper.find((page) => page.slug === slug);
            const filename = page ? page.filename : "";

            const model_data = await import(`@/src/app/components/${filename}`);
            const extracted_data = model_data.default;

            setMainCardTitle(extracted_data?.name || "");
            setMainCardDescription(extracted_data?.description || "");
            setExtractedBoxes(extracted_data?.boxes || []);
        } catch (error) {
            console.error("Failed to fetch YAML data:", error);
        }
    };

    useEffect(() => {
        loadData();
    }, [slug]);

    useEffect(() => {
        const fetchBoxData = async () => {
            for (const box of extractedBoxes) {
                if (box.cardtype === "card" && box.sparql_query) {
                    const query = box.sparql_query.replace(/\{0\}/g, decodeURIComponent(id));
                    const boxData = await fetchData({ sparql_query: query });
                    const cleanedData = await extractPredicateObjectPairs(boxData);
                    const formattedData = await formatextractPredicateObjectPairs(cleanedData);
                    setData((prevData) => ({
                        ...prevData,
                        [box.slug]: formattedData,
                    }));
                }
            }
        };

        if (extractedBoxes.length > 0) {
            fetchBoxData();
        }
    }, [extractedBoxes, id]);

    return (
        <div className="kb-page-margin">
            <SideBarKBFromConfig />
            <div className="grid fix-left-margin grid-cols-1">
                <div className="w-full bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="p-4">
                        <h2 className="text-xl font-bold"> {decodeURIComponent(id).substring(decodeURIComponent(id).lastIndexOf("/") + 1)}</h2>
                        <p className="text-gray-700">{mainCardDescription}</p>
                    </div>
                    <div className="p-4 border-t border-gray-200 flex">
                        {extractedBoxes.map((entitycards, index) => (
                            <div key={index} className="text-gray-700 text-base space-x-4">
                                {entitycards.cardtype === "card" && (
                                    <div className="w-full bg-white shadow-md rounded-lg overflow-hidden">
                                        <div className="bg-gray-400 p-4">
                                            <h2 className="text-white text-xl font-bold">
                                                {entitycards.name}
                                                {/*{decodeURIComponent(id).substring(decodeURIComponent(id).lastIndexOf("/") + 1)}*/}
                                            </h2>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-gray-700">{entitycards.description}</p>
                                            <p className="text-gray-700">
                                                {(JSON.stringify(data[entitycards.slug]) || "No data available")}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IndividualEntityPage;
