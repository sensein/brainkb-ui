"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FileText, Link as LinkIcon, Type } from "lucide-react";

type InputType = 'doi' | 'pdf' | 'text';

export default function Pdf2ReproschemaPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [selectedInputType, setSelectedInputType] = useState<InputType>('pdf');
    const [files, setFiles] = useState<File[]>([]);
    const [doiInput, setDoiInput] = useState<string>('');
    const [textInput, setTextInput] = useState<string>('');
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState<boolean>(false);
    const [conversionResult, setConversionResult] = useState<any>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [apiKey, setApiKey] = useState<string>('');
    const [isApiKeyValid, setIsApiKeyValid] = useState<boolean>(false);
    const [isValidatingKey, setIsValidatingKey] = useState<boolean>(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);

    // Redirect if not logged in
    useEffect(() => {
        if (session === null) {
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

    const validateAndSetFile = (selectedFile: File) => {
        const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
        if (fileType === 'pdf') {
            setFiles(prevFiles => [...prevFiles, selectedFile]);
            setError(null);
            setSuccessMessage(null);
        } else {
            setError("Please upload only PDF (.pdf) files.");
            setSuccessMessage(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            setFiles([]);
            setError(null);
            setSuccessMessage(null);

            for (let i = 0; i < selectedFiles.length; i++) {
                validateAndSetFile(selectedFiles[i]);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            setFiles([]);
            setError(null);
            setSuccessMessage(null);

            for (let i = 0; i < droppedFiles.length; i++) {
                validateAndSetFile(droppedFiles[i]);
            }
        }
    };

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

        setIsUploading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const formData = new FormData();
            formData.append("input_type", selectedInputType);
            formData.append("openrouter_api_key", apiKey.trim());

            if (selectedInputType === 'doi') {
                formData.append("doi", doiInput.trim());
            } else if (selectedInputType === 'text') {
                formData.append("text_content", textInput.trim());
            } else if (selectedInputType === 'pdf') {
                // PDF files go to pdf_file parameter
                for (let i = 0; i < files.length; i++) {
                    formData.append("pdf_file", files[i]);
                }
            }
            
            // Add endpoint if available
            const endpoint = process.env.NEXT_PUBLIC_API_PDF2REPROSCHEMA_ENDPOINT;
            if (endpoint) {
                formData.append("endpoint", endpoint);
            }

            const response = await fetch("/api/pdf2reproschema", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Error: ${response.status}`);
            }

            setConversionResult(result);
            setSuccessMessage("Document converted to Reproschema format successfully!");
            setFiles([]);
            setDoiInput('');
            setTextInput('');

        } catch (err) {
            console.error("Error converting document:", err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Failed to convert document: ${errorMessage}`);
        } finally {
            setIsUploading(false);
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
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                Convert PDF documents, DOIs, or text to Reproschema format using multi-agent extraction.
            </p>

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
                        ⚠️ Please validate your OpenRouter API key above to enable document conversion.
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">

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
                            disabled={isUploading}
                        />
                    )}
                    
                    {selectedInputType === 'pdf' && (
                        <div
                            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
                                isDragOver 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                    : 'border-gray-300 dark:border-gray-700'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                id="pdf-files"
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".pdf"
                                multiple
                                disabled={isUploading}
                            />
                            <label
                                htmlFor="pdf-files"
                                className="cursor-pointer flex flex-col items-center justify-center"
                            >
                                <svg className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {files.length > 0 ? files.map(file => file.name).join(', ') : "Click to select files or drag and drop"}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    PDF (.pdf) files only
                                </span>
                            </label>
                        </div>
                    )}
                    
                    {selectedInputType === 'text' && (
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Paste text here..."
                            rows={8}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-vertical"
                            disabled={isUploading}
                        />
                    )}
                    
                </div>

                {/* Messages and Submit Button */}
                <div className="space-y-4">
                    {error && <div className="text-red-500 text-sm p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">{error}</div>}
                    {successMessage && <div className="text-green-500 text-sm p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">{successMessage}</div>}

                    <button
                        type="submit"
                        disabled={!isApiKeyValid || isUploading || 
                            (selectedInputType === 'doi' && !doiInput.trim()) ||
                            (selectedInputType === 'text' && !textInput.trim()) ||
                            (selectedInputType === 'pdf' && files.length === 0)
                        }
                        className={`w-full px-6 py-3 text-white rounded-lg font-semibold transition-all duration-200 ${
                            !isApiKeyValid || isUploading || 
                            (selectedInputType === 'doi' && !doiInput.trim()) ||
                            (selectedInputType === 'text' && !textInput.trim()) ||
                            (selectedInputType === 'pdf' && files.length === 0)
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
                        }`}
                    >
                        {isUploading ? "Converting..." : "Convert to Reproschema"}
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

