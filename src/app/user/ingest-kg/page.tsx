"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatusIndicator, { StatusType } from "../../components/ui/StatusIndicator";
import { clientEnv } from "../../../config/env";
import SynthScholarImport from "../../components/synth-scholar/SynthScholarImport";

interface SpaceGraph {
    iri: string;
    description: string;
}

/** A space the user may ingest into (GET /api/spaces/writable). */
interface WritableSpace {
    slug: string;
    name: string;
    visibility: "public" | "private";
    parent_slug: string | null;
    access: string;
    graphs: SpaceGraph[];
}

const UNMAPPED = "__unmapped__";

/** What is being ingested. Each kind has its own form: the user says which, nothing is guessed from the files. */
type IngestKind = "rdf" | "synthscholar";
const INGEST_KINDS: { id: IngestKind; title: string; detail: string }[] = [
    { id: "rdf", title: "RDF files", detail: "Turtle (.ttl) or JSON-LD (.jsonld) files into a named graph of a space." },
    { id: "synthscholar", title: "SynthScholar review", detail: "The output folder of a local SynthScholar run — kept with its manuscript, PDF, figures and provenance, and optionally put into a space's graph." },
];

/** Spaces in tree order (parents before their subspaces), with depth for indenting. */
function treeOrder(spaces: WritableSpace[]): { space: WritableSpace; depth: number }[] {
    const bySlug = new Set(spaces.map((s) => s.slug));
    const kids = new Map<string, WritableSpace[]>();
    for (const s of spaces) {
        if (s.parent_slug && bySlug.has(s.parent_slug)) kids.set(s.parent_slug, [...(kids.get(s.parent_slug) ?? []), s]);
    }
    const out: { space: WritableSpace; depth: number }[] = [];
    const seen = new Set<string>();
    const walk = (s: WritableSpace, depth: number) => {
        if (seen.has(s.slug)) return;
        seen.add(s.slug);
        out.push({ space: s, depth });
        for (const k of kids.get(s.slug) ?? []) walk(k, depth + 1);
    };
    for (const s of spaces) if (!s.parent_slug || !bySlug.has(s.parent_slug)) walk(s, 0);
    return out;
}


export default function IngestKnowledgeGraphPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [spaces, setSpaces] = useState<WritableSpace[] | null>(null);
    const [unmapped, setUnmapped] = useState<SpaceGraph[]>([]);
    const [cannotIngest, setCannotIngest] = useState<string | null>(null);
    const [selectedSpace, setSelectedSpace] = useState<string>('');
    const [selectedGraph, setSelectedGraph] = useState<string>('');
    const [newGraphIri, setNewGraphIri] = useState<string>('');
    const [newGraphDescription, setNewGraphDescription] = useState<string>('');
    const [addingGraph, setAddingGraph] = useState<boolean>(false);
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState<boolean>(false);
    const [currentStatus, setCurrentStatus] = useState<StatusType>('idle');
    const [kind, setKind] = useState<IngestKind>('rdf');

    // ?kind=synthscholar opens the review import directly (linked from SynthScholar).
    useEffect(() => {
        const k = new URLSearchParams(window.location.search).get('kind');
        if (k === 'synthscholar' || k === 'rdf') setKind(k);
    }, []);

    // Redirect if not logged in
    useEffect(() => {
        if (session === null) {
            router.push("/");
        }
    }, [session, router]);

    // The spaces this user may ingest into, with their graphs — permission-based:
    // the query service applies the same checks ingestion does.
    const loadWritable = async (selectSlug?: string, selectGraph?: string) => {
        try {
            const response = await fetch('/api/spaces/writable');
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
            setCannotIngest(data.can_ingest === false ? (data.reason || "You can't ingest data yet.") : null);
            setSpaces(data.spaces ?? []);
            setUnmapped(data.unmapped_graphs ?? []);
            if (selectSlug) setSelectedSpace(selectSlug);
            if (selectGraph) setSelectedGraph(selectGraph);
        } catch (err) {
            console.error("Failed to load spaces:", err);
            setSpaces([]);
            setError(`Failed to load your spaces: ${err instanceof Error ? err.message : "unknown error"}`);
        }
    };

    useEffect(() => {
        if (session) loadWritable();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const space = spaces?.find((s) => s.slug === selectedSpace) ?? null;
    const graphsForSpace: SpaceGraph[] = selectedSpace === UNMAPPED ? unmapped : space?.graphs ?? [];

    const chooseSpace = (slug: string) => {
        setSelectedSpace(slug);
        const chosen = slug === UNMAPPED ? unmapped : spaces?.find((s) => s.slug === slug)?.graphs ?? [];
        setSelectedGraph(chosen.length === 1 ? chosen[0].iri : '');   // one graph: pick it
        setNewGraphIri(slug && slug !== UNMAPPED ? `https://brainkb.org/graph/${slug}/` : '');
        setNewGraphDescription('');
    };

    const addGraph = async () => {
        if (!space) return;
        setAddingGraph(true);
        setError(null);
        try {
            const response = await fetch(`/api/spaces/${encodeURIComponent(space.slug)}/graphs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ named_graph_url: newGraphIri.trim(), description: newGraphDescription.trim() }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
            const iri = newGraphIri.trim().endsWith('/') ? newGraphIri.trim() : `${newGraphIri.trim()}/`;
            await loadWritable(space.slug, iri);
        } catch (err) {
            setError(`Could not add the graph: ${err instanceof Error ? err.message : "unknown error"}`);
        } finally {
            setAddingGraph(false);
        }
    };

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

    // Helper to get user ID from session
    const getUserId = (): string | null => {
        if (!session?.user) return null;
        return session.user.id || session.user.orcid_id || session.user.email || null;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!files.length || !selectedGraph || selectedGraph === "") {
            setError("Please select a named graph and files to upload.");
            return;
        }

        const userId = getUserId();
        if (!userId) {
            setError("User ID not found. Please log in again.");
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
            formData.append("user_id", userId);
            // Determine file type from file extension
            const fileExtension = files[0].name.split('.').pop()?.toLowerCase();
            const fileType = fileExtension === 'ttl' ? 'ttl' : 'jsonld';
            formData.append("file_type", fileType);

            const endpoint = clientEnv.get('NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_ENDPOINT');
            if (!endpoint) {
                throw new Error('Upload endpoint not configured');
            }
            formData.append("endpoint", endpoint);

            const response = await fetch("/api/generic_kg_upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Error: ${response.status}`);
            }

            // Upload successful - task is done
            setSuccessMessage("Files uploaded successfully! Your job has been created and is processing in the background.");
            setCurrentStatus('done');
            
            // Clear the file list after successful upload
            setFiles([]);

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

            {/* What is being ingested — chosen, not inferred */}
            <fieldset className="mb-6">
                <legend className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">What are you ingesting?</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {INGEST_KINDS.map((k) => (
                        <label
                            key={k.id}
                            className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                                kind === k.id
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                        >
                            <input
                                type="radio"
                                name="ingest-kind"
                                value={k.id}
                                checked={kind === k.id}
                                onChange={() => { setKind(k.id); setError(null); setSuccessMessage(null); }}
                                disabled={isUploading}
                                className="sr-only"
                            />
                            <span className="block font-semibold text-gray-800 dark:text-gray-100">{k.title}</span>
                            <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">{k.detail}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            {kind === "synthscholar" ? (
                <SynthScholarImport
                    cannotIngest={cannotIngest}
                    spaces={spaces === null ? null : treeOrder(spaces).map(({ space: s, depth }) => ({
                        slug: s.slug,
                        label: `${"\u00a0\u00a0\u00a0".repeat(depth)}${depth ? "└ " : ""}${s.name} (${s.slug}) · ${s.visibility}`,
                    }))}
                />
            ) : (
            <>
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
                            {currentStatus === 'processing' && 'Uploading files...'}
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

            {/* p-4 on phones, full p-8 padding at sm+ so the card doesn't crowd narrow screens */}
            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-8 shadow-md">
                
                {/* Space, then graph: only spaces this user may write to */}
                <div className="space-y-4">
                    {cannotIngest ? (
                        <div className="text-sm p-3 rounded-lg bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                            {cannotIngest}
                        </div>
                    ) : (
                        <>
                            <div>
                                <label htmlFor="space" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                    Space
                                </label>
                                <select
                                    id="space"
                                    value={selectedSpace}
                                    onChange={(e) => chooseSpace(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    disabled={spaces === null || isUploading}
                                >
                                    <option value="">
                                        {spaces === null ? "Loading your spaces…" : spaces.length ? "Select a space" : "No space you can add data to"}
                                    </option>
                                    {treeOrder(spaces ?? []).map(({ space: s, depth }) => (
                                        <option key={s.slug} value={s.slug}>
                                            {"\u00a0\u00a0\u00a0".repeat(depth)}{depth ? "└ " : ""}{s.name} ({s.slug}) · {s.visibility}
                                            {s.graphs.length ? "" : " · no graph yet"}
                                        </option>
                                    ))}
                                    {unmapped.length > 0 && <option value={UNMAPPED}>Graphs not in any space ({unmapped.length})</option>}
                                </select>
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Only spaces you can add data to are listed — as a member (owner or editor, including a role
                                    from a parent space), through an access rule, or as an admin.{" "}
                                    <Link href="/user/spaces" className="text-blue-700 dark:text-blue-400 underline">
                                        Manage spaces
                                    </Link>
                                    {spaces !== null && spaces.length === 0 && " — create one, or ask a space owner to make you an editor."}
                                </p>
                            </div>

                            {selectedSpace && graphsForSpace.length > 0 && (
                                <div>
                                    <label htmlFor="named-graph" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                        Named graph
                                    </label>
                                    <select
                                        id="named-graph"
                                        value={selectedGraph}
                                        onChange={(e) => setSelectedGraph(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        disabled={isUploading}
                                    >
                                        <option value="">Select a graph</option>
                                        {graphsForSpace.map((g) => (
                                            <option key={g.iri} value={g.iri}>
                                                {g.iri}{g.description ? ` (${g.description})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        {selectedSpace === UNMAPPED
                                            ? "These graphs belong to no space, so no space's members or visibility govern them."
                                            : `Who can read this data is set by the space (${space?.visibility}).`}
                                    </p>
                                </div>
                            )}

                            {space && (graphsForSpace.length === 0 || addingGraph) && (
                                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 space-y-3">
                                    <div className="text-sm text-gray-700 dark:text-gray-200">
                                        <strong>{space.name}</strong> has no graph yet. Add one to hold the data:
                                    </div>
                                    <input
                                        value={newGraphIri}
                                        onChange={(e) => setNewGraphIri(e.target.value)}
                                        aria-label="New graph IRI"
                                        placeholder="https://brainkb.org/graph/my-space/"
                                        className="w-full px-3 py-2 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                    <input
                                        value={newGraphDescription}
                                        onChange={(e) => setNewGraphDescription(e.target.value)}
                                        aria-label="Description of the new graph"
                                        placeholder="What this graph holds (shown in the registry)"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={addGraph}
                                        disabled={addingGraph || !newGraphIri.trim() || !newGraphDescription.trim()}
                                        className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:bg-gray-400"
                                    >
                                        {addingGraph ? "Adding…" : "Add graph to this space"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
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

                {/* Upload Status */}
                {isUploading && (
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-3">Uploading</h3>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-gray-700 dark:text-gray-300 border border-blue-200 dark:border-blue-800">
                            Uploading files... Please wait.
                        </div>
                    </div>
                )}

            {/* Messages and Submit Button */}
                <div className="space-y-4">
                    {error && <div className="text-red-500 text-sm p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">{error}</div>}
                    {successMessage && (
                        <div className="text-green-500 text-sm p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <p className="mb-2">{successMessage}</p>
                            <Link 
                                href="/user/job-status"
                                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium underline"
                            >
                                View Job Status →
                            </Link>
                        </div>
                    )}
                    
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
            </>
            )}
        </div>
    );
}
