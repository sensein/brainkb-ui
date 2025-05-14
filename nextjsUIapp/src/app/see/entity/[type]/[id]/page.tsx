"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Entity } from "@/src/app/see/types";
import { fetchEntityData } from "@/src/app/see/services/dataService";
import Link from "next/link";

interface EntityDetailPageProps {
    params: {
        type: string;
        id: string;
    };
}

export default function EntityDetailPage({ params }: EntityDetailPageProps) {
    const { type, id } = params;
    const router = useRouter();
    const [entity, setEntity] = useState<Entity | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEntity = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await fetchEntityData();
                const entityIndex = parseInt(id, 10);

                if (data.entities[type] && data.entities[type][entityIndex]) {
                    setEntity(data.entities[type][entityIndex]);
                } else {
                    setError(`Entity not found: ${type} #${id}`);
                }
            } catch (err) {
                console.error("Error fetching entity:", err);
                setError("Failed to fetch entity data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchEntity();
    }, [type, id]);

    if (isLoading) {
        return (
            <div className="flex flex-col max-w-4xl mx-auto p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md text-center">
                    <p className="text-gray-500">Loading entity details...</p>
                </div>
            </div>
        );
    }

    if (error || !entity) {
        return (
            <div className="flex flex-col max-w-4xl mx-auto p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                    <div className="mb-4">
                        <Link href="/ner" className="text-blue-500 hover:underline flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            Back to Entity List
                        </Link>
                    </div>
                    <p className="text-red-500">{error || "Entity not found"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col max-w-4xl mx-auto p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <div className="mb-4">
                    <Link href="/ner" className="text-blue-500 hover:underline flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back to Entity List
                    </Link>
                </div>

                <h1 className="text-2xl font-bold mb-6">Entity Details</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Entity Type</p>
                                <p className="text-base">{type}</p>
                            </div>
                            {entity.entityType && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Classification</p>
                                    <p className="text-base">{entity.entityType}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-medium text-gray-500">Current Text</p>
                                <p className="text-base font-medium">{entity.correction || entity.text}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Original Text</p>
                                <p className="text-base">{entity.originalText || entity.text}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Confidence</p>
                                <p className="text-base">{(entity.confidence * 100).toFixed(1)}%</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Status</p>
                                <p className="text-base">
                                    {entity.feedback === 'up' ? (
                                        <span className="text-green-600">Approved</span>
                                    ) : entity.feedback === 'down' ? (
                                        <span className="text-red-600">Pending Review</span>
                                    ) : (
                                        <span className="text-gray-600">Not Reviewed</span>
                                    )}
                                    {entity.corrected && (
                                        <span className="ml-2 text-yellow-600">(Corrected)</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold mb-4">Metadata</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Position</p>
                                <p className="text-base">Start: {entity.start}, End: {entity.end}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Contributed By</p>
                                <p className="text-base">{entity.contributedBy || "Anonymous"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Submitted At</p>
                                <p className="text-base">{entity.submittedAt ? new Date(entity.submittedAt).toLocaleString() : "Unknown"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sentence Context */}
                {entity.sentence && (
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-4">Sentence Context</h2>
                        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <p dangerouslySetInnerHTML={{
                                __html: entity.sentence.replace(
                                    entity.text,
                                    `<span class="${(entity.correction || entity.corrected) ? 'bg-yellow-300 dark:bg-yellow-700' : 'bg-yellow-200 dark:bg-yellow-600'} px-1 rounded font-medium">${entity.correction || entity.text}</span>`
                                )
                            }} />
                        </div>
                    </div>
                )}

                {/* Correction History */}
                <div>
                    <h2 className="text-lg font-semibold mb-4">Correction History</h2>
                    {entity.correctionHistory && entity.correctionHistory.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Original Text</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Corrected Text</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Corrected By</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {entity.correctionHistory.map((history, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{history.originalText}</td>
                                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{history.correctedText}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{history.correctedBy}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{new Date(history.correctedAt).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No correction history available</p>
                    )}
                </div>
            </div>
        </div>
    );
}
