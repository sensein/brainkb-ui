"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getData } from "../../components/getData";
import StatusIndicator, { StatusType } from "../../components/StatusIndicator";

interface NamedGraph {
    graph: string;
    description: string;
}

export default function IngestKnowledgeGraphPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [namedGraphs, setNamedGraphs] = useState<NamedGraph[]>([]);
    const [selectedGraph, setSelectedGraph] = useState<string>('');
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState<boolean>(false);
    const [currentStatus, setCurrentStatus] = useState<StatusType>('idle');

    // Redirect if not logged in
    useEffect(() => {
        if (session === null) {
            router.push("/");
        }
    }, [session, router]);

    // Fetch named graphs on component mount
    useEffect(() => {
        const fetchNamedGraphs = async () => {
            try {
                const endpoint = process.env.NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT;
                if (!endpoint) {
                    setError("Named graph endpoint is not configured.");
                    return;
                }
                const response = await getData({}, endpoint, true);
                
                if (response && typeof response === 'object') {
                    const graphs: NamedGraph[] = Object.values(response);
                    setNamedGraphs(graphs);
                    // Don't auto-select the first graph, let user choose
                } else {
                    throw new Error("Invalid response format for named graphs.");
                }

            } catch (err) {
                console.error("Failed to fetch named graphs:", err);
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                setError(`Failed to load named graphs: ${errorMessage}`);
            }
        };

        if (session) {
            fetchNamedGraphs();
        }
    }, [session]);

    const validateAndSetFile = (selectedFile: File) => {
        const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
        if (fileType === 'jsonld' || fileType === 'ttl') {
            // Check if we already have files and ensure they're the same type
            if (files.length > 0) {
                const existingFileType = files[0].name.split('.').pop()?.toLowerCase();
                if (existingFileType !== fileType) {
                    setError("All files must be of the same type. You cannot mix JSON-LD (.jsonld) and Turtle (.ttl) files in the same upload.");
                    setSuccessMessage(null);
                    return;
                }
            }
            
            setFiles(prevFiles => [...prevFiles, selectedFile]);
            setError(null);
            setSuccessMessage(null);
        } else {
            setError("Please upload only JSON-LD (.jsonld) or Turtle (.ttl) files.");
            setSuccessMessage(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            // Clear existing files and errors
            setFiles([]);
            setError(null);
            setSuccessMessage(null);
            
            // Validate each file
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
            // Clear existing files and errors
            setFiles([]);
            setError(null);
            setSuccessMessage(null);
            
            // Validate each file
            for (let i = 0; i < droppedFiles.length; i++) {
                validateAndSetFile(droppedFiles[i]);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!files.length || !selectedGraph || selectedGraph === "") {
            setError("Please select a named graph and files to upload.");
            return;
        }

        setIsUploading(true);
        setError(null);
        setSuccessMessage(null);
        setCurrentStatus('processing');

        try {
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append("files", files[i]);
            }
            formData.append("named_graph_iri", selectedGraph);
            
            // Determine file type from file extension
            const fileExtension = files[0].name.split('.').pop()?.toLowerCase();
            const fileType = fileExtension === 'ttl' ? 'ttl' : 'jsonld';
            formData.append("file_type", fileType);

            // Add host and endpoint

            const endpoint = process.env.NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_ENDPOINT;

            formData.append("endpoint", endpoint || '');

            const response = await fetch("/api/generic_kg_upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Error: ${response.status}`);
            }

            setSuccessMessage(result.message || "Files uploaded successfully!");
            setFiles([]); // Reset file input
            setCurrentStatus('done');

        } catch (err) {
            console.error("Error uploading files:", err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Failed to upload files: ${errorMessage}`);
            setCurrentStatus('error');
        } finally {
            setIsUploading(false);
        }
    };
    
    if (session === undefined) {
        return <p>Loading...</p>;
    }

    return (
        <div className="flex flex-col max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Ingest Knowledge Graph</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                Upload Knowledge Graph files in JSON-LD or Turtle (TTL) format to a specified named graph.
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
                            {currentStatus === 'idle' && 'Ready to upload knowledge graphs'}
                            {currentStatus === 'connecting' && 'Establishing connection...'}
                            {currentStatus === 'connected' && 'Connected and ready'}
                            {currentStatus === 'processing' && 'Uploading and processing files...'}
                            {currentStatus === 'done' && 'Knowledge graph uploaded successfully'}
                            {currentStatus === 'error' && 'An error occurred during upload'}
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

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg p-8 shadow-md">
                
                {/* Named Graph Selection */}
                <div>
                    <label htmlFor="named-graph" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Select Named Graph
                    </label>
                    <select
                        id="named-graph"
                        value={selectedGraph}
                        onChange={(e) => setSelectedGraph(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        disabled={namedGraphs.length === 0 || isUploading}
                    >
                        <option value="">Select named graph</option>
                        {namedGraphs.length === 0 && <option disabled>Loading graphs...</option>}
                        {namedGraphs.map((ng) => (
                            <option key={ng.graph} value={ng.graph}>
                                {ng.graph} ({ng.description})
                            </option>
                        ))}
                    </select>
                </div>

                {/* File Upload Section */}
                <div>
                    <label htmlFor="kg-files" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Upload KG Files
                    </label>
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
                            id="kg-files"
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".jsonld,.ttl"
                            multiple
                            disabled={isUploading}
                        />
                        <label
                            htmlFor="kg-files"
                            className="cursor-pointer flex flex-col items-center justify-center"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {files.length > 0 ? files.map(file => file.name).join(', ') : "Click to select files or drag and drop"}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                JSON-LD (.jsonld) or Turtle (.ttl) files only
                            </span>
                        </label>
                    </div>
                </div>

                {/* Messages and Submit Button */}
                <div className="space-y-4">
                    {error && <div className="text-red-500 text-sm p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">{error}</div>}
                    {successMessage && <div className="text-green-500 text-sm p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">{successMessage}</div>}
                    
                    <button
                        type="submit"
                        disabled={!files.length || !selectedGraph || isUploading}
                        className={`w-full px-4 py-3 text-white rounded-lg font-semibold transition-colors duration-200 ${
                            !files.length || !selectedGraph || isUploading
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        {isUploading ? "Uploading..." : "Upload Knowledge Graph"}
                    </button>
                </div>

            </form>
        </div>
    );
}
