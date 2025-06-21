"use client";

import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {useSession} from "next-auth/react";
import {ThumbsUp, ThumbsDown} from "lucide-react";
import {list} from "postcss";
import {NextResponse} from "next/server";

// Define types for our entities and results
interface Entity {
    entity: string;
    entityType: string;
    originalEntityType: string;
    start: number[];
    end: number[];
    sentence: string[];
    paper_location: string[];
    paper_title: string[];
    doi: string[];
    ontology_id: string | null;
    ontology_label: string | null;
    judge_score: number[];
    feedback?: 'up' | 'down';
    contributed_by?: string;
    changed_by?: string[];
}

interface EntityResults {
    [key: string]: Entity[];
}

interface Results {
    entities: EntityResults;
    documentName?: string;
    processedAt?: string;
}

// Helper to correct start/end indices if they do not match the entity string
function getCorrectedIndices(sentence: string, entity: string, origStart: number, origEnd: number) {
    if (sentence.substring(origStart, origEnd) === entity) {
        return { start: origStart, end: origEnd };
    }
    // Try to find the entity string in the sentence
    const idx = sentence.indexOf(entity);
    if (idx !== -1) {
        return { start: idx, end: idx + entity.length };
    }
    // Fallback: return original indices
    return { start: origStart, end: origEnd };
}

