"use client";

import yaml from "@/src/app/components/config-home.yaml";
import {useEffect, useState} from "react";
import {getData} from "@/src/app/components/getData";
import {Brain, Database, FileText, Users, Sparkles, ExternalLink, Upload, Network, CheckCircle, FileCheck, Code, Layers, BookOpen, Search, UsersRound, Globe} from "lucide-react";

export default function Home() {
    const [modelBoxCountHeaderTitle, setModelBoxCountHeaderTitle] = useState("");
    const [modelBoxCountHeaderSubTitle, setModelBoxCountHeaderSubTitle] = useState("");

    const [structuedModelHeaderTitle, setStructuedModelHeaderTitle] = useState("");
    const [structuedModelHeaderSubTitle, setStructuedModelHeaderSubTitle] = useState("");

    const [brainkbMainPageTitle, setBrainkbMainPageTitle] = useState("");
    const [brainkbMainPageSubTitle, setBrainkbMainPageSubTitle] = useState("");

    const [dataCount, setCountData] = useState<any[]>([])

    const fetchAndSetData = async () => {
        setModelBoxCountHeaderTitle("");
        setModelBoxCountHeaderSubTitle("");
        setStructuedModelHeaderTitle("");
        setStructuedModelHeaderSubTitle("");
        setBrainkbMainPageTitle("");
        setBrainkbMainPageSubTitle("");
        setCountData([]);


        const boxiconsdetailsCounter = yaml.headersboxpage.find((page) => page.slug === "statisticsboxheader");
        // console.log(boxiconsdetailsCounter);

        const page_title = boxiconsdetailsCounter ? boxiconsdetailsCounter.title : "";
        const page_sub_title = boxiconsdetailsCounter ? boxiconsdetailsCounter.subtitle : "";
        setModelBoxCountHeaderTitle(page_title);
        setModelBoxCountHeaderSubTitle(page_sub_title);

        const structuredmodelHeader = yaml.headersboxpage.find((page) => page.slug === "structuredmodelsheader");
        // console.log(structuredmodelHeader);

        const structured_page_title = structuredmodelHeader ? structuredmodelHeader.title : "";
        const structured_page_sub_title = structuredmodelHeader ? structuredmodelHeader.subtitle : "";
        setStructuedModelHeaderTitle(structured_page_title);
        setStructuedModelHeaderSubTitle(structured_page_sub_title);

        const brainkbmainpge = yaml.headersboxpage.find((page) => page.slug === "brainkbmainpge");
        // console.log(brainkbmainpge);

        const brainkb_title = brainkbmainpge ? brainkbmainpge.title : "";
        const brainkb_sub_title = brainkbmainpge ? brainkbmainpge.subtitle : "";
        setBrainkbMainPageTitle(brainkb_title);
        setBrainkbMainPageSubTitle(brainkb_sub_title);
    };

    useEffect(() => {
        fetchAndSetData();

        const fetchAllData = async () => {
            const updatedDataCount = await Promise.all(
                yaml.boxiconsstatisticscount.map(async (page) => {
                    const response = await fetchData(page.sparql_query);
                    return response ? response.message.results.bindings[0].count.value : null;
                })
            );
            setCountData(updatedDataCount);
        };

        fetchAllData();
    }, []);

    const fetchData = async (query_to_execute) => {
        const queryParameter = {sparql_query: query_to_execute};

        // Read endpoint from environment variable for this specific page
        const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";

        try {
            const response = await getData(queryParameter, endpoint);

            if (response.status === "success" && response.message?.results?.bindings) {
                const bindings = response.message.results.bindings;
                return response;
            } else {
                console.error("Unexpected response format:", response);
            }
        } catch (e) {
            const error = e;
            console.error("Error fetching data:");
        }
    };


    // Centralized icon mapping
    const getIconBySlug = (iconSlug: string) => {
        const iconMap: { [key: string]: any } = {
            "brain": Brain,
            "database": Database,
            "filetext": FileText,
            "users": Users,
            "code": Code,
            "layers": Layers,
            "bookopen": BookOpen,
            "filecheck": FileCheck,
            "network": Network,
            "search": Search,
            "usersround": UsersRound,
            "globe": Globe,
        };
        return iconMap[iconSlug?.toLowerCase()] || Database;
    };

    // Color theme mapping
    const getColorTheme = (theme: string) => {
        const themes: { [key: string]: any } = {
            "blue": {
                gradient: "from-blue-500 to-blue-600",
                borderHover: "hover:border-blue-500",
                text: "text-blue-600",
                hover: "hover:text-blue-700"
            },
            "green": {
                gradient: "from-green-500 to-green-600",
                borderHover: "hover:border-green-500",
                text: "text-green-600",
                hover: "hover:text-green-700"
            },
            "purple": {
                gradient: "from-purple-500 to-purple-600",
                borderHover: "hover:border-purple-500",
                text: "text-purple-600",
                hover: "hover:text-purple-700"
            }
        };
        return themes[theme?.toLowerCase()] || themes["blue"];
    };

    return (
        <div className="main-holder-brainkb">
            {/* Hero Section */}
            <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-sky-50 via-white to-emerald-50">
                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
                    <div className="text-center animate-fade-in">
                        <div className="inline-flex items-center justify-center mb-6">
                            <Brain className="w-16 h-16 text-sky-500 animate-pulse" />
                        </div>
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 animate-slide-up">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-600 to-emerald-600">
                                {brainkbMainPageTitle || "BrainKB"}
                            </span>
                        </h1>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-light text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed animate-slide-up">
                            {brainkbMainPageSubTitle || "Facilitating Evidence-Based Decision Making to Unlock the Mysteries of the Mind"}
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 animate-slide-up">
                            <a
                                href="/knowledge-base"
                                className="px-8 py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                            >
                                View Knowledge Base
                            </a>
                            <a
                                href="#structured-models"
                                className="px-8 py-3 bg-white text-sky-600 border-2 border-sky-600 rounded-lg font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300"
                            >
                                Explore Models
                            </a>
                            <a
                                href="#statistics"
                                className="px-8 py-3 bg-white text-sky-600 border-2 border-sky-600 rounded-lg font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300"
                            >
                                View Statistics
                            </a>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
            </section>

            {/* Key Features Section */}
            <section className="py-20 bg-gradient-to-br from-gray-50 to-sky-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-slide-up">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                            {yaml.keyfeatures?.title || "Key Features"}
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
                            {yaml.keyfeatures?.subtitle || "Powerful tools for neuroscience knowledge extraction and management"}
                        </p>
                        <p className="text-sm text-gray-500 italic">
                            Login by clicking the button on the top-right navbar to try use these features.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {yaml.keyfeatures?.features?.map((feature, index) => {
                            const Icon = getIconBySlug(feature.icon_slug);
                            const colorScheme = getColorTheme(feature.color_theme);
                            return (
                                <div key={index} className={`group bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent ${colorScheme.borderHover}`}>
                                    <a 
                                        href={feature.link}
                                        className="block"
                                    >
                                        <div className={`w-16 h-16 bg-gradient-to-br ${colorScheme.gradient} rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 cursor-pointer`}>
                                            <Icon className="w-8 h-8 text-white" />
                                        </div>
                                    </a>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                                    <p className="text-sm text-gray-500 mb-4">{feature.short_description}</p>
                                    <p className="text-gray-600 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* What is BrainKB Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-slide-up">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                            {yaml.whatisbrainkb?.title || "What is BrainKB?"}
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
                            {yaml.whatisbrainkb?.subtitle || 
                             "BrainKB is a platform designed to support neuroscience research by structuring and organizing scientific knowledge using knowledge graphs (KGs) for delivering evidence-based insights."}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {yaml.whatisbrainkb?.bullet_points?.map((point, index) => {
                                const CardIcon = getIconBySlug(point.icon_slug || "");
                                const gradient = point.gradient || "from-gray-500 to-gray-600";
                                const heading = point.heading || "";
                                return (
                                    <div
                                        key={index}
                                        className="group bg-gradient-to-br from-sky-50 to-emerald-50 rounded-xl p-6 border border-sky-100 hover:shadow-xl hover:border-sky-300 transition-all duration-300 transform hover:-translate-y-1"
                                    >
                                        <div className="mb-4">
                                            <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                                                <CardIcon className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-sky-600 transition-colors">
                                            {heading}
                                        </h3>
                                        <p className="text-gray-700 leading-relaxed">
                                            {point.title}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Statistics Section */}
            <section id="statistics" className="py-20 bg-gradient-to-br from-gray-50 to-sky-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-slide-up">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                            Knowledge Graph Metrics
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-2">
                            {modelBoxCountHeaderSubTitle || "Number of unique samples from different models."}
                        </p>
                        <p className="text-sm text-gray-500 italic">
                            As of November 2025
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {dataCount.map((count, index) => (
                            <div
                                key={index}
                                className="group relative bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-sky-500"
                            >
                                    <div className="flex flex-col items-center text-center">
                                    <div className="mb-4 p-3 bg-gradient-to-br from-sky-100 to-emerald-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                                        {(() => {
                                            const StatIcon = getIconBySlug(yaml.boxiconsstatisticscount[index]?.icon_slug || "");
                                            return <StatIcon className="w-8 h-8 text-sky-500" />;
                                        })()}
                                    </div>
                                    <h2 className="text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-emerald-600 mb-3">
                                        {count || "—"}
                                    </h2>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                                        {yaml.boxiconsstatisticscount[index]?.name}
                                    </h3>
                                    {yaml.boxiconsstatisticscount[index]?.short_description && (
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {yaml.boxiconsstatisticscount[index]?.short_description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Structured Models Section */}
            <section id="structured-models" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-slide-up">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                            {structuedModelHeaderTitle || "Structured Models"}
                        </h2>
                        <p 
                            className="text-xl text-gray-600 max-w-3xl mx-auto"
                            dangerouslySetInnerHTML={{__html: structuedModelHeaderSubTitle || "Structured models used in BrainKB."}}
                        ></p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {yaml.structuredmodelsbox.map((page, index) => {
                            const ModelIcon = getIconBySlug(page.icon_slug || "");
                            return (
                                <div
                                    key={index}
                                    className="group relative bg-white border-2 border-gray-200 rounded-xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:border-sky-500"
                                >
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-sky-100 to-emerald-100 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative z-10">
                                        <div className="mb-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                                                <ModelIcon className="w-7 h-7 text-white" />
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-sky-600 transition-colors">
                                            {page.title}
                                        </h3>
                                        <p className="text-gray-600 mb-6 leading-relaxed text-sm line-clamp-2 min-h-[3rem]">
                                            {page.description}
                                        </p>
                                        <a
                                            href={page.links}
                                            target={page.links.startsWith('http') ? '_blank' : '_self'}
                                            rel={page.links.startsWith('http') ? 'noopener noreferrer' : ''}
                                            className="inline-flex items-center gap-2 text-sky-600 font-semibold hover:text-sky-700 transition-colors group/link"
                                        >
                                            {page.links === "#" ? "Coming Soon" : "Read more"}
                                            <span className="group-hover/link:translate-x-1 transition-transform">→</span>
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Agents Section */}
            <section className="py-20 bg-gradient-to-b from-white to-gray-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-slide-up">
                    <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                    {yaml.publications?.title || "Powered by Advanced AI Agents"}
                                </h2>
                                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                                    {yaml.publications?.description || 
                                     "BrainKB leverages cutting-edge agentic frameworks for structured information extraction. Our platform utilizes STRUCTSENSE, a task-agnostic agentic framework that enables sophisticated structured information extraction with human-in-the-loop evaluation and benchmarking capabilities."}
                                </p>
                                {yaml.publications?.citation && (
                                    <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-purple-500">
                                        <p className="text-sm text-gray-600 italic mb-2">{yaml.publications.citation.label}</p>
                                        <p className="text-base text-gray-800 leading-relaxed mb-4">
                                            {yaml.publications.citation.text}
                                        </p>
                                        <a
                                            href={yaml.publications.citation.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                            {yaml.publications.citation.button_text || "See Research Paper"}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
