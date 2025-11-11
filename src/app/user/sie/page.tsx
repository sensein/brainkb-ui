"use client";

import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {useSession} from "next-auth/react";
import {FileText, Link as LinkIcon, Type} from "lucide-react";
import StatusIndicator, { StatusType } from "../../components/StatusIndicator";
import NERResultsDisplay from "../../components/NERResultsDisplay";
import { parseSSEResult } from "./utils/parseSSEResult";
import { useSseStream } from "../../utils/useSseStream";

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

type InputType = 'doi' | 'pdf' | 'text';

export default function NamedEntityRecognition() {
    const {data: session} = useSession();
    const router = useRouter();
    const [selectedInputType, setSelectedInputType] = useState<InputType>('pdf');
    const [file, setFile] = useState<File | null>(null);
    const [doiInput, setDoiInput] = useState<string>('');
    const [textInput, setTextInput] = useState<string>('');
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
    const [isValidatingKey, setIsValidatingKey] = useState<boolean>(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [currentStatus, setCurrentStatus] = useState<StatusType>('idle');
    const [originalData, setOriginalData] = useState<Results | null>(null); // Store original data before modifications
    const [nerData, setNerData] = useState<any>(null); // Store NER data in judge_ner_terms format

    // Check if API key exists in session storage
    useEffect(() => {
        const storedApiKey = sessionStorage.getItem('ner_api_key');
        if (storedApiKey) {
            setApiKey(storedApiKey);
            // Don't auto-validate, user needs to validate again
        }
    }, []);

    // Check if user is logged in
    useEffect(() => {
        if (!session || !session.user) {
            router.push("/");
        }
    }, [session, router]);

    // Validate OpenRouter API Key
    const validateApiKey = async () => {
        if (!apiKey.trim()) {
            setApiKeyError("Please enter an API key.");
            setIsApiKeyValid(false);
            return;
        }

        setIsValidatingKey(true);
        setApiKeyError(null);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey.trim()}`,
                    "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "",
                    "X-Title": "BrainKB",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "openai/gpt-4o-mini",
                    "messages": [
                        {
                            "role": "user",
                            "content": "test"
                        }
                    ],
                    "max_tokens": 1
                })
            });

            if (response.ok) {
                setIsApiKeyValid(true);
                setApiKeyError(null);
                setSuccessMessage("API key validated successfully!");
            // Store API key in session storage
            sessionStorage.setItem('ner_api_key', apiKey.trim());
            } else {
                const errorData = await response.json().catch(() => ({}));
                setIsApiKeyValid(false);
                
                // Handle specific error messages with user-friendly text
                const errorMessage = errorData.error?.message || "";
                if (errorMessage.toLowerCase().includes("cookie") || 
                    errorMessage.toLowerCase().includes("auth") ||
                    errorMessage.toLowerCase().includes("credentials") ||
                    response.status === 401 || 
                    response.status === 403) {
                    setApiKeyError("Invalid API key. Please check your OpenRouter API key and try again.");
                } else if (errorMessage) {
                    setApiKeyError(`Validation failed: ${errorMessage}`);
                } else {
                    setApiKeyError("Invalid API key. Please check your key and try again.");
                }
            }
        } catch (error) {
            setIsApiKeyValid(false);
            setApiKeyError("Failed to validate API key. Please check your connection and try again.");
        } finally {
            setIsValidatingKey(false);
        }
    };

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type === "application/pdf" || selectedFile.name.endsWith('.pdf') || selectedFile.name.endsWith('.txt')) {
                setFile(selectedFile);
                setError(null);
            } else {
                setFile(null);
                setError("Please upload a PDF or TXT file only.");
            }
        }
    };

    // Use SSE stream hook
    const { result: sseResult, error: sseError, status: sseStatus, isLoading: sseIsLoading, processStream } = useSseStream({
        createFormData: () => {
            const formData = new FormData();
            formData.append("input_type", selectedInputType);
            formData.append("openrouter_api_key", apiKey.trim());

            if (selectedInputType === 'doi') {
                formData.append("doi", doiInput.trim());
            } else if (selectedInputType === 'text') {
                formData.append("text_content", textInput.trim());
            } else if (selectedInputType === 'pdf') {
                formData.append("pdf_file", file!);
            }
            
            const prefix = "ws-client-id-";
            const client_id = (crypto.randomUUID?.() || `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
            const endpoint = process.env.NEXT_PUBLIC_API_NER_ENDPOINT;
            formData.append("endpoint", endpoint || '');
            formData.append("clientId", client_id);
            
            return formData;
        },
        onStatusChange: (status) => {
            setCurrentStatus(status === 'idle' ? 'idle' : status === 'done' ? 'done' : status === 'error' ? 'error' : status);
        },
        onError: (error) => {
            setError(error);
            setIsProcessing(false);
        },
    });

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        // Check if API key is valid
        if (!isApiKeyValid) {
            setError("Please provide a valid OpenRouter API key before processing.");
            return;
        }

        // Validate input based on selected type
        if (selectedInputType === 'doi' && !doiInput.trim()) {
            setError("Please enter a DOI.");
            return;
        }
        if (selectedInputType === 'text' && !textInput.trim()) {
            setError("Please enter text content.");
            return;
        }
        if (selectedInputType === 'pdf' && !file) {
            setError("Please select a file to upload.");
            return;
        }

        // Clear existing results and messages when starting new process
        setResults(null);
        setOriginalData(null);
        setNerData(null);
        setError(null);
        setSuccessMessage(null);
        setCurrentStatus('processing');
        setIsProcessing(true);

        try {
            // Process SSE stream using the hook
            await processStream();

            // Check for errors from the hook
            if (sseError) {
                setError(sseError);
                setCurrentStatus('error');
                setIsProcessing(false);
                return;
            }

            // Process the result only if no error occurred
            const result = sseResult;
            if (result) {
                // Parse the result using the utility function
                // This handles all the complex parsing logic for inconsistent API responses
                const parsedData = parseSSEResult(result);
                
                // Check if data has judge_ner_terms structure (new format)
                if (parsedData && parsedData.judge_ner_terms) {
//                     console.log('Setting NER data with judge_ner_terms:', Object.keys(parsedData.judge_ner_terms).length, 'keys');
                    // Store NER data in judge_ner_terms format
                    setNerData(parsedData);
                    setResults(null); // Clear old format results
                    setSuccessMessage("Content processed successfully! Review and edit the extracted entities below.");
                    setCurrentStatus('done');
                    
                    // Clear inputs on success
                    setFile(null);
                    setDoiInput('');
                    setTextInput('');
                } else if (parsedData && parsedData.entities) {
                    // Transform the data to match our interface (old format)
                    const documentName = selectedInputType === 'pdf' && file 
                        ? file.name 
                        : selectedInputType === 'doi' 
                            ? `DOI: ${doiInput.trim()}` 
                            : 'Text Input';
                    
            const transformedData: Results = {
                        entities: parsedData.entities,
                        documentName: documentName,
                processedAt: new Date().toISOString(),
            };

            // Initialize all entities with thumbs up feedback if not already set
            Object.keys(transformedData.entities).forEach(key => {
                        transformedData.entities[key] = transformedData.entities[key].map((entity: Entity) => ({
                    ...entity,
                    feedback: entity.feedback || 'up',
                }));
            });

                    // Store original data before modifications
                    setOriginalData(transformedData);
            setResults(transformedData);
                    setNerData(null); // Clear NER format data
            setAllApproved(true);

            // Set the first entity type as active
            if (transformedData.entities && Object.keys(transformedData.entities).length > 0) {
                setActiveEntityType(Object.keys(transformedData.entities)[0]);
            }
                    
                    setSuccessMessage("Content processed successfully! Review and edit the extracted entities below.");
                    setCurrentStatus('done');
                    
                    // Clear inputs on success
                    setFile(null);
                    setDoiInput('');
                    setTextInput('');
                } else if (result) {
                    console.warn('Result received but could not parse entities:', result);
                    setError("Content processed but no entities found. Please check the server response.");
                    setCurrentStatus('error');
                } else {
                    setError("No result received from server. The processing may have completed without returning data.");
                    setCurrentStatus('error');
                }
            } else {
                setError("No result received from server. The processing may have completed without returning data.");
                setCurrentStatus('error');
            }

        } catch (err) {
            console.error("Error processing document:", err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Failed to process document: ${errorMessage}`);
            setCurrentStatus('error');
        } finally {
            setIsProcessing(false);
        }
    };


    // Handle feedback (thumbs up/down)
    const handleFeedback = (type: string, index: number, feedback: 'up' | 'down') => {
        if (!results || !originalData) return;

        const updatedResults = {...results};
        updatedResults.entities[type][index].feedback = feedback;

        // Update originalData as well
        const updatedOriginal = {...originalData};
        if (updatedOriginal.entities[type] && updatedOriginal.entities[type][index]) {
            updatedOriginal.entities[type][index].feedback = feedback;
        }

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
        setOriginalData(updatedOriginal);
        setIsSaved(false);
    };

    // Handle entity type change
    const handleEntityTypeChange = (type: string) => {
        setEntityType(type);
        setIsSaved(false); // Reset saved state when type is changed
    };

    // Handle final save
    const handleSave = async () => {
        // Check if we have NER data (judge_ner_terms format)
        if (nerData) {
            setIsProcessing(true);
            setError(null);

            try {
                // Deep copy NER data
                const dataToSave = JSON.parse(JSON.stringify(nerData));
                
                // Add contributed_by to all entities
                const contributedBy = session?.user?.email || session?.user?.name || (session?.user as any)?.orcid_id || 'unknown';
                
                if (dataToSave.judge_ner_terms) {
                    Object.keys(dataToSave.judge_ner_terms).forEach((key) => {
                        if (Array.isArray(dataToSave.judge_ner_terms[key])) {
                            dataToSave.judge_ner_terms[key] = dataToSave.judge_ner_terms[key].map((entity: any) => ({
                                ...entity,
                                contributed_by: contributedBy
                            }));
                        }
                    });
                }


                const formData = new FormData();
                if (process.env.NEXT_PUBLIC_JWT_USER) {
                    formData.append("email", process.env.NEXT_PUBLIC_JWT_USER);
                }
                if (process.env.NEXT_PUBLIC_JWT_PASSWORD) {
                    formData.append("password", process.env.NEXT_PUBLIC_JWT_PASSWORD);
                }

                const resultsJson = JSON.stringify(dataToSave);
                formData.append("results", resultsJson);

                const response = await fetch("/api/save-ner-result", {
                    method: 'POST',
                    body: formData,
                    signal: AbortSignal.timeout(2000000)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Error: ${response.status}`);
                }

                const data = await response.json();
                setSuccessMessage("Results saved successfully!");
                setIsSaved(true);
                // Clear results after successful save
                setNerData(null);
                setResults(null);
                setOriginalData(null);
                return data;
            } catch (err) {
                console.error("Error saving NER data:", err);
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                setError(`Failed to save results: ${errorMessage}`);
            } finally {
                setIsProcessing(false);
            }
            return;
        }

        // Handle old format (originalData)
        if (!originalData) {
            setError("No data to save.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Deep copy original data to avoid mutating state directly
            const resultsToSave = JSON.parse(JSON.stringify(originalData));

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

            // Add contributed_by field to all entities
            const contributedBy = session?.user?.email || session?.user?.name || (session?.user as any)?.orcid_id || 'unknown';
            Object.keys(resultsToSave.entities).forEach(type => {
                resultsToSave.entities[type] = resultsToSave.entities[type].map((entity: Entity) => ({
                    ...entity,
                    contributed_by: contributedBy
                }));
            });

//             console.log('JSON being sent for saving:', JSON.stringify(resultsToSave, null, 2));

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
//             console.log('Data saved:', data);

            // Show success message and update saved state
            setSuccessMessage("Results saved successfully!");
            setIsSaved(true);
            // Clear results after successful save
            setNerData(null);
            setResults(null);
            setOriginalData(null);
            return data;

        } catch (err) {
            console.error("Error saving corrections:", err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Failed to save results: ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Update the handleTypeChange function
    const handleTypeChange = (oldType: string, index: number, newType: string) => {
        if (!results || !originalData) return;

        const updatedResults = {...results};
        const updatedOriginal = {...originalData};
        const entity = updatedResults.entities[oldType][index];
        const currentUser = session?.user?.email || 'unknown';

        // Remove from old type in both results and originalData
        updatedResults.entities[oldType] = updatedResults.entities[oldType].filter((_, i) => i !== index);
        if (updatedOriginal.entities[oldType]) {
            updatedOriginal.entities[oldType] = updatedOriginal.entities[oldType].filter((_, i) => i !== index);
        }

        // Add to new type
        if (!updatedResults.entities[newType]) {
            updatedResults.entities[newType] = [];
        }
        if (!updatedOriginal.entities[newType]) {
            updatedOriginal.entities[newType] = [];
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
        updatedOriginal.entities[newType].push(updatedEntity);

        // Check if all entities now have thumbs up
        const allUp = Object.keys(updatedResults.entities).every(entityType =>
            updatedResults.entities[entityType].every(entity => entity.feedback === 'up')
        );

        setAllApproved(allUp);
        setResults(updatedResults);
        setOriginalData(updatedOriginal);
        setIsSaved(false);
        setEditingEntity(null); // Clear editing state after type change

        // Remove empty entity type arrays
        Object.keys(updatedResults.entities).forEach(key => {
            if (updatedResults.entities[key].length === 0) {
                delete updatedResults.entities[key];
            }
        });
        Object.keys(updatedOriginal.entities).forEach(key => {
            if (updatedOriginal.entities[key].length === 0) {
                delete updatedOriginal.entities[key];
            }
        });
    };

    // If not logged in, show loading
    if (!session) {
        return <p>Loading...</p>;
    }

    return (
        <div className="flex flex-col max-w-6xl mx-auto p-4">
            <h1 className="text-3xl font-bold mb-4 dark:text-white">Structured Information Extraction (SIE)</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                Extract neuroscientific entities such as cell types, anatomical regions, and more from PDF documents.
            </p>

            {/* Processing Status Header */}
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center">
                        {currentStatus === 'idle' && (
                            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-gray-400">
                                <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
                                <circle cx="10" cy="10" r="2" fill="currentColor" />
                            </svg>
                        )}
                        {currentStatus === 'connecting' && (
                            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-orange-500 animate-pulse">
                                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="4 4" />
                                <circle cx="10" cy="10" r="3" fill="currentColor" />
                            </svg>
                        )}
                        {currentStatus === 'connected' && (
                            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-green-500">
                                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                <path d="M6 10l2 2 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                        {currentStatus === 'processing' && (
                            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-purple-500 animate-pulse">
                                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                        {currentStatus === 'done' && (
                            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-green-500">
                                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                <path d="M6 10l2 2 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                        {currentStatus === 'error' && (
                            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-red-500 animate-pulse">
                                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                <path d="M10 7v4M10 13h.01" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                            Status: {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                        </h3>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                            {currentStatus === 'idle' && 'Ready to extract entities'}
                            {currentStatus === 'connecting' && 'Establishing connection...'}
                            {currentStatus === 'connected' && 'Connected and ready'}
                            {currentStatus === 'processing' && 'Extracting entities from document...'}
                            {currentStatus === 'done' && 'Entity extraction completed successfully'}
                            {currentStatus === 'error' && 'An error occurred during extraction'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Status Indicators */}
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <StatusIndicator status="idle" label="Idle" isActive={currentStatus === 'idle'} />
                <StatusIndicator status="connecting" label="Connecting" isActive={currentStatus === 'connecting'} />
                <StatusIndicator status="connected" label="Connected" isActive={currentStatus === 'connected'} />
                <StatusIndicator status="processing" label="Processing" isActive={currentStatus === 'processing'} />
                <StatusIndicator status="done" label="Done" isActive={currentStatus === 'done'} />
                <StatusIndicator status="error" label="Error" isActive={currentStatus === 'error'} />
            </div>

            {/* OpenRouter API Key Configuration */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">OpenRouter API Key Configuration</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="password"
                            value={apiKey}
                        onChange={(e) => {
                            setApiKey(e.target.value);
                            setIsApiKeyValid(false);
                            setApiKeyError(null);
                            setSuccessMessage(null);
                        }}
                            placeholder="Enter your API key"
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <button
                        type="button"
                        onClick={validateApiKey}
                        disabled={isValidatingKey || !apiKey.trim()}
                        className={`px-6 py-2 rounded-lg font-medium text-white transition-colors ${
                            isValidatingKey || !apiKey.trim()
                                    ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gray-600 hover:bg-gray-700"
                            }`}
                        >
                        {isValidatingKey ? "Validating..." : "Validate API Key"}
                        </button>
                        {isApiKeyValid && (
                            <button
                                type="button"
                                onClick={() => {
                                    sessionStorage.removeItem('ner_api_key');
                                    setApiKey('');
                                    setIsApiKeyValid(false);
                                setApiKeyError(null);
                                setSuccessMessage(null);
                                }}
                            className="px-6 py-2 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                            >
                                Clear API Key
                            </button>
                        )}
                    </div>
                {apiKeyError && (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">{apiKeyError}</p>
                )}
                    {isApiKeyValid && (
                    <p className="mt-3 text-sm text-green-600 dark:text-green-400">✓ API key validated successfully. You can now process documents.</p>
                    )}
            </div>

            {!isApiKeyValid && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ Please validate your OpenRouter API key above to enable document processing.
                    </p>
                </div>
            )}

            {/* Input Type Selection and Content Section */}
            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">
                        Select Type
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            type="button"
                            onClick={() => setSelectedInputType('doi')}
                            className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center space-y-2 group ${
                                selectedInputType === 'doi'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                            }`}
                        >
                            <LinkIcon className={`w-6 h-6 transition-colors ${
                                selectedInputType === 'doi'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                            }`} />
                            <span className={`font-medium ${
                                selectedInputType === 'doi'
                                    ? 'text-blue-700 dark:text-blue-300'
                                    : 'text-gray-700 dark:text-gray-300'
                            }`}>DOI</span>
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => setSelectedInputType('pdf')}
                            className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center space-y-2 group ${
                                selectedInputType === 'pdf'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                            }`}
                        >
                            <FileText className={`w-6 h-6 transition-colors ${
                                selectedInputType === 'pdf'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                            }`} />
                            <span className={`font-medium ${
                                selectedInputType === 'pdf'
                                    ? 'text-blue-700 dark:text-blue-300'
                                    : 'text-gray-700 dark:text-gray-300'
                            }`}>PDF</span>
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => setSelectedInputType('text')}
                            className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center space-y-2 group ${
                                selectedInputType === 'text'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                            }`}
                        >
                            <Type className={`w-6 h-6 transition-colors ${
                                selectedInputType === 'text'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                            }`} />
                            <span className={`font-medium ${
                                selectedInputType === 'text'
                                    ? 'text-blue-700 dark:text-blue-300'
                                    : 'text-gray-700 dark:text-gray-300'
                            }`}>Text</span>
                        </button>
                    </div>
                </div>

                {/* Input Content Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        {selectedInputType === 'doi' && 'Enter DOI'}
                        {selectedInputType === 'pdf' && 'Upload PDF'}
                        {selectedInputType === 'text' && 'Type a Text'}
                    </label>
                    
                    {selectedInputType === 'doi' && (
                        <input
                            type="text"
                            value={doiInput}
                            onChange={(e) => setDoiInput(e.target.value)}
                            placeholder="Enter DOI (e.g., 10.1000/182)"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            disabled={isProcessing}
                        />
                    )}
                    
                    {selectedInputType === 'pdf' && (
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center transition-colors duration-200 hover:border-blue-400 dark:hover:border-blue-600">
                        <input
                            type="file"
                            id="document"
                            onChange={handleFileChange}
                            className="hidden"
                                accept=".pdf"
                                disabled={!isApiKeyValid || isProcessing}
                        />
                        <label
                            htmlFor="document"
                                className={`cursor-pointer flex flex-col items-center justify-center ${!isApiKeyValid || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <FileText className="h-12 w-12 text-gray-400 mb-3" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                Click to select a file or drag and drop
              </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    PDF (.pdf) files only
              </span>
                        </label>
                        {file && (
                            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                                    Selected file: <span className="font-semibold">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
                            </div>
                        )}
                    </div>
                    )}
                    
                    {selectedInputType === 'text' && (
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Paste text here..."
                            rows={8}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-vertical"
                            disabled={isProcessing}
                        />
                    )}
                </div>

                {/* Messages and Submit Button */}
                <div className="space-y-4">
                    {error && (
                        <div className="text-red-500 text-sm p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">{error}</div>
                    )}
                    {successMessage && (
                        <div className="text-green-500 text-sm p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">{successMessage}</div>
                    )}

                    <button
                        type="submit"
                        disabled={!isApiKeyValid || isProcessing || 
                            (selectedInputType === 'doi' && !doiInput.trim()) ||
                            (selectedInputType === 'text' && !textInput.trim()) ||
                            (selectedInputType === 'pdf' && !file)
                        }
                        className={`w-full px-6 py-3 text-white rounded-lg font-semibold transition-all duration-200 ${
                            !isApiKeyValid || isProcessing || 
                            (selectedInputType === 'doi' && !doiInput.trim()) ||
                            (selectedInputType === 'text' && !textInput.trim()) ||
                            (selectedInputType === 'pdf' && !file)
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
                        }`}
                    >
                        {isProcessing ? "Processing..." : "Process Document"}
                    </button>
            </div>
            </form>

            {/* NER Results Section - handles both formats */}
            {(nerData || results) && (
                <NERResultsDisplay
                    results={results || undefined}
                    activeEntityType={activeEntityType || undefined}
                    onActiveEntityTypeChange={setActiveEntityType}
                    onFeedbackChange={handleFeedback}
                    onTypeChange={handleTypeChange}
                    allApproved={allApproved}
                    nerData={nerData || undefined}
                    onNerDataChange={(updatedData) => setNerData(updatedData)}
                    onSave={handleSave}
                    isProcessing={isProcessing}
                    isSaved={isSaved}
                    session={session}
                    showExportOptions={true}
                />
            )}
        </div>
    );
}