export default function NamedEntityRecognition() {
    const {data: session} = useSession();
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [results, setResults] = useState<Results | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeEntityType, setActiveEntityType] = useState<string | null>(null);
    const [editingEntity, setEditingEntity] = useState<{ type: string, index: number } | null>(null);
    const [correction, setCorrection] = useState<string>('');
    const [entityType, setEntityType] = useState<string>('');
    const [allApproved, setAllApproved] = useState<boolean>(false);
    const [allEntityTypes, setAllEntityTypes] = useState<string[]>([]);
    const [isSaved, setIsSaved] = useState<boolean>(false);
    const [apiKey, setApiKey] = useState<string>('');
    const [isApiKeyValid, setIsApiKeyValid] = useState<boolean>(false);

    // Check if API key exists in session storage
    useEffect(() => {
        const storedApiKey = sessionStorage.getItem('ner_api_key');
        if (storedApiKey) {
            setApiKey(storedApiKey);
            setIsApiKeyValid(true);
        }
    }, []);

    // Check if user is logged in
    useEffect(() => {
        if (!session || !session.user) {
            router.push("/login");
        }
    }, [session, router]);

    // Handle API key validation
    const handleApiKeySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!apiKey.trim()) {
            setError("Please enter an OpenRouter API key");
            return;
        }

        try {
            // Store API key in session storage
            sessionStorage.setItem('ner_api_key', apiKey.trim());
            setIsApiKeyValid(true);
            setError(null);
        } catch (err) {
            console.error("Error storing API key:", err);
            setError("Failed to store API key. Please try again.");
        }
    };

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isApiKeyValid) {
            setError("Please enter and validate API key first");
            return;
        }

        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type === "application/pdf") {
                setFile(selectedFile);
                setError(null);
            } else {
                setFile(null);
                setError("Please upload a PDF file only.");
            }
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isApiKeyValid) {
            setError("Please enter and validate API key first");
            return;
        }

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
            formData.append("current_loggedin_user", session?.user?.email || 'unknown');
            
            // Add API key to form data
            const storedApiKey = sessionStorage.getItem('ner_api_key');
            if (storedApiKey) {
                formData.append("api_key", storedApiKey);
            }

            if (process.env.NEXT_PUBLIC_JWT_USER) {
                formData.append("email", process.env.NEXT_PUBLIC_JWT_USER);
            }
            if (process.env.NEXT_PUBLIC_JWT_PASSWORD) {
                formData.append("password", process.env.NEXT_PUBLIC_JWT_PASSWORD);
            }

            // Read and append all required YAML files
            const filesToLoad = [
                {name: 'agent_config_file', file: process.env.NEXT_PUBLI_AGENT_CONFIG || 'ner_agent.yaml'},
                {name: 'task_config_file', file: process.env.NEXT_PUBLI_TASK_CONFIG || 'ner_task.yaml'},
                {name: 'embedder_config_file', file: process.env.NEXT_PUBLI_EMBEDDING_CONFIG || 'embedding.yaml'},
                {name: 'knowledge_config_file', file: process.env.NEXT_PUBLI_KNOWLEDGE_CONFIG || 'search_ontology_knowledge.yaml'}
            ];

            console.log('Loading YAML files...');
            for (const fileConfig of filesToLoad) {
                console.log(`Loading ${fileConfig.name}...`);
                const response = await fetch(`/api/config?file=${fileConfig.file}`);
                if (!response.ok) {
                    console.error(`Failed to load ${fileConfig.name}:`, response.status, response.statusText);
                    throw new Error(`Failed to load ${fileConfig.name}`);
                }
                let text = await response.text();

                // If this is the agent config file, update the API key
                if (fileConfig.name === 'agent_config_file' && storedApiKey) {
                    const config = JSON.parse(text);
                    // Update API key for all agents
                    ['extractor_agent', 'alignment_agent', 'judge_agent'].forEach(agent => {
                        if (config[agent] && config[agent].llm) {
                            config[agent].llm.api_key = storedApiKey;
                        }
                    });
                    text = JSON.stringify(config);
                }

                const blob = new Blob([text], {type: 'application/yaml'});
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
                 // Add timeout
                signal: AbortSignal.timeout(2000000) // 20 minutes timeout
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

            console.log("*****************************************************");
            console.log('API call successful, processing response...');
            const data = await response.json();
            console.log("response data:", JSON.stringify(data, null, 2));
            console.log("*****************************************************");

            // Transform the data to match our interface
            const transformedData: Results = {
                entities: data.entities,
                documentName: file.name,
                processedAt: new Date().toISOString(),
            };

            // Initialize all entities with thumbs up feedback if not already set
            Object.keys(transformedData.entities).forEach(key => {
                transformedData.entities[key] = transformedData.entities[key].map(entity => ({
                    ...entity,
                    feedback: entity.feedback || 'up',
                    // contributed_by: entity.contributed_by || session?.user?.email || 'unknown',
                    // changed_by: entity.changed_by || [session?.user?.email || 'unknown']
                }));
            });

            setResults(transformedData);
            setAllApproved(true);

            // Set the first entity type as active
            if (transformedData.entities && Object.keys(transformedData.entities).length > 0) {
                setActiveEntityType(Object.keys(transformedData.entities)[0]);
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

        const updatedResults = {...results};
        updatedResults.entities[type][index].feedback = feedback;

        // If thumbs down, set up for editing
        if (feedback === 'down') {
            setEditingEntity({type, index});
            setCorrection(updatedResults.entities[type][index].entity);
            setEntityType(updatedResults.entities[type][index].entityType);
        } else if (editingEntity?.type === type && editingEntity?.index === index) {
            setEditingEntity(null);
        }

        // Check if all entities have thumbs up
        const allUp = Object.keys(updatedResults.entities).every(entityType =>
            updatedResults.entities[entityType].every(entity => entity.feedback === 'up')
        );

        setAllApproved(allUp);
        setResults(updatedResults);
        setIsSaved(false);
    };

    // Handle entity type change
    const handleEntityTypeChange = (type: string) => {
        setEntityType(type);
        setIsSaved(false); // Reset saved state when type is changed
    };

    // Handle final save
    const handleSave = async () => {
        if (!results) return;

        setIsProcessing(true);
        setError(null);

        try {
            // Deep copy results to avoid mutating state directly
            const resultsToSave = JSON.parse(JSON.stringify(results));

            // Correct all start/end indices for all entities
            Object.keys(resultsToSave.entities).forEach(type => {
                resultsToSave.entities[type] = resultsToSave.entities[type].map((entity: Entity) => {
                    const correctedStarts: number[] = [];
                    const correctedEnds: number[] = [];
                    entity.sentence.forEach((sentence: string, i: number) => {
                        const { start, end } = getCorrectedIndices(sentence, entity.entity, entity.start[i], entity.end[i]);
                        correctedStarts.push(start);
                        correctedEnds.push(end);
                    });
                    return {
                        ...entity,
                        start: correctedStarts,
                        end: correctedEnds
                    };
                });
            });

            // Remove empty entity type arrays before saving
            Object.keys(resultsToSave.entities).forEach(key => {
                if (resultsToSave.entities[key].length === 0) {
                    delete resultsToSave.entities[key];
                }
            });

            console.log('Starting form submission...');
            const formData = new FormData();

            // Add credentials if available
            if (process.env.NEXT_PUBLIC_JWT_USER) {
                formData.append("email", process.env.NEXT_PUBLIC_JWT_USER);
            }
            if (process.env.NEXT_PUBLIC_JWT_PASSWORD) {
                formData.append("password", process.env.NEXT_PUBLIC_JWT_PASSWORD);
            }

            // Convert results to JSON string before appending
            const resultsJson = JSON.stringify(resultsToSave);
            formData.append("results", resultsJson);

            console.log("Saving data:", formData.get("results"));
            const response = await fetch("/api/save-ner-result", {
                method: 'POST',
                body: formData,
                // Add timeout
                signal: AbortSignal.timeout(2000000) // 20 minutes timeout
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

            const data = await response.json();
            console.log('Data saved:', data);

            // Show success message and update saved state
            setError("Results saved successfully!");
            setIsSaved(true);
            return data;

        } catch (err) {
            console.error("Error saving corrections:", err);
            setError("Failed to save results. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Update the handleTypeChange function
    const handleTypeChange = (oldType: string, index: number, newType: string) => {
        if (!results) return;

        const updatedResults = {...results};
        const entity = updatedResults.entities[oldType][index];
        const currentUser = session?.user?.email || 'unknown';

        // Remove from old type
        updatedResults.entities[oldType] = updatedResults.entities[oldType].filter((_, i) => i !== index);

        // Add to new type
        if (!updatedResults.entities[newType]) {
            updatedResults.entities[newType] = [];
        }

        // Update changed_by list
        const existingChangedBy = entity.changed_by || [];
        const updatedChangedBy = existingChangedBy.includes(currentUser)
            ? existingChangedBy
            : [...existingChangedBy, currentUser];

        // Create new entity with updated type
        const updatedEntity: Entity = {
            ...entity,
            entityType: newType,
            originalEntityType: entity.entityType,
            feedback: 'up' as const,
            changed_by: updatedChangedBy
        };

        updatedResults.entities[newType].push(updatedEntity);

        // Check if all entities now have thumbs up
        const allUp = Object.keys(updatedResults.entities).every(entityType =>
            updatedResults.entities[entityType].every(entity => entity.feedback === 'up')
        );

        setAllApproved(allUp);
        setResults(updatedResults);
        setIsSaved(false);
        setEditingEntity(null); // Clear editing state after type change

        // Remove empty entity type arrays
        Object.keys(updatedResults.entities).forEach(key => {
            if (updatedResults.entities[key].length === 0) {
                delete updatedResults.entities[key];
            }
        });
    };

    // If not logged in, show loading
    if (!session) {
        return <p>Loading...</p>;
    }

    return (
        <div className="flex flex-col max-w-6xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Structured Information Extraction (SIE)</h1>

            {/* API Key Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-6">
                <h2 className="text-lg font-semibold mb-4">OpenRouter API Key Configuration</h2>
                <form onSubmit={handleApiKeySubmit} className="space-y-4">
                    <div className="flex gap-4">
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API key"
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            disabled={isApiKeyValid}
                        />
                        <button
                            type="submit"
                            disabled={isApiKeyValid || !apiKey.trim()}
                            className={`px-6 py-2 text-white rounded-lg ${
                                isApiKeyValid || !apiKey.trim()
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-500 hover:bg-blue-600"
                            }`}
                        >
                            {isApiKeyValid ? "API Key Valid" : "Validate API Key"}
                        </button>
                        {isApiKeyValid && (
                            <button
                                type="button"
                                onClick={() => {
                                    sessionStorage.removeItem('ner_api_key');
                                    setApiKey('');
                                    setIsApiKeyValid(false);
                                }}
                                className="px-6 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg"
                            >
                                Clear API Key
                            </button>
                        )}
                    </div>
                    {isApiKeyValid && (
                        <div className="text-sm text-green-600 dark:text-green-400">
                            API key is valid and stored in session
                        </div>
                    )}
                </form>
            </div>

            {/* File Upload Section */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-6 ${
                !isApiKeyValid ? 'opacity-50 pointer-events-none' : ''
            }`}>
                <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Upload a PDF file to extract neuroscientific entities such as cell types, anatomical regions, and more.
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
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
                        <nav className="-mb-px flex space-x-8 min-w-max overflow-x-auto scrollbar-hide">
                            {Object.keys(results.entities)
                                .filter(type => results.entities[type] && results.entities[type].length > 0)
                                .map((type) => (
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
                    {activeEntityType && results.entities[activeEntityType] && results.entities[activeEntityType].length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300">
                                {activeEntityType} Entities
                            </h3>

                            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
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
                                                results={results}
                                                session={session}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Save button */}
                    {results && (
                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!allApproved || isProcessing || isSaved}
                                className={`px-4 py-2 rounded-lg ${
                                    allApproved && !isProcessing && !isSaved
                                        ? 'bg-green-500 hover:bg-green-600 text-white'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                {isProcessing ? 'Saving...' : isSaved ? 'Saved Result' : 'Save Results'}
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

// Helper to get all unique entity types from results
function getAllEntityTypes(results: Results): string[] {
    if (!results || !results.entities) return [];
    const types = Object.keys(results.entities);
    if (!types.includes('Unknown / Unable to classify')) {
        types.push('Unknown / Unable to classify');
    }
    return types;
}

const EntityCard = ({
    entity,
    onFeedbackChange,
    type,
    index,
    onTypeChange,
    isEditing,
    results,
    session
}: {
    entity: Entity;
    onFeedbackChange: (type: string, index: number, feedback: 'up' | 'down') => void;
    onTypeChange: (oldType: string, index: number, newType: string) => void;
    type: string;
    index: number;
    isEditing: boolean;
    results: Results;
    session: any;
}) => {
    const otherContributors = (entity.changed_by ?? []).filter(email => email !== (session?.user?.email || 'unknown'));
    const entityTypes = getAllEntityTypes(results);

    // Function to highlight the entity in a sentence
    const highlightEntityInSentence = (sentence: string, start: number, end: number) => {
        if (!sentence) return '';
        const before = sentence.substring(0, start);
        const entityText = sentence.substring(start, end);
        const after = sentence.substring(end);
        return `${before}<span class="bg-yellow-200 dark:bg-yellow-600 px-1 rounded font-medium">${entityText}</span>${after}`;
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        {entity.entity}
                        {entity.originalEntityType !== entity.entityType && (
                            <span className="text-xs text-red-700 ml-2">
                                (changed from: {entity.originalEntityType})
                            </span>
                        )}
                    </h3>
                    {isEditing ? (
                        <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700">Entity Type</label>
                            <select
                                value={entity.entityType}
                                onChange={(e) => onTypeChange(type, index, e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-gray-100"
                            >
                                {entityTypes.map((etype) => (
                                    <option key={etype} value={etype}>{etype}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Type: {entity.entityType}</p>
                    )}
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                        Confidence: {(entity.judge_score[0] * 100).toFixed(1)}%
                        <span
                            className="ml-1 cursor-pointer inline-block relative"
                            title="How well the extracted information aligns with the target ontology or schema."
                            style={{ display: 'inline-flex', alignItems: 'center' }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                fill="currentColor"
                                viewBox="0 0 16 16"
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <circle cx="8" cy="8" r="8" fill="#e5e7eb"/>
                                <text x="8" y="12" textAnchor="middle" fontSize="10" fill="#374151">?</text>
                            </svg>
                        </span>
                    </p>
                    {/*{entity.contributed_by && (*/}
                    {/*    <p className="text-xs text-gray-400">Contributed by: {entity.contributed_by}</p>*/}
                    {/*)}*/}
                    {/*{entity.changed_by && entity.changed_by.length > 0 && (*/}
                    {/*    <p className="text-xs text-gray-400">*/}
                    {/*        Updated by: {entity.changed_by.join(', ')}*/}
                    {/*    </p>*/}
                    {/*)}*/}
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => onFeedbackChange(type, index, 'up')}
                        className={`p-2 rounded-full ${entity.feedback === 'up' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}
                    >
                        <ThumbsUp className="h-5 w-5"/>
                    </button>
                    <button
                        onClick={() => onFeedbackChange(type, index, 'down')}
                        className={`p-2 rounded-full ${entity.feedback === 'down' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
                    >
                        <ThumbsDown className="h-5 w-5"/>
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <div className="text-sm text-gray-600">
                    <span className="font-medium">Sentences:</span>
                    <div className="mt-2 space-y-2">
                        {entity.sentence.map((sentence, i) => {
                            const { start, end } = getCorrectedIndices(sentence, entity.entity, entity.start[i], entity.end[i]);
                            return (
                                <div key={i} className="p-2 bg-gray-50 rounded">
                                    <div className="flex items-start">
                                        <span className="text-xs text-gray-500 mr-2 mt-1">{i + 1}.</span>
                                        <div
                                            className="flex-1"
                                            dangerouslySetInnerHTML={{
                                                __html: highlightEntityInSentence(
                                                    sentence,
                                                    start,
                                                    end
                                                )
                                            }}
                                        />
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        <span className="font-medium">Location:</span> {entity.paper_location[i]}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {entity.paper_title[0] && (
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">Paper:</span> {entity.paper_title[0]}
                    </div>
                )}
                {entity.doi[0] && (
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">DOI:</span> {entity.doi[0]}
                    </div>
                )}
                {entity.ontology_id && (
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">Ontology ID:</span> {entity.ontology_id}
                    </div>
                )}
                {entity.ontology_label && (
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">Ontology Label:</span> {entity.ontology_label}
                    </div>
                )}
            </div>
        </div>
    );
};
