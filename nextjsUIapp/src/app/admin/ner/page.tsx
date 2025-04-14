"use client";

import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {useSession} from "next-auth/react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

// Define types for our entities and results
interface Entity {
    entity: string;
    entityType: string;
    originalEntityType: string;
    start: number;
    end: number;
    sentence: string;
    paper_location: string;
    paper_title: string;
    doi: string;
    ontology_id: string | null;
    ontology_label: string | null;
    judge_score: number;
    feedback?: 'up' | 'down';
    contributed_by?: string;
}

interface EntityResults {
    [key: string]: Entity[];
}

interface Results {
    entities: EntityResults;
    documentName?: string;
    processedAt?: string;
    corrected?: boolean;
}

export default function NamedEntityRecognition() {
    const {data: session} = useSession();
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [results, setResults] = useState<Results | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeEntityType, setActiveEntityType] = useState<string | null>(null);
    const [editingEntity, setEditingEntity] = useState<{type: string, index: number} | null>(null);
    const [correction, setCorrection] = useState<string>('');
    const [entityType, setEntityType] = useState<string>('');
    const [allApproved, setAllApproved] = useState<boolean>(false);
    const [allEntityTypes, setAllEntityTypes] = useState<string[]>([]);

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
                selectedFile.type === "application/pdf"
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
            console.log('Starting form submission...');
            const formData = new FormData();
            formData.append("pdf_file", file);
            if (process.env.NEXT_PUBLIC_JWT_USER) {
                formData.append("email", process.env.NEXT_PUBLIC_JWT_USER);
            }
            if (process.env.NEXT_PUBLIC_JWT_PASSWORD) {
                formData.append("password", process.env.NEXT_PUBLIC_JWT_PASSWORD);
            }
            
            // Read and append all required YAML files
            const filesToLoad = [
                { name: 'agent_config_file', file: process.env.NEXT_PUBLI_AGENT_CONFIG || 'ner_agent.yaml' },
                { name: 'task_config_file', file: process.env.NEXT_PUBLI_TASK_CONFIG || 'ner_task.yaml' },
                { name: 'embedder_config_file', file: process.env.NEXT_PUBLI_EMBEDDING_CONFIG || 'embedding.yaml' },
                { name: 'knowledge_config_file', file: process.env.NEXT_PUBLI_KNOWLEDGE_CONFIG || 'search_ontology_knowledge.yaml' }
            ];

            console.log('Loading YAML files...');
            for (const fileConfig of filesToLoad) {
                console.log(`Loading ${fileConfig.name}...`);
                const response = await fetch(`/api/config?file=${fileConfig.file}`);
                if (!response.ok) {
                    console.error(`Failed to load ${fileConfig.name}:`, response.status, response.statusText);
                    throw new Error(`Failed to load ${fileConfig.name}`);
                }
                const text = await response.text();
                const blob = new Blob([text], { type: 'application/yaml' });
                formData.append(fileConfig.name, blob, fileConfig.file);
                console.log(`Successfully loaded ${fileConfig.name}`);
            }

            // Add boolean flags
            if (process.env.NEXT_PUBLIC_ENABLE_WEIGHTSANDBIAS) {
                formData.append("ENABLE_WEIGHTSANDBIAS", process.env.NEXT_PUBLIC_ENABLE_WEIGHTSANDBIAS);
            }
            if (process.env.NEXT_PUBLIC_ENABLE_MLFLOW) {
                formData.append("ENABLE_MLFLOW", process.env.NEXT_PUBLIC_ENABLE_MLFLOW);
            }
            if (process.env.NEXT_PUBLIC_ENABLE_KG_SOURCE) {
                formData.append("ENABLE_KG_SOURCE", process.env.NEXT_PUBLIC_ENABLE_KG_SOURCE);
            }

            // Add Weaviate configuration
            if (process.env.NEXT_PUBLIC_ONTOLOGY_DATABASE) {
                formData.append("ONTOLOGY_DATABASE", process.env.NEXT_PUBLIC_ONTOLOGY_DATABASE);
            }
            if (process.env.NEXT_PUBLIC_WEAVIATE_API_KEY) {
                formData.append("WEAVIATE_API_KEY", process.env.NEXT_PUBLIC_WEAVIATE_API_KEY);
            }
            if (process.env.NEXT_PUBLIC_WEAVIATE_HTTP_HOST) {
                formData.append("WEAVIATE_HTTP_HOST", process.env.NEXT_PUBLIC_WEAVIATE_HTTP_HOST);
            }
            if (process.env.NEXT_PUBLIC_WEAVIATE_HTTP_PORT) {
                formData.append("WEAVIATE_HTTP_PORT", process.env.NEXT_PUBLIC_WEAVIATE_HTTP_PORT);
            }
            if (process.env.NEXT_PUBLIC_WEAVIATE_HTTP_SECURE) {
                formData.append("WEAVIATE_HTTP_SECURE", process.env.NEXT_PUBLIC_WEAVIATE_HTTP_SECURE);
            }
            if (process.env.NEXT_PUBLIC_WEAVIATE_GRPC_HOST) {
                formData.append("WEAVIATE_GRPC_HOST", process.env.NEXT_PUBLIC_WEAVIATE_GRPC_HOST);
            }
            if (process.env.NEXT_PUBLIC_WEAVIATE_GRPC_PORT) {
                formData.append("WEAVIATE_GRPC_PORT", process.env.NEXT_PUBLIC_WEAVIATE_GRPC_PORT);
            }
            if (process.env.NEXT_PUBLIC_WEAVIATE_GRPC_SECURE) {
                formData.append("WEAVIATE_GRPC_SECURE", process.env.NEXT_PUBLIC_WEAVIATE_GRPC_SECURE);
            }

            // Add Ollama configuration
            if (process.env.NEXT_PUBLIC_OLLAMA_API_ENDPOINT) {
                formData.append("OLLAMA_API_ENDPOINT", process.env.NEXT_PUBLIC_OLLAMA_API_ENDPOINT);
            }
            if (process.env.NEXT_PUBLIC_OLLAMA_MODEL) {
                formData.append("OLLAMA_MODEL", process.env.NEXT_PUBLIC_OLLAMA_MODEL);
            }

            // Add Grobid configuration
            if (process.env.NEXT_PUBLIC_GROBID_SERVER_URL_OR_EXTERNAL_SERVICE) {
                formData.append("GROBID_SERVER_URL_OR_EXTERNAL_SERVICE",
                    process.env.NEXT_PUBLIC_GROBID_SERVER_URL_OR_EXTERNAL_SERVICE);
            }
            if (process.env.NEXT_PUBLIC_EXTERNAL_PDF_EXTRACTION_SERVICE) {
                formData.append("EXTERNAL_PDF_EXTRACTION_SERVICE",
                    process.env.NEXT_PUBLIC_EXTERNAL_PDF_EXTRACTION_SERVICE);
            }
            
            console.log('All form data prepared, making API call...');
            
            // call our API route
            const response = await fetch("/api/process-document", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API call failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`Error: ${response.status}`);
            }

            console.log('API call successful, processing response...');
            const data = await response.json();

            // Extract unique entity types from the response
            const entityTypes = new Set<string>();
            Object.keys(data.entities).forEach(type => {
                entityTypes.add(type);
            });
            setAllEntityTypes(Array.from(entityTypes));

            // Initialize all entities with thumbs up feedback
            const resultsWithFeedback = {
                ...data,
                entities: Object.keys(data.entities).reduce((acc, type) => {
                    acc[type] = data.entities[type].map(entity => ({
                        ...entity,
                        feedback: 'up' as 'up'
                    }));
                    return acc;
                }, {} as EntityResults),
                documentName: file.name,
                processedAt: new Date().toISOString(),
                corrected: false
            };

            setResults(resultsWithFeedback);
            setAllApproved(true);

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
            setCorrection(updatedResults.entities[type][index].entity);
            // Set initial entity type to the current type or empty string
            setEntityType(updatedResults.entities[type][index].entityType || '');
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

    // Handle entity type change
    const handleEntityTypeChange = (type: string) => {
        setEntityType(type);
    };

    // Handle entity type submission
    const handleCorrectionSubmit = () => {
        if (!editingEntity || !results) return;

        const { type, index } = editingEntity;
        const updatedResults = { ...results };
        const entity = updatedResults.entities[type][index];

        updatedResults.entities[type][index] = {
            ...entity,
            entityType: entityType,
            originalEntityType: entity.entityType,
            feedback: 'up', // Auto-approve after classification
            contributed_by: session?.user?.email || 'unknown'
        };

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
                        corrections[entity.entity] = entity.correction;
                    }
                });
            });

            // Create form data with file and corrections
            const formData = new FormData();
            formData.append("document", file);
            formData.append("corrections", JSON.stringify(corrections));

            console.log("Saving data:");

            console.log(results);
            console.log("Corrected");
            console.log(formData);
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
            console.log("Final response from API");
            console.log(data);
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

    // Update the handleTypeChange function
    const handleTypeChange = (oldType: string, index: number, newType: string) => {
        if (!results) return;

        const updatedResults = { ...results };
        const entity = updatedResults.entities[oldType][index];

        // Remove from old type
        updatedResults.entities[oldType] = updatedResults.entities[oldType].filter((_, i) => i !== index);

        // Add to new type
        if (!updatedResults.entities[newType]) {
            updatedResults.entities[newType] = [];
        }
        updatedResults.entities[newType].push({
            ...entity,
            entityType: newType,
            originalEntityType: entity.entityType,
            feedback: 'up', // Auto-approve after type change
            contributed_by: session?.user?.email || 'unknown'
        });

        // Check if all entities now have thumbs up
        const allUp = Object.keys(updatedResults.entities).every(entityType =>
            updatedResults.entities[entityType].every(entity => entity.feedback === 'up')
        );

        setAllApproved(allUp);
        setResults(updatedResults);
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
                                                <EntityCard 
                                                    entity={entity} 
                                                    onFeedbackChange={handleFeedback}
                                                    onTypeChange={handleTypeChange}
                                                    type={activeEntityType}
                                                    index={index}
                                                    isEditing={entity.feedback === 'down'}
                                                    allEntityTypes={allEntityTypes}
                                                />
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
                        at: {results.processedAt ? new Date(results.processedAt).toLocaleString() : 'N/A'}
                    </div>
                </div>
            )}
        </div>
    );
}

