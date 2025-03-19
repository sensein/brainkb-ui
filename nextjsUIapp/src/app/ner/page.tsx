"use client";

import { useState, useEffect } from "react";
import { fetchEntityData } from "./services/dataService";
import { calculateStats } from "./utils/entityUtils";
import StatsSection from "./components/StatsSection";
import Link from "next/link";
import EntityTypeDropdown from "@/src/app/ner/components/EntityTypeDropdown";

export default function NamedEntityRecognitionViewer() {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        totalEntities: 0,
        approvedEntities: 0,
        correctedEntities: 0,
        pendingReview: 0
    });
    const [entityTypes, setEntityTypes] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await fetchEntityData();
                setEntityTypes(Object.keys(data.entities));
                setStats(calculateStats(data));
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("Failed to fetch entity data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="flex flex-col max-w-6xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Named Entity Recognition (NER)</h1>
            <div className="stats-navigation">
                <StatsSection
                    stats={stats}
                    isLoading={isLoading}
                    error={error}
                    // Custom click handler for navigation
                    customClickHandler={(filter) => {
                        // Navigate to all/page.tsx with the selected filter
                        window.location.href = `/ner/all?filter=${filter}`;
                    }}
                />
                <div className="text-center text-sm text-gray-500 mt-2">
                    Click on any statistic to view the corresponding entities
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-8">
                <h2 className="text-xl font-semibold mb-4">Entity Types</h2>
                {isLoading ? (
                    <p className="text-gray-500">Loading entity types...</p>
                ) : error ? (
                    <p className="text-red-500">{error}</p>
                ) : entityTypes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link
                            href={`/ner/all`}
                            className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                            <h3 className="text-lg font-medium mb-2">All</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">View all NER entities</p>
                        </Link>
                        {entityTypes.map((type) => (
                            <Link
                                key={type}
                                href={`/ner/entity/${type}`}
                                className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                                <h3 className="text-lg font-medium mb-2">{type}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">View all entities of type {type}</p>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No entity types found.</p>
                )}
                <br />
                <hr />
                <br />
                <h2 className="text-xl font-semibold mb-4">Entity Types Dropdown View</h2>
                <div className="inline-flex items-center px-1 pt-1" style={{ zIndex: 999 }}>
                    <EntityTypeDropdown />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <h2 className="text-xl font-semibold mb-4">How to Contribute?</h2>
                <div className="space-y-4">
                    {["Review Entities", "Provide Feedback", "Correct Entities", "Contribute with new NER"].map((step, index) => (
                        <div key={index} className="flex items-start">
                            <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-8 h-8 flex items-center justify-center mr-3 mt-0.5">
                                <span className="text-blue-800 dark:text-blue-200 font-medium">{index + 1}</span>
                            </div>
                            <div>
                                <h3 className="font-medium mb-1">{step}</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    {step === "Review Entities" && "Browse through the extracted entities and review their accuracy. You can filter by entity type or status."}
                                    {step === "Provide Feedback" && "Use the thumbs up/down buttons to indicate whether an entity is correctly identified."}
                                    {step === "Correct Entities" && "If an entity is incorrectly identified, you can provide the correct text to improve future recognition."}
                                    {step === "Contribute with new NER" && "If you want to contribute new NER data, log in to the BrainKB portal and upload a PDF for automated NER extraction."}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex justify-center">
                    <Link href="/login" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        Get Started
                    </Link>
                </div>
            </div>
        </div>
    );
}
