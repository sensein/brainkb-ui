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
    feedback?: 'up' | 'down';
    correction?: string;
    corrected?: boolean;
    originalText?: string;
    sentence?: string;
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
    const [editingEntity, setEditingEntity] = useState<{type: string, index: number} | null>(null);
    const [correction, setCorrection] = useState<string>('');
    const [allApproved, setAllApproved] = useState<boolean>(false);

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

            // Initialize all entities with thumbs up feedback
            const resultsWithFeedback = {
                ...data,
                entities: Object.keys(data.entities).reduce((acc, type) => {
                    acc[type] = data.entities[type].map(entity => ({
                        ...entity,
                        feedback: 'up' as 'up'
                    }));
                    return acc;
                }, {} as EntityResults)
            };

            setResults(resultsWithFeedback);
            setAllApproved(true); // Initially all are approved

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

    // Handle feedback (thumbs up/down)
    const handleFeedback = (type: string, index: number, feedback: 'up' | 'down') => {
        if (!results) return;

        const updatedResults = { ...results };
        updatedResults.entities[type][index].feedback = feedback;

        // If thumbs down, set up for editing
        if (feedback === 'down') {
            setEditingEntity({ type, index });
            setCorrection(updatedResults.entities[type][index].text);
        } else if (editingEntity?.type === type && editingEntity?.index === index) {
            // If changing from down to up, clear editing state
            setEditingEntity(null);
        }

        // Check if all entities have thumbs up
        const allUp = Object.keys(updatedResults.entities).every(entityType =>
            updatedResults.entities[entityType].every(entity => entity.feedback === 'up')
        );

        setAllApproved(allUp);
        setResults(updatedResults);
    };

    // Handle correction submission
    const handleCorrectionSubmit = () => {
        if (!editingEntity || !results) return;

        const { type, index } = editingEntity;
        const updatedResults = { ...results };
        updatedResults.entities[type][index].correction = correction;
        updatedResults.entities[type][index].feedback = 'up'; // Auto-approve after correction

        setResults(updatedResults);
        setEditingEntity(null);

        // Check if all entities now have thumbs up
        const allUp = Object.keys(updatedResults.entities).every(entityType =>
            updatedResults.entities[entityType].every(entity => entity.feedback === 'up')
        );

        setAllApproved(allUp);
    };

    // Handle final save
    const handleSave = async () => {
        if (!results || !file) return;

        setIsProcessing(true);

        try {
            // Prepare data with corrections
            const corrections = {};
            Object.keys(results.entities).forEach(type => {
                results.entities[type].forEach(entity => {
                    if (entity.correction) {
                        corrections[entity.text] = entity.correction;
                    }
                });
            });

            // Create form data with file and corrections
            const formData = new FormData();
            formData.append("document", file);
            formData.append("corrections", JSON.stringify(corrections));

            // Call API with corrections
            const response = await fetch("/api/process-document", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            // Get updated results with corrections applied
            const data = await response.json();

            // Update results with the corrected entities
            const resultsWithFeedback = {
                ...data,
                entities: Object.keys(data.entities).reduce((acc, type) => {
                    acc[type] = data.entities[type].map(entity => ({
                        ...entity,
                        feedback: 'up' as 'up'
                    }));
                    return acc;
                }, {} as EntityResults)
            };

            setResults(resultsWithFeedback);
            setAllApproved(true);

            // Show success message
            setError("Results saved successfully!");
        } catch (err) {
            console.error("Error saving corrections:", err);
            setError("Failed to save corrections. Please try again.");
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
                                    <ul className="space-y-4">
                                        {results.entities[activeEntityType].map((entity, index) => (
                                            <li key={index} className="border-b border-gray-200 dark:border-gray-600 pb-3">
                                                <div className="flex flex-col mb-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm font-medium">
                                                            {entity.correction || entity.text}
                                                            {(entity.correction || entity.corrected) && (
                                                                <span className="text-xs text-gray-500 ml-2">
                                                                    (corrected from: {entity.originalText || entity.text})
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            Confidence: {(entity.confidence * 100).toFixed(1)}%
                                                        </span>
                                                    </div>

                                                    {/* Sentence with highlighted entity */}
                                                    {entity.sentence && (
                                                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-600 rounded text-sm">
                                                            <p dangerouslySetInnerHTML={{
                                                                __html: entity.sentence.replace(
                                                                    entity.text,
                                                                    `<span class="bg-yellow-200 dark:bg-yellow-600 px-1 rounded font-medium">${entity.correction || entity.text}</span>`
                                                                )
                                                            }} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Feedback buttons */}
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex space-x-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFeedback(activeEntityType, index, 'up')}
                                                            className={`p-1 rounded ${
                                                                entity.feedback === 'up' 
                                                                    ? 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200' 
                                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                                            }`}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFeedback(activeEntityType, index, 'down')}
                                                            className={`p-1 rounded ${
                                                                entity.feedback === 'down' 
                                                                    ? 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-200' 
                                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                                            }`}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                                                            </svg>
                                                        </button>
                                                    </div>

                                                    {/* Correction input field */}
                                                    {editingEntity?.type === activeEntityType && editingEntity?.index === index && (
                                                        <div className="flex items-center space-x-2 mt-2">
                                                            <input
                                                                type="text"
                                                                value={correction}
                                                                onChange={(e) => setCorrection(e.target.value)}
                                                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                                placeholder="Enter correct term"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={handleCorrectionSubmit}
                                                                className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                                                            >
                                                                Apply
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
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

                    {/* Save button */}
                    {results && (
                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!allApproved || isProcessing}
                                className={`px-4 py-2 rounded-lg ${
                                    allApproved && !isProcessing
                                        ? 'bg-green-500 hover:bg-green-600 text-white'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                {isProcessing ? 'Saving...' : 'Save Results'}
                            </button>
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
