"use client";

import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {useSession} from "next-auth/react";
import { StatusType } from "../../components/ui/StatusIndicator";
import NERResultsDisplay from "../../components/data-display/NERResultsDisplay";
import { parseSSEResult } from "./utils/parseSSEResult";
import { useSseStream } from "../../../utils/hooks/use-sse-stream";
import { clientEnv } from "../../../config/env";
import InputTypeSelector, { InputType } from "../../components/user/InputTypeSelector";
import { useApiKeyValidator } from "../../components/user/useApiKeyValidator";
import { ApiKeyValidatorUI } from "../../components/user/ApiKeyValidator";
import FileUploadArea from "../../components/user/FileUploadArea";
import ProcessingStatusHeader from "../../components/user/ProcessingStatusHeader";

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
    const [selectedInputType, setSelectedInputType] = useState<InputType>('pdf');
    const [files, setFiles] = useState<File[]>([]);
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
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [currentStatus, setCurrentStatus] = useState<StatusType>('idle');
    const [originalData, setOriginalData] = useState<Results | null>(null); // Store original data before modifications
    const [nerData, setNerData] = useState<any>(null); // Store NER data in judge_ner_terms format

    // Use shared API key validator hook with sessionStorage support
    const {
        apiKey,
        isApiKeyValid,
        isValidatingKey,
        apiKeyError,
        successMessage: apiKeySuccessMessage,
        setApiKey,
        validateApiKey,
        handleClear: clearApiKey
    } = useApiKeyValidator('ner_api_key'); // Use sessionStorage key for NER

    // Check if user is logged in
    useEffect(() => {
        if (!session || !session.user) {
            router.push("/");
        }
    }, [session, router]);

    // API key validation is handled by useApiKeyValidator hook
    // File handling is now done by FileUploadArea component
    
    // Get single file from files array (for backward compatibility with existing code)
    const file = files.length > 0 ? files[0] : null;

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
                if (files.length > 0) {
                    formData.append("pdf_file", files[0]);
                }
            }
            
            const prefix = "ws-client-id-";
            const client_id = (crypto.randomUUID?.() || `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
            const endpoint = clientEnv.nerEndpoint;
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
        if (selectedInputType === 'pdf' && files.length === 0) {
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
            // Process SSE stream using the hook - returns result directly to avoid stale state
            const result = await processStream();
            
            // Result is guaranteed to be non-empty (hook throws error if empty)
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
                    const documentName = selectedInputType === 'pdf' && files.length > 0 
                        ? files[0].name 
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
                if (clientEnv.jwtUser) {
                    formData.append("email", clientEnv.jwtUser);
                }
                if (clientEnv.jwtPassword) {
                    formData.append("password", clientEnv.jwtPassword);
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
            if (clientEnv.jwtUser) {
                formData.append("email", clientEnv.jwtUser);
            }
            if (clientEnv.jwtPassword) {
                formData.append("password", clientEnv.jwtPassword);
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
            <h1 className="text-3xl font-bold mb-4 dark:text-white">Neuroscientific Named Entity Extraction</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-lg">
                Extract neuroscientific entities such as cell types, anatomical regions, and more from PDF documents.
            </p>
            <div className="mb-6 space-y-3">
                <div className="flex items-center gap-2 text-lg text-amber-600 dark:text-amber-400">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Extraction process might take up to 10-15 minutes or more for larger text.</span>
                </div>
                <div>
                    <a
                        href="https://arxiv.org/abs/2507.03674"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                        Learn more about use case
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>
            </div>

            {/* Processing Status Header */}
            <ProcessingStatusHeader 
                currentStatus={currentStatus}
                statusMessages={{
                    idle: 'Ready to extract entities',
                    connecting: 'Establishing connection...',
                    connected: 'Connected and ready',
                    processing: 'Extracting entities from document...',
                    done: 'Entity extraction completed successfully',
                    error: 'An error occurred during extraction'
                }}
            />

            {/* OpenRouter API Key Configuration */}
            <ApiKeyValidatorUI
                apiKey={apiKey}
                onApiKeyChange={setApiKey}
                isApiKeyValid={isApiKeyValid}
                isValidatingKey={isValidatingKey}
                apiKeyError={apiKeyError}
                successMessage={apiKeySuccessMessage}
                onValidate={validateApiKey}
                onClear={clearApiKey}
                warningMessage="Please validate your OpenRouter API key above to enable document processing."
            />

            {/* Input Type Selection and Content Section */}
            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg mb-6">
                <InputTypeSelector
                    selectedInputType={selectedInputType}
                    onInputTypeChange={setSelectedInputType}
                    disabled={isProcessing}
                />

                {/* Input Content Section */}
                <div>
                    {selectedInputType === 'doi' && (
                        <>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                Enter DOI
                            </label>
                            <input
                                type="text"
                                value={doiInput}
                                onChange={(e) => setDoiInput(e.target.value)}
                                placeholder="Enter DOI (e.g., 10.1000/182)"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                disabled={isProcessing}
                            />
                        </>
                    )}
                    
                    {selectedInputType === 'pdf' && (
                        <FileUploadArea
                            files={files}
                            onFilesChange={setFiles}
                            accept=".pdf"
                            multiple={false}
                            disabled={isProcessing || !isApiKeyValid}
                            allowedFileTypes={['pdf', 'txt']}
                        />
                    )}
                    
                    {selectedInputType === 'text' && (
                        <>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                Type a Text
                            </label>
                            <textarea
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="Paste text here..."
                                rows={8}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-vertical"
                                disabled={isProcessing}
                            />
                        </>
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
                            (selectedInputType === 'pdf' && files.length === 0)
                        }
                        className={`w-full px-6 py-3 text-white rounded-lg font-semibold transition-all duration-200 ${
                            !isApiKeyValid || isProcessing || 
                            (selectedInputType === 'doi' && !doiInput.trim()) ||
                            (selectedInputType === 'text' && !textInput.trim()) ||
                            (selectedInputType === 'pdf' && files.length === 0)
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

