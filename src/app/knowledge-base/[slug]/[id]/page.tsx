"use client";
import {useEffect, useState} from "react";
import enititycardmapperconfig from '../../../components/enititycardmapper.yaml';
import {getData} from "../../../components/getData";
import { processSparqlQueryResult } from "../../../components/helper";

import { useParams } from "next/navigation";

type ExtractedBox = {
    cardtype: string;
    sparql_query?: string;
    slug?: string;
    name?: string;
    description?: string;
};

interface PageParams {
    slug: string;
    id: string;
}

interface QueryParameter {
    sparql_query: string;
}

interface DataObject {
    [key: string]: Record<string, string>;
}

interface EntityViewCard {
    slug: string;
    filename: string;
}

const IndividualEntityPage = () => {
    const params = useParams();
    if (!params) return <div>Loading...</div>;
    const {slug, id: rawId} = params;
    const id = Array.isArray(rawId) ? rawId[0] : rawId; // Ensure id is always a string
    const [mainCardTitle, setMainCardTitle] = useState("");
    const [mainCardDescription, setMainCardDescription] = useState("");
    const [extractedBoxes, setExtractedBoxes] = useState<ExtractedBox[]>([]);
    const [data, setData] = useState<DataObject>({});
    const [error, setError] = useState<string | null>(null);

    const fetchData = async (queryParameter: QueryParameter) => {
        try {
            console.log("Fetching data with query:", queryParameter.sparql_query);
            const response = await getData(queryParameter);
            console.log("Raw response:", response);
            if (response.status === "success" && response.message?.results?.bindings) {
                console.log("Bindings found:", response.message.results.bindings);
                return response.message.results.bindings;
            }
            console.log("No bindings found in response");
            return [];
        } catch (err) {
            console.error("Error fetching data:", err);
            return [];
        }
    };

    const loadData = async () => {
        try {
            const page = enititycardmapperconfig.EntityViewCardsMaper.find((page: EntityViewCard) => page.slug === slug);
            const filename = page ? page.filename : "";

            const model_data = await import(`../../../components/${filename}`);
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
            console.log("Fetching box data for extractedBoxes:", extractedBoxes);
            console.log("Raw ID from params:", id);
            console.log("Decoded ID:", decodeURIComponent(id));
            
            for (const box of extractedBoxes) {
                if (box.cardtype === "card" && box.sparql_query) {
                    console.log("Processing box:", box);
                    console.log("Original SPARQL query:", box.sparql_query);
                    
                    // Properly handle URI replacement for SPARQL
                    let query = box.sparql_query;
                    const decodedId = decodeURIComponent(id);
                    
                    // If the query uses VALUES with angle brackets, ensure proper URI formatting
                    if (query.includes('VALUES') && query.includes('<{0}>')) {
                        // Ensure the URI is properly formatted
                        const uri = decodedId.startsWith('<') && decodedId.endsWith('>') 
                            ? decodedId 
                            : `<${decodedId}>`;
                        query = query.replace(/<\{0\}>/g, uri);
                        console.log("URI replacement - decodedId:", decodedId);
                        console.log("URI replacement - final uri:", uri);
                    } else {
                        // For other cases, just do simple replacement
                        query = query.replace(/\{0\}/g, decodedId);
                    }
                    
                    console.log("Final processed query:", query);
                    const boxData = await fetchData({sparql_query: query});
                    console.log("Box data before processing:", boxData);
                    const formattedData = await processSparqlQueryResult(boxData);
                    console.log("Formatted data:", formattedData);
                    setData((prevData) => ({
                        ...prevData,
                        [box.slug || "unknown"]: formattedData,
                    }));
                }
            }
        };

        if (extractedBoxes.length > 0) {
            fetchBoxData();
        }
    }, [extractedBoxes, id]);

    return (
        <div className="kb-page-margin pt-12">
            <div className="grid grid-cols-1 ml-8">
                <div className="w-full bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="p-4">
                        <h2 className="text-xl font-bold">{decodeURIComponent(id).substring(decodeURIComponent(id).lastIndexOf("/") + 1)}</h2>
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
                                            </h2>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-gray-700 mb-4">{entitycards.description}</p>
                                            <div className="bg-white p-4 rounded-lg border border-gray-300">
                                                {data[entitycards.slug ?? "unknown"] ? (
                                                    Object.entries(data[entitycards.slug ?? "unknown"]).map(([key, value], idx) => (
                                                        <div key={idx} className="mb-2">
                                                            <span className="font-semibold">{key}:</span>{" "}
                                                            <span>{value}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    "No data available"
                                                )}
                                            </div>
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

