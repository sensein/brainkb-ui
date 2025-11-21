"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { StatusType } from "../../components/StatusIndicator";
import ExtractedResourceResultTableMapping from "../../components/ExtractedResourceResultTableMapping";
import { useSseStream } from "../../../utils/hooks/use-sse-stream";
import { clientEnv } from "../../../config/env";
import InputTypeSelector, { InputType } from "../../components/user/InputTypeSelector";
import { useApiKeyValidator } from "../../components/user/useApiKeyValidator";
import { ApiKeyValidatorUI } from "../../components/user/ApiKeyValidator";
import FileUploadArea from "../../components/user/FileUploadArea";
import ProcessingStatusHeader from "../../components/user/ProcessingStatusHeader";

export default function IngestStructuredResourcePage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [selectedInputType, setSelectedInputType] = useState<InputType>('text');
    const [files, setFiles] = useState<File[]>([]);
    const [doiInput, setDoiInput] = useState<string>('');
    const [textInput, setTextInput] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [extractionResult, setExtractionResult] = useState<any>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [lastResult, setLastResult] = useState<any>(null);
    const [originalData, setOriginalData] = useState<any>(null); // Store original JSON before flattening
    const [currentStatus, setCurrentStatus] = useState<StatusType>('idle');
    
    // Use shared API key validator hook
    const {
        apiKey,
        isApiKeyValid,
        isValidatingKey,
        apiKeyError,
        successMessage: apiKeySuccessMessage,
        setApiKey,
        validateApiKey,
        handleClear: clearApiKey
    } = useApiKeyValidator();

    // Redirect if not logged in
    useEffect(() => {
        if (session === null) {
            router.push("/");
        }
    }, [session, router]);

    // API key validation is handled by useApiKeyValidator hook


    // File handling is now done by FileUploadArea component

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
                for (let i = 0; i < files.length; i++) {
                    formData.append("pdf_file", files[i]);
                }
            }
            
            const prefix = "ws-client-id-";
            const client_id = (crypto.randomUUID?.() || `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
            const endpoint = clientEnv.extractStructuredResourceEndpoint;
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
            setError("Please select PDF files to upload.");
            return;
        }

        // Clear existing results and messages when starting new process
        setExtractionResult(null);
        setLastResult(null);
        setOriginalData(null);
        setError(null);
        setSuccessMessage(null);
        setCurrentStatus('processing');
        setIsProcessing(true);

        try {
            // Process SSE stream using the hook - returns result directly to avoid stale state
            const result = await processStream();
            
            // Result is guaranteed to be non-empty (hook throws error if empty)
            if (result) {
                setLastResult(result);

                // Helper function to try parsing JSON from various sources
                const tryParseJSON = (source: any, sourceName: string) => {
                    if (!source) return null;
                    
                    let dataToParse = source;
                    
                    if (typeof source === 'object' && source !== null) {
                        return source;
                    }
                    
                    if (typeof source === 'string') {
                        const trimmed = source.trim();
                        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                            try {
                                const parsed = JSON.parse(trimmed);
                                return parsed;
                            } catch (e) {
                                console.error(`Failed to parse ${sourceName} as JSON:`, e);
                                return null;
                            }
                        }
                    }
                    
                    return null;
                };
                
                let parsedData: any[] | null = null;
                const sources = [
                    { data: result.data, name: 'result.data' },
                    { data: result.message, name: 'result.message' },
                    { data: result.data?.message, name: 'result.data.message' },
                    { data: result.data?.data, name: 'result.data.data' },
                    { data: result.extracted_data, name: 'result.extracted_data' },
                    { data: result.data?.extracted_data, name: 'result.data.extracted_data' },
                    { data: result, name: 'result' }
                ];
                
                for (const source of sources) {
                    const parsed = tryParseJSON(source.data, source.name);
                    if (parsed) {
                        if (typeof parsed === 'object' && parsed.message && typeof parsed.message === 'string') {
                            try {
                                const messageParsed = JSON.parse(parsed.message);
                                if (Array.isArray(messageParsed)) {
                                    parsedData = messageParsed;
                                } else if (typeof messageParsed === 'object') {
                                    parsedData = [messageParsed];
                                }
                                break;
                            } catch (e) {
                                console.error(`Failed to parse message field as JSON:`, e);
                            }
                        }
                        
                        if (Array.isArray(parsed)) {
                            parsedData = parsed;
                            break;
                        } else if (typeof parsed === 'object') {
                            parsedData = [parsed];
                            break;
                        }
                    }
                }
                
                if (parsedData && parsedData.length > 0) {
                    // Store original data before flattening
                    setOriginalData(parsedData);
                    
                    const flattenedData = parsedData.map((item: any) => {
                        if (item.message && typeof item.message === 'string') {
                            try {
                                const parsedMessage = JSON.parse(item.message);
                                return flattenObject(parsedMessage);
                            } catch (e) {
                                return flattenObject(item);
                            }
                        }
                        return flattenObject(item);
                    });
                    setExtractionResult(flattenedData);
                    setSuccessMessage("Content processed successfully! Review and edit the extracted data below.");
                    setCurrentStatus('done');
                    // Clear inputs on success
                    setFiles([]);
                    setDoiInput('');
                    setTextInput('');
                } else if (result) {
                    // Result exists but couldn't parse - try to display raw result or show helpful error
                    if (typeof result === 'object') {
                        // Try to flatten the entire result object
                        try {
                            // Store original data before flattening
                            setOriginalData([result]);
                            
                            const flattened = flattenObject(result);
                            if (Object.keys(flattened).length > 0) {
                                setExtractionResult([flattened]);
                                setSuccessMessage("Content processed successfully! Review and edit the extracted data below.");
                                setCurrentStatus('done');
                                setFiles([]);
                                setDoiInput('');
                                setTextInput('');
                            } else {
                                setError("Content processed but no extractable data found. Please check the server response.");
                                setCurrentStatus('error');
                            }
                        } catch (e) {
                            setError("Content processed but data format is not recognized. Please check the server response.");
                            setCurrentStatus('error');
                        }
                    } else {
                        setError("Content processed but no extractable data found. Please check the server response.");
                        setCurrentStatus('error');
                    }
                } else {
                    // No result received
                    setError("No result received from server. The processing may have completed without returning data.");
                    setCurrentStatus('error');
                }
            }

        } catch (err) {
            console.error("Error processing content:", err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Failed to process content: ${errorMessage}`);
            setCurrentStatus('error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveData = async () => {
        if (!originalData) {
            setError("No data to save.");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const saveEndpoint = clientEnv.saveStructuredResourceEndpoint;
            if (!saveEndpoint) {
                throw new Error("Save endpoint not configured.");
            }

            // Use original JSON data and add contributed_by field
            const contributedBy = session?.user?.email || session?.user?.name || (session?.user as any)?.orcid_id || 'unknown';
            
            const dataToSave = Array.isArray(originalData) 
                ? originalData.map((item: any) => ({
                    ...item,
                    contributed_by: contributedBy
                }))
                : [{
                    ...originalData,
                    contributed_by: contributedBy
                }];

            console.log('JSON being sent for saving:', JSON.stringify(dataToSave, null, 2));
             console.log('JSON being sent for saving:', JSON.stringify(saveEndpoint));

            const response = await fetch("/api/save-structured-resource", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: dataToSave,
                    endpoint: saveEndpoint
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Error: ${response.status}`);
            }

            setSuccessMessage("Data saved successfully!");
            setExtractionResult(null);
            setOriginalData(null);

        } catch (err) {
            console.error("Error saving data:", err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Failed to save data: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
        const flattened: Record<string, any> = {};
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                
                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    // Recursively flatten nested objects
                    Object.assign(flattened, flattenObject(obj[key], newKey));
                } else {
                    // Handle arrays and primitive values
                    if (Array.isArray(obj[key])) {
                        flattened[newKey] = JSON.stringify(obj[key]);
                    } else {
                        flattened[newKey] = obj[key];
                    }
                }
            }
        }
        
        return flattened;
    };

    const unflattenObject = (flattened: Record<string, any>): any => {
        const result: any = {};
        
        for (const key in flattened) {
            const keys = key.split('.');
            let current = result;
            
            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                if (!(k in current)) {
                    current[k] = {};
                }
                current = current[k];
            }
            
            const lastKey = keys[keys.length - 1];
            let value = flattened[key];
            
            // Try to parse JSON strings back to arrays/objects
            if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    // Keep as string if parsing fails
                }
            }
            
            current[lastKey] = value;
        }
        
        return result;
    };

    // handleTableDataChange is now handled by ExtractedResultTableMapping component

    if (session === undefined) {
        return <p>Loading...</p>;
    }

    return (
        <div className="flex flex-col max-w-6xl mx-auto p-4">
            <h1 className="text-3xl font-bold mb-4 dark:text-white">Structured Resource Extraction</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                Structured Extraction and Knowledge Representation of Resources from DOIs, PDFs, and Text.
            </p>
            <div className="mb-6 space-y-3">
                <div className="flex items-center gap-2 text-lg text-amber-600 dark:text-amber-400">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Extraction process might take up to 3-7 minutes or more for larger text.</span>
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
                    idle: 'Ready to process resources',
                    connecting: 'Establishing connection...',
                    connected: 'Connected and ready',
                    processing: 'Processing your request...',
                    done: 'Processing completed successfully',
                    error: 'An error occurred during processing'
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
                warningMessage="Please validate your OpenRouter API key above to enable resource processing."
            />

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">


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
                            multiple={true}
                            disabled={isProcessing}
                            allowedFileTypes={['pdf']}
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
                    {error && <div className="text-red-500 text-sm p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">{error}</div>}
                    {successMessage && <div className="text-green-500 text-sm p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">{successMessage}</div>}

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
                        {isProcessing ? "Processing..." : "Process Structured Resource"}
                    </button>
                </div>

            </form>

            {/* Extracted Data Table */}
            {extractionResult && (
                <>
                    {/* Debug: Log the data being passed */}
                    {(() => { console.log('ExtractionResult being passed to component:', extractionResult); return null; })()}
                    <ExtractedResourceResultTableMapping
                        data={extractionResult}
                        onDataChange={(updatedData) => setExtractionResult(updatedData)}
                        onSave={handleSaveData}
                        isSaving={isSaving}
                        showExportOptions={true}
                    />
                </>
            )}

            {/* Debug: Show raw result if table is not showing */}
            {/*{!extractionResult && lastResult && (*/}
            {/*    <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-8 shadow-md">*/}
            {/*        <h2 className="text-xl font-bold mb-4 text-yellow-800 dark:text-yellow-200">Debug: Raw Result</h2>*/}
            {/*        <p className="text-sm text-yellow-600 dark:text-yellow-300 mb-4">*/}
            {/*            The table is not showing. Here's the raw result for debugging:*/}
            {/*        </p>*/}
            {/*        <pre className="bg-white dark:bg-gray-800 p-4 rounded border text-sm overflow-x-auto">*/}
            {/*            {JSON.stringify(lastResult, null, 2)}*/}
            {/*        </pre>*/}
            {/*    </div>*/}
            {/*)}*/}
        </div>
    );
}
