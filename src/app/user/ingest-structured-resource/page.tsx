"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FileText, Link as LinkIcon, Type } from "lucide-react";

type InputType = 'doi' | 'pdf' | 'text';

export default function IngestStructuredResourcePage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [selectedInputType, setSelectedInputType] = useState<InputType>('text');
    const [files, setFiles] = useState<File[]>([]);
    const [doiInput, setDoiInput] = useState<string>('');
    const [textInput, setTextInput] = useState<string>('');
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState<boolean>(false);
    const [extractionResult, setExtractionResult] = useState<any>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [lastResult, setLastResult] = useState<any>(null);

    // Redirect if not logged in
    useEffect(() => {
        if (session === null) {
            router.push("/login");
        }
    }, [session, router]);


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
            // Add endpoint
            const endpoint = process.env.NEXT_PUBLIC_API_ADMIN_EXTRACT_STRUCTURED_RESOURCE_ENDPOINT;
            formData.append("endpoint", endpoint || '');

            const response = await fetch("/api/structured-json-upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Error: ${response.status}`);
            }
            console.log('Full result:', result);
            setLastResult(result);
            console.log('Result data type:', typeof result.data);
            console.log('Result data:', result.data);

            // Check if the result contains extracted data
            let parsedData = null;
            
            console.log('Full result object:', result);
            console.log('Result.data type:', typeof result.data);
            console.log('Result.data value:', result.data);
            console.log('Result.message type:', typeof result.message);
            console.log('Result.message value:', result.message);
            
            // Helper function to try parsing JSON from various sources
            const tryParseJSON = (source: any, sourceName: string) => {
                if (!source) return null;
                
                let dataToParse = source;
                
                // If it's already an object, return it
                if (typeof source === 'object' && source !== null) {
                    console.log(`${sourceName} is already an object:`, source);
                    return source;
                }
                
                // If it's a string, try to parse it
                if (typeof source === 'string') {
                    const trimmed = source.trim();
                    
                    // Check if it looks like JSON
                    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                        try {
                            console.log(`Attempting to parse ${sourceName} as JSON:`, trimmed);
                            const parsed = JSON.parse(trimmed);
                            console.log(`Successfully parsed ${sourceName}:`, parsed);
                            return parsed;
                        } catch (e) {
                            console.error(`Failed to parse ${sourceName} as JSON:`, e);
                            return null;
                        }
                    } else {
                        console.log(`${sourceName} is a string but not JSON format:`, trimmed);
                        return null;
                    }
                }
                
                return null;
            };
            
            // Try parsing from different possible sources
            const sources = [
                { data: result.data, name: 'result.data' },
                { data: result.message, name: 'result.message' },
                { data: result.data?.message, name: 'result.data.message' },
                { data: result.data?.data, name: 'result.data.data' },
                { data: result.extracted_data, name: 'result.extracted_data' },
                { data: result.data?.extracted_data, name: 'result.data.extracted_data' }
            ];
            
            for (const source of sources) {
                const parsed = tryParseJSON(source.data, source.name);
                if (parsed) {
                    console.log(`Found data in ${source.name}:`, parsed);
                    
                    // Special handling for objects that contain JSON strings in message field
                    if (typeof parsed === 'object' && parsed.message && typeof parsed.message === 'string') {
                        console.log(`Found object with message field, attempting to parse message:`, parsed.message);
                        try {
                            const messageParsed = JSON.parse(parsed.message);
                            console.log(`Successfully parsed message field:`, messageParsed);
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
                    
                    // Handle different parsed formats
                    if (Array.isArray(parsed)) {
                        parsedData = parsed;
                        break;
                    } else if (typeof parsed === 'object') {
                        // If it's a single object, wrap it in an array
                        parsedData = [parsed];
                        break;
                    }
                }
            }
            
            if (parsedData) {
                // Flatten the data if it contains nested objects
                const flattenedData = parsedData.map((item: any) => {
                    // If the item has a message field that contains JSON, parse it first
                    if (item.message && typeof item.message === 'string') {
                        try {
                            const parsedMessage = JSON.parse(item.message);
                            console.log('Parsed message content:', parsedMessage);
                            return flattenObject(parsedMessage);
                        } catch (e) {
                            console.error('Failed to parse message as JSON:', e);
                            return flattenObject(item);
                        }
                    }
                    return flattenObject(item);
                });
                console.log('Original parsed data:', parsedData);
                console.log('Flattened data for table:', flattenedData);
                setExtractionResult(flattenedData);
                setSuccessMessage("Content processed successfully! Review and edit the extracted data below.");
            } else {
                console.log('No extraction result found, showing message only');
                
                // Find the best message to display
                const possibleMessages = [
                    result.data?.message,
                    result.message,
                    result.data?.data,
                    "Content processed successfully!"
                ];
                
                let displayMessage = "Content processed successfully!";
                
                for (const msg of possibleMessages) {
                    if (msg && typeof msg === 'string') {
                        const trimmed = msg.trim();
                        // If it looks like JSON, don't show it as a message
                        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                            displayMessage = "Content processed successfully! Review and edit the extracted data below.";
                            break;
                        } else if (trimmed.length > 0) {
                            displayMessage = trimmed;
                            break;
                        }
                    }
                }
                
                setSuccessMessage(displayMessage);
            }
            setFiles([]);
            setDoiInput('');
            setTextInput('');

        } catch (err) {
            console.error("Error processing content:", err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Failed to process content: ${errorMessage}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveData = async () => {
        if (!extractionResult) {
            setError("No data to save.");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const saveEndpoint = process.env.NEXT_PUBLIC_API_ADMIN_SAVE_STRUCTURED_RESOURCE_ENDPOINT;
            if (!saveEndpoint) {
                throw new Error("Save endpoint not configured.");
            }

            // Reconstruct the original nested structure
            const reconstructedData = extractionResult.map((flattenedItem: any) => unflattenObject(flattenedItem));
            console.log('Reconstructed data for saving:', reconstructedData);

            const response = await fetch("/api/save-structured-resource", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: reconstructedData,
                    endpoint: saveEndpoint
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Error: ${response.status}`);
            }

            setSuccessMessage("Data saved successfully!");
            setExtractionResult(null);

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

    const handleTableDataChange = (rowIndex: number, field: string, value: any) => {
        if (!extractionResult) return;

        const updatedData = [...extractionResult];
        updatedData[rowIndex] = {
            ...updatedData[rowIndex],
            [field]: value
        };
        setExtractionResult(updatedData);
    };

    if (session === undefined) {
        return <p>Loading...</p>;
    }

    return (
        <div className="flex flex-col max-w-6xl mx-auto p-4">
            <h1 className="text-3xl font-bold mb-4 dark:text-white">Structured Resource Extraction</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                Structured Extraction and Knowledge Representation of Resources from DOIs, PDFs, and Text.
            </p>

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
                        disabled={isUploading || 
                            (selectedInputType === 'doi' && !doiInput.trim()) ||
                            (selectedInputType === 'text' && !textInput.trim()) ||
                            (selectedInputType === 'pdf' && files.length === 0)
                        }
                        className={`w-full px-6 py-3 text-white rounded-lg font-semibold transition-all duration-200 ${
                            isUploading || 
                            (selectedInputType === 'doi' && !doiInput.trim()) ||
                            (selectedInputType === 'text' && !textInput.trim()) ||
                            (selectedInputType === 'pdf' && files.length === 0)
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
                        }`}
                    >
                        {isUploading ? "Processing..." : "Process Structured Resource"}
                    </button>
                </div>

            </form>

            {/* Extracted Data Table */}
            {extractionResult && (
                <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-8 shadow-md">
                    <h2 className="text-xl font-bold mb-4">Extracted Data</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Review and edit the extracted data before saving.
                    </p>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-300 dark:border-gray-600">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700">
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200 border-b">
                                        Field
                                    </th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200 border-b">
                                        Value
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {extractionResult.map((row: any, rowIndex: number) => (
                                    Object.entries(row).map(([field, value], fieldIndex: number) => {
                                        // Check if the value is an array (either actual array or JSON string that represents an array)
                                        let isArray = false;
                                        let arrayValues: string[] = [];
                                        
                                        if (Array.isArray(value)) {
                                            isArray = true;
                                            arrayValues = value.map(v => String(v));
                                        } else if (typeof value === 'string') {
                                            // Try to parse as JSON array
                                            try {
                                                const parsed = JSON.parse(value);
                                                if (Array.isArray(parsed)) {
                                                    isArray = true;
                                                    arrayValues = parsed.map(v => String(v));
                                                }
                                            } catch (e) {
                                                // Not a JSON array, treat as regular string
                                            }
                                        }
                                        
                                        if (isArray) {
                                            // Render multiple input boxes for array values
                                            return arrayValues.map((arrayValue, arrayIndex) => (
                                                <tr key={`${rowIndex}-${fieldIndex}-${arrayIndex}`} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">
                                                        {arrayIndex === 0 ? field : ''}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="text"
                                                                value={arrayValue}
                                                                onChange={(e) => {
                                                                    // Update the specific array element
                                                                    const newArrayValues = [...arrayValues];
                                                                    newArrayValues[arrayIndex] = e.target.value;
                                                                    
                                                                    // Update the flattened data
                                                                    const updatedData = [...extractionResult];
                                                                    updatedData[rowIndex] = { 
                                                                        ...updatedData[rowIndex], 
                                                                        [field]: JSON.stringify(newArrayValues)
                                                                    };
                                                                    setExtractionResult(updatedData);
                                                                }}
                                                                className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                                            />
                                                            {arrayIndex === arrayValues.length - 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        // Add new array element
                                                                        const newArrayValues = [...arrayValues, ''];
                                                                        const updatedData = [...extractionResult];
                                                                        updatedData[rowIndex] = { 
                                                                            ...updatedData[rowIndex], 
                                                                            [field]: JSON.stringify(newArrayValues)
                                                                        };
                                                                        setExtractionResult(updatedData);
                                                                    }}
                                                                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                                                >
                                                                    +
                                                                </button>
                                                            )}
                                                            {arrayValues.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        // Remove array element
                                                                        const newArrayValues = arrayValues.filter((_, i) => i !== arrayIndex);
                                                                        const updatedData = [...extractionResult];
                                                                        updatedData[rowIndex] = { 
                                                                            ...updatedData[rowIndex], 
                                                                            [field]: JSON.stringify(newArrayValues)
                                                                        };
                                                                        setExtractionResult(updatedData);
                                                                    }}
                                                                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                                                >
                                                                    ×
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ));
                                        } else {
                                            // Render single input for non-array values
                                            return (
                                                <tr key={`${rowIndex}-${fieldIndex}`} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">
                                                        {field}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="text"
                                                            value={value as string || ''}
                                                            onChange={(e) => handleTableDataChange(rowIndex, field, e.target.value)}
                                                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    })
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSaveData}
                            disabled={isSaving}
                            className={`px-6 py-2 text-white rounded-lg font-semibold transition-colors duration-200 ${
                                isSaving
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-green-600 hover:bg-green-700"
                            }`}
                        >
                            {isSaving ? "Saving..." : "Save Data"}
                        </button>
                    </div>
                </div>
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
