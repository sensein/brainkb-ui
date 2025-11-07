"use client";

import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {useSession} from "next-auth/react";
import {ThumbsUp, ThumbsDown, FileText, Link as LinkIcon, Type} from "lucide-react";
import StatusIndicator, { StatusType } from "../../components/StatusIndicator";

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
        setError(null);
        setSuccessMessage(null);
        setCurrentStatus('processing');
        setIsProcessing(true);

        try {
            const formData = new FormData();
            formData.append("input_type", selectedInputType);
            formData.append("openrouter_api_key", apiKey.trim()); // Add API key to form data

            if (selectedInputType === 'doi') {
                formData.append("doi", doiInput.trim());
            } else if (selectedInputType === 'text') {
                formData.append("text_content", textInput.trim());
            } else if (selectedInputType === 'pdf') {
                formData.append("pdf_file", file!);
            }
            
            // Add endpoint and client ID
            const prefix = "ws-client-id-";
            const client_id = (crypto.randomUUID?.() || `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
            // Endpoint should be in format: ws://localhost:8009/api/ws/ner-extraction
            const endpoint = process.env.NEXT_PUBLIC_API_NER_ENDPOINT;
            formData.append("endpoint", endpoint || '');
            formData.append("clientId", client_id);

            // Handle WebSocket via SSE stream
            const response = await fetch("/api/ws-connection", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error: ${response.status}`);
            }

            // Read Server-Sent Events stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let result: any = null;
            let buffer = '';
            let hasError = false;
            let errorMessage = '';

            if (!reader) {
                throw new Error('Failed to get response stream');
            }

            setCurrentStatus('connecting');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            console.log('SSE event:', data.type);

                            if (data.type === 'connected') {
                                setCurrentStatus('connected');
                            } else if (data.type === 'task_created') {
                                console.log('Task created:', data.task_id);
                                setCurrentStatus('processing');
                            } else if (data.type === 'status') {
                                const status = data.status;
                                if (status === 'processing' || status === 'running' || status === 'pending') {
                                    setCurrentStatus('processing');
                                } else if (status === 'completed' || status === 'done' || status === 'finished' || status === 'success') {
                                    setCurrentStatus('processing');
                                    if (data.data) {
                                        result = data.data;
                                    }
                                }
                            } else if (data.type === 'progress') {
                                console.log('Progress:', data.progress || data.bytes);
                                setCurrentStatus('processing');
                            } else if (data.type === 'result') {
                                result = data.data;
                                console.log('Result received:', result);
                                setCurrentStatus('processing');
                            } else if (data.type === 'message') {
                                console.log('Generic message received:', data.data);
                                if (data.data) {
                                    const msgData = data.data;
                                    if (msgData.data || msgData.result || (msgData.status && (msgData.status === 'completed' || msgData.status === 'done'))) {
                                        result = msgData.data || msgData.result || msgData;
                                        console.log('Found result in generic message:', result);
                                    }
                                }
                            } else if (data.type === 'error') {
                                hasError = true;
                                errorMessage = data.error || 'Processing error';
                                setCurrentStatus('error');
                                console.error('SSE error:', errorMessage);
                            } else if (data.type === 'done') {
                                console.log('Done event received');
                                break;
                            } else {
                                console.log('Unknown SSE event type:', data.type, data);
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }

            // If there was an error, throw it instead of processing result
            if (hasError) {
                throw new Error(errorMessage);
            }

            // Process the result only if no error occurred
            if (result) {
                console.log('Full result:', result);

                // Helper function to try parsing JSON from various sources
                const tryParseJSON = (source: any, sourceName: string) => {
                    if (!source) return null;
                    
                    let dataToParse = source;
                    
                    if (typeof source === 'object' && source !== null) {
                        console.log(`${sourceName} is already an object:`, source);
                        return source;
                    }
                    
                    if (typeof source === 'string') {
                        const trimmed = source.trim();
                        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                            try {
                                const parsed = JSON.parse(trimmed);
                                console.log(`Successfully parsed ${sourceName}:`, parsed);
                                return parsed;
                            } catch (e) {
                                console.error(`Failed to parse ${sourceName} as JSON:`, e);
                                return null;
                            }
                        }
                    }
                    
                    return null;
                };
                
                let parsedData: any = null;
                const sources = [
                    { data: result.data, name: 'result.data' },
                    { data: result.message, name: 'result.message' },
                    { data: result.data?.message, name: 'result.data.message' },
                    { data: result.data?.data, name: 'result.data.data' },
                    { data: result.entities, name: 'result.entities' },
                    { data: result.data?.entities, name: 'result.data.entities' },
                    { data: result, name: 'result' }
                ];
                
                for (const source of sources) {
                    const parsed = tryParseJSON(source.data, source.name);
                    if (parsed) {
                        console.log(`Found data in ${source.name}:`, parsed);
                        
                        if (typeof parsed === 'object' && parsed.message && typeof parsed.message === 'string') {
                            try {
                                const messageParsed = JSON.parse(parsed.message);
                                if (messageParsed.entities || (typeof messageParsed === 'object' && !Array.isArray(messageParsed))) {
                                    parsedData = messageParsed;
                                }
                                break;
                            } catch (e) {
                                console.error(`Failed to parse message field as JSON:`, e);
                            }
                        }
                        
                        if (parsed.entities || (typeof parsed === 'object' && !Array.isArray(parsed))) {
                            parsedData = parsed;
                            break;
                        }
                    }
                }
                
                if (parsedData && parsedData.entities) {
                    // Transform the data to match our interface
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

            console.log('JSON being sent for saving:', JSON.stringify(resultsToSave, null, 2));

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
            console.log('Data saved:', data);

            // Show success message and update saved state
            setSuccessMessage("Results saved successfully!");
            setIsSaved(true);
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

            {/* Results Section */}
            {results && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Extracted Entities</h2>

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
