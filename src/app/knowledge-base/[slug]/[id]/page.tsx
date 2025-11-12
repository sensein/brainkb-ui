"use client";
import SideBarKBFromConfig from "../../../components/SideBarKBFromConfig";
import {useEffect, useState} from "react";
import enititycardmapperconfig from '../../../components/enititycardmapper.yaml';
import {getData} from "../../../components/getData";
import { processSparqlQueryResult } from "../../../components/helper";
import { useParams } from "next/navigation";
import {FileText, Loader2, AlertCircle, Info, Database} from "lucide-react";

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

    const entityName = decodeURIComponent(id).substring(decodeURIComponent(id).lastIndexOf("/") + 1);
    const isLoading = extractedBoxes.length === 0 || Object.keys(data).length === 0;

    return (
        <div className="kb-page-margin">
            <SideBarKBFromConfig/>
            
            {/* Hero Section */}
            <div className="grid fix-left-margin grid-cols-1 mb-8">
                <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-blue-500 to-emerald-500 rounded-2xl shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-600/20 to-transparent"></div>
                    <div className="relative px-8 py-12">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                            {entityName}
                        </h1>
                        {mainCardDescription && (
                            <p className="text-sky-100 text-base leading-relaxed">
                                {mainCardDescription}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="grid fix-left-margin grid-cols-1 gap-6">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
                        <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
                        <p className="text-gray-600">Loading entity data...</p>
                    </div>
                )}

                {!isLoading && extractedBoxes.length === 0 && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-yellow-500" />
                            <div>
                                <h3 className="text-lg font-semibold text-yellow-800">No Entity Cards Configured</h3>
                                <p className="text-yellow-700">This entity type does not have any cards configured yet.</p>
                            </div>
                        </div>
                    </div>
                )}

                {!isLoading && extractedBoxes.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {extractedBoxes.map((entitycards, index) => (
                            entitycards.cardtype === "card" && (
                                <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                                    {/* Card Header */}
                                    <div className="bg-gradient-to-r from-sky-500 to-blue-500 p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                                <Info className="w-5 h-5 text-white" />
                                            </div>
                                            <h2 className="text-xl font-bold text-white">
                                                {entitycards.name || "Entity Information"}
                                            </h2>
                                        </div>
                                    </div>
                                    
                                    {/* Card Body */}
                                    <div className="p-6">
                                        {entitycards.description && (
                                            <p className="text-gray-600 mb-6 leading-relaxed">
                                                {entitycards.description}
                                            </p>
                                        )}
                                        
                                        <div className="bg-gradient-to-br from-gray-50 to-sky-50 p-6 rounded-lg border border-gray-200">
                                            {data[entitycards.slug ?? "unknown"] ? (
                                                <div className="space-y-4">
                                                    {Object.entries(data[entitycards.slug ?? "unknown"]).map(([key, value], idx) => (
                                                        <div key={idx} className="pb-4 border-b border-gray-200 last:border-b-0 last:pb-0">
                                                            <div className="flex items-start gap-3">
                                                                <div className="flex-shrink-0 mt-1">
                                                                    <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                                                                        <Database className="w-4 h-4 text-sky-600" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <dt className="text-sm font-semibold text-gray-900 mb-1 uppercase tracking-wide">
                                                                        {key}
                                                                    </dt>
                                                                    <dd className="text-base text-gray-700 break-words">
                                                                        {value}
                                                                    </dd>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                                    <p className="text-gray-500 font-medium">No data available</p>
                                                    <p className="text-sm text-gray-400 mt-1">This card does not have any data to display.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IndividualEntityPage;

