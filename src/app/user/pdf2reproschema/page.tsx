"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { StatusType } from "../../components/ui/StatusIndicator";
import { useSseStream } from "../../../utils/hooks/use-sse-stream";
import { clientEnv } from "../../../config/env";
import InputTypeSelector, { InputType } from "../../components/user/InputTypeSelector";
import { useApiKeyValidator } from "../../components/user/useApiKeyValidator";
import { ApiKeyValidatorUI } from "../../components/user/ApiKeyValidator";
import FileUploadArea from "../../components/user/FileUploadArea";
import ProcessingStatusHeader from "../../components/user/ProcessingStatusHeader";

export default function Pdf2ReproschemaPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [selectedInputType, setSelectedInputType] = useState<InputType>('pdf');
    const [files, setFiles] = useState<File[]>([]);
    const [doiInput, setDoiInput] = useState<string>('');
    const [textInput, setTextInput] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [conversionResult, setConversionResult] = useState<any>(null);
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
            const endpoint = clientEnv.pdf2ReproschemaEndpoint;
            if (endpoint) {
                formData.append("endpoint", endpoint);
            }
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

        setIsProcessing(true);
        setError(null);
        setSuccessMessage(null);
        setCurrentStatus('processing');

        try {
            // Process SSE stream using the hook - returns result directly to avoid stale state
            const result = await processStream();

            // Result is guaranteed to be non-empty (hook throws error if empty)
            if (result) {
                setConversionResult(result);
                setSuccessMessage("Document converted to Reproschema format successfully!");
                setFiles([]);
                setDoiInput('');
                setTextInput('');
                setCurrentStatus('done');
            } else {
                setError("No result received from server. The processing may have completed without returning data.");
                setCurrentStatus('error');
            }

        } catch (err) {
            console.error("Error converting document:", err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Failed to convert document: ${errorMessage}`);
            setCurrentStatus('error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!conversionResult) return;

        const dataStr = JSON.stringify(conversionResult, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'reproschema.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (session === undefined) {
        return <p>Loading...</p>;
    }

    return (
        <div className="flex flex-col max-w-6xl mx-auto p-4">
            <h1 className="text-3xl font-bold mb-4 dark:text-white">ReproSchema Extraction</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                Convert PDF documents, DOIs, or text to Reproschema format using multi-agent extraction.
            </p>
            <div className="mb-6 space-y-3">
                <div className="flex items-center gap-2 text-lg text-amber-600 dark:text-amber-400">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Extraction process might take up to 5-7 minutes or more for larger text.</span>
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
                    idle: 'Ready to convert documents',
                    connecting: 'Establishing connection...',
                    connected: 'Connected and ready',
                    processing: 'Converting to Reproschema format...',
                    done: 'Conversion completed successfully',
                    error: 'An error occurred during conversion'
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
                warningMessage="Please validate your OpenRouter API key above to enable document conversion."
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
                        {isProcessing ? "Converting..." : "Convert to Reproschema"}
                    </button>
                </div>

            </form>

            {/* Conversion Result Section */}
            {conversionResult && (
                <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Reproschema Output</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Review the converted Reproschema format below.
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto">
                        <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            {JSON.stringify(conversionResult, null, 2)}
                        </pre>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleDownload}
                            className="px-6 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors duration-200"
                        >
                            Download JSON
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
