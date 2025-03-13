"use client";

import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {useSession} from "next-auth/react";

// Define types for our entities and results
interface Entity {
    text: string;
    start: number;
    end: number;
    confidence: number;
}

interface EntityResults {
    [key: string]: Entity[];
}

interface ProcessingResult {
    entities: EntityResults;
    documentName: string;
    processedAt: string;
}

export default function NamedEntityRecognition() {
    const {data: session} = useSession();
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [results, setResults] = useState<ProcessingResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeEntityType, setActiveEntityType] = useState<string | null>(null);

    // Check if user is logged in
    useEffect(() => {
        if (!session || !session.user) {
            router.push("/login");
        }
    }, [session, router]);

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Check if file is PDF or text
            if (
                selectedFile.type === "application/pdf" ||
                selectedFile.type === "text/plain"
            ) {
                setFile(selectedFile);
                setError(null);
            } else {
                setFile(null);
                setError("Please upload a PDF or text file only.");
            }
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!file) {
            setError("Please select a file to upload.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setResults(null);

        try {
            const formData = new FormData();
            formData.append("document", file);

            // call the API that process the document
            const response = await fetch("/api/process-document", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();
            setResults(data);

            // Set the first entity type as active
            if (data.entities && Object.keys(data.entities).length > 0) {
                setActiveEntityType(Object.keys(data.entities)[0]);
            }
        } catch (err) {
            console.error("Error processing document:", err);
            setError("Failed to process document. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // If not logged in, show loading
    if (!session) {
        return <p>Loading...</p>;
    }

    return (
        <div className="flex flex-col max-w-6xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Named Entity Recognition</h1>

            {/* File Upload Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-6">
                <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Upload a PDF or text file to extract named entities such as people, organizations, locations, and
                    more.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div
                        className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                        <input
                            type="file"
                            id="document"
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".pdf,.txt"
                        />
                        <label
                            htmlFor="document"
                            className="cursor-pointer flex flex-col items-center justify-center"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-12 w-12 text-gray-400 mb-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                Click to select a file or drag and drop
              </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                PDF or TXT files only
              </span>
                        </label>
                        {file && (
                            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                                Selected file: <span
                                className="font-semibold">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={!file || isProcessing}
                        className={`w-full px-4 py-2 text-white rounded-lg ${
                            !file || isProcessing
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-500 hover:bg-blue-600"
                        }`}
                    >
                        {isProcessing ? "Processing..." : "Process Document"}
                    </button>
                </form>
            </div>

            {/* Results Section */}
            {results && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                    <h2 className="text-lg font-semibold mb-4">Extracted Entities</h2>

                    {/* Entity Type Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                        <nav className="-mb-px flex space-x-8">
                            {Object.keys(results.entities).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setActiveEntityType(type)}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                        activeEntityType === type
                                            ? "border-blue-500 text-blue-500"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    {type} ({results.entities[type].length})
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Entity List */}
                    {activeEntityType && (
                        <div className="space-y-4">
                            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300">
                                {activeEntityType} Entities
                            </h3>

                            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                                {results.entities[activeEntityType].length > 0 ? (
                                    <ul className="space-y-2">
                                        {results.entities[activeEntityType].map((entity, index) => (
                                            <li key={index} className="flex justify-between items-center">
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {entity.text}
          </span>
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {entity.sentence.substring(0, entity.start)}
                                                    <span className="bg-yellow-300 dark:bg-yellow-600 px-1 rounded">
              {entity.text}
            </span>
                                                    {entity.sentence.substring(entity.end)}
          </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
            Confidence: {(entity.confidence * 100).toFixed(1)}%
          </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        No {activeEntityType} entities found in the document.
                                    </p>
                                )}
                            </div>

                        </div>
                    )}

                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                        Document: {results.documentName} • Processed
                        at: {new Date(results.processedAt).toLocaleString()}
                    </div>
                </div>
            )}
        </div>
    );
}