const EntityCard = ({ 
    entity, 
    onFeedbackChange,
    type,
    index,
    onTypeChange,
    isEditing,
    allEntityTypes
}: { 
    entity: Entity; 
    onFeedbackChange: (type: string, index: number, feedback: 'up' | 'down') => void;
    onTypeChange: (oldType: string, index: number, newType: string) => void;
    type: string;
    index: number;
    isEditing: boolean;
    allEntityTypes: string[];
}) => {
    // Function to highlight the entity in the sentence
    const highlightEntityInSentence = (sentence: string, entityText: string, start: number, end: number) => {
        if (!sentence || !entityText) return sentence;
        
        // Create the highlighted version
        const before = sentence.substring(0, start);
        const highlighted = `<span class="bg-yellow-200 dark:bg-yellow-600 px-1 rounded font-medium">${entityText}</span>`;
        const after = sentence.substring(end);
        
        return `${before}${highlighted}${after}`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {entity.entity}
                        {entity.originalEntityType !== entity.entityType && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                (changed from: {entity.originalEntityType})
                            </span>
                        )}
                    </h3>
                    {isEditing ? (
                        <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Entity Type</label>
                            <select
                                value={entity.entityType}
                                onChange={(e) => onTypeChange(type, index, e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-gray-100"
                            >
                                {allEntityTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Type: {entity.entityType}</p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">Confidence: {(entity.judge_score * 100).toFixed(1)}%</p>
                    {entity.contributed_by && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">Changed by: {entity.contributed_by}</p>
                    )}
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => onFeedbackChange(type, index, 'up')}
                        className={`p-2 rounded-full ${entity.feedback === 'up' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                    >
                        <ThumbsUp className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => onFeedbackChange(type, index, 'down')}
                        className={`p-2 rounded-full ${entity.feedback === 'down' ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                    >
                        <ThumbsDown className="h-5 w-5" />
                    </button>
                </div>
            </div>
            
            <div className="space-y-2">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Sentence:</span>{" "}
                    <div 
                        className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded"
                        dangerouslySetInnerHTML={{
                            __html: highlightEntityInSentence(
                                entity.sentence,
                                entity.entity,
                                entity.start,
                                entity.end
                            )
                        }}
                    />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Location:</span> {entity.paper_location}
                </div>
                {entity.paper_title && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium">Paper:</span> {entity.paper_title}
                    </div>
                )}
                {entity.doi && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium">DOI:</span> {entity.doi}
                    </div>
                )}
                {entity.ontology_id && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium">Ontology ID:</span> {entity.ontology_id}
                    </div>
                )}
                {entity.ontology_label && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium">Ontology Label:</span> {entity.ontology_label}
                    </div>
                )}
            </div>
        </div>
    );
};
