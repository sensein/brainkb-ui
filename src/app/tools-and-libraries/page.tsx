"use client";

import { Wrench, ExternalLink, Code, Network, Database, Sparkles, CheckCircle } from "lucide-react";
import yaml from "@/src/app/components/tools-libraries.yaml";

export default function ToolsLibraries() {
    const libraries = yaml.libraries;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-sky-50">
            {/* Hero Section */}
            <section className="py-20 bg-gradient-to-br from-sky-50 via-white to-emerald-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mt-[30px]">
                        <div className="inline-flex items-center justify-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                                <Wrench className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h1 className="text-5xl sm:text-6xl font-extrabold mb-6">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-600 to-emerald-600">
                                Tools & Libraries
                            </span>
                        </h1>
                        <p className="text-xl sm:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
                            Open-source Python libraries designed to support and enhance neuroscience research
                        </p>
                    </div>
                </div>
            </section>

            {/* Overview Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-emerald-50 rounded-2xl p-8 md:p-12 border-2 border-sky-200 shadow-xl">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-200/20 to-emerald-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-200/20 to-sky-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                                    <Code className="w-7 h-7 text-white" />
                                </div>
                                <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
                                    Overview
                                </h2>
                            </div>
                            
                            <p className="text-lg sm:text-xl text-gray-700 leading-relaxed mb-8 max-w-4xl">
                                BrainKB provides a set of tools and libraries designed to support and enhance neuroscience research. 
                                Developed as part of the BrainKB project, these tools and libraries facilitate operations such as 
                                knowledge extraction, structured representation, provenance tracking, and advanced analytics.
                            </p>
                            
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-sky-100 shadow-md">
                                <p className="text-base text-gray-700 font-medium mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-sky-600" />
                                    <span>Flexible Integration</span>
                                </p>
                                <p className="text-gray-600 leading-relaxed">
                                    While these tools are (or will be) integrated into the BrainKB platform to support the BrainKB objective, 
                                    they are also designed for <strong className="text-gray-900">independent use</strong>, offering flexibility 
                                    for researchers and developers working in neuroscience and related fields.
                                </p>
                            </div>
                            
                            {/* Key Capabilities */}
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-start gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-sky-100">
                                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Knowledge Extraction</h3>
                                        <p className="text-sm text-gray-600">Extract structured data from various sources</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-sky-100">
                                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Provenance Tracking</h3>
                                        <p className="text-sm text-gray-600">Track data lineage and changes</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-sky-100">
                                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Advanced Analytics</h3>
                                        <p className="text-sm text-gray-600">Perform complex data analysis</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Libraries Section */}
            <section className="py-20 bg-gradient-to-br from-gray-50 to-sky-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                            Available Libraries
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            These tools facilitate operations such as knowledge extraction, structured representation, 
                            provenance tracking, and advanced analytics. While integrated into BrainKB, they are also 
                            designed for independent use.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {libraries.map((lib, index) => (
                            <div
                                key={index}
                                className="group bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-sky-400 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <Wrench className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                                            {lib.name}
                                        </h3>
                                        <p className="text-gray-600 mb-4 leading-relaxed">
                                            {lib.description}
                                        </p>
                                        <div className="flex flex-wrap gap-3">
                                            {lib.link_library && (
                                                <a
                                                    href={lib.link_library}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors shadow-md hover:shadow-lg"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    Visit Library
                                                </a>
                                            )}
                                            {lib.link_example && (
                                                <a
                                                    href={lib.link_example}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-sky-600 border-2 border-sky-600 rounded-lg text-sm font-medium hover:bg-sky-50 transition-colors"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    View Example
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
