"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getData } from "../../components/utils/getData";
import { clientEnv } from "../../../config/env";
import { format } from "date-fns";

interface JobFailure {
    file?: string;
    http_status?: number;
    response_body?: string;
    error?: string;
}

interface JobSummary {
    total_files?: number;
    success_count?: number;
    fail_count?: number;
    success_rate_percent?: number;
    total_bytes?: number;
    total_success_bytes?: number;
    total_bytes_human?: string;
    total_success_bytes_human?: string;
    avg_file_size_bytes?: number;
    avg_file_size_human?: string;
    avg_success_file_size_bytes?: number;
    avg_success_file_size_human?: string;
    max_file_name?: string;
    max_file_size_bytes?: number;
    max_file_size_human?: string;
    min_file_name?: string;
    min_file_size_bytes?: number;
    min_file_size_human?: string;
    overall_elapsed_s?: number;
    overall_bps?: number;
    overall_rate_human?: string;
    success_bps?: number;
    success_rate_human?: string;
    per_extension?: Record<string, {
        count?: number;
        total_bytes?: number;
        total_bytes_human?: string;
        avg_size_bytes?: number;
        avg_size_human?: string;
    }>;
    failures?: JobFailure[];
}

interface Job {
    job_id?: string;
    id?: string;
    status?: string;
    state?: string;
    total_files?: number;
    processed_files?: number;
    completed_files?: number;
    files_processed?: number;
    progress?: number;
    progress_percent?: number;
    success_count?: number;
    fail_count?: number;
    endpoint?: string;
    error?: string;
    message?: string;
    start_time?: string | number;
    startTime?: string | number;
    created_at?: string | number;
    end_time?: string | number;
    endTime?: string | number;
    completed_at?: string | number;
    named_graph_iri?: string;
    user_id?: string;
    summary?: JobSummary;
}

export default function JobStatusPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // Redirect if not logged in
    useEffect(() => {
        if (session === null) {
            router.push("/");
        }
    }, [session, router]);

    // Helper to get user ID from session
    const getUserId = (): string | null => {
        if (!session?.user) return null;
        return session.user.id || session.user.orcid_id || session.user.email || null;
    };

    // Fetch all jobs for the current user
    const fetchJobs = async () => {
        const userId = getUserId();
        if (!userId) {
            setError("User ID not found. Please log in again.");
            setLoading(false);
            return;
        }

        if (!clientEnv.kgJobStatusEndpoint) {
            setError("Jobs endpoint not configured. Please set NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT in your environment variables.");
            setLoading(false);
            return;
        }

        try {
            setRefreshing(true);
            const url = new URL(clientEnv.kgJobStatusEndpoint);
            // Add user_id if the endpoint supports it (some endpoints might not need it)
            url.searchParams.set('user_id', userId);
            url.searchParams.set('limit', '100');
            url.searchParams.set('offset', '0');

            console.log('Fetching all jobs from:', url.toString());
            console.log('User ID:', userId);

            const response = await getData({}, url.toString(), true, 'query');
            
            console.log('All jobs response:', response);

            // Handle different response formats
            let jobsArray: Job[] = [];
            if (Array.isArray(response)) {
                jobsArray = response;
            } else if (response && typeof response === 'object') {
                jobsArray = response.data || response.jobs || response.results || response.items || [];
            }

            // Filter by user_id if not already filtered by API
            if (jobsArray.length > 0) {
                jobsArray = jobsArray.filter(job => 
                    !job.user_id || job.user_id === userId
                );
            }

            // Sort by start time (most recent first)
            jobsArray.sort((a, b) => {
                const timeA = new Date(a.start_time || a.startTime || a.created_at || 0).getTime();
                const timeB = new Date(b.start_time || b.startTime || b.created_at || 0).getTime();
                return timeB - timeA;
            });

            console.log('Loaded jobs:', jobsArray.length);
            setJobs(jobsArray);
            setError(null);
        } catch (err) {
            console.error("Error fetching jobs:", err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Failed to load jobs: ${errorMessage}`);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Fetch job details
    const fetchJobDetails = async (jobId: string) => {
        const userId = getUserId();
        if (!userId || !clientEnv.kgAllJobsStatusEndpoint) {
            console.error("Missing user ID or job detail endpoint");
            return;
        }

        try {
            // Use the single job detail endpoint with job_id parameter
            const url = new URL(clientEnv.kgAllJobsStatusEndpoint);
            url.searchParams.set('user_id', userId);
            url.searchParams.set('job_id', jobId);

            console.log('Fetching job details from:', url.toString());
            console.log('Job ID:', jobId, 'User ID:', userId);

            const response = await getData({}, url.toString(), true, 'query');
            
            console.log('Job details response:', response);

            // Handle different response formats
            let job: Job | null = null;
            
            if (Array.isArray(response)) {
                // If response is an array, find the job with matching ID
                job = response.find(j => (j.job_id || j.id) === jobId) || response[0] || null;
            } else if (response && typeof response === 'object') {
                // Check if response is the job object directly
                if (response.job_id || response.id) {
                    job = response as Job;
                } else {
                    // Check common response wrapper keys
                    const possibleJob = response.data || response.job || response.result || response;
                    if (possibleJob && (possibleJob.job_id || possibleJob.id)) {
                        job = possibleJob as Job;
                    }
                }
            }

            if (job) {
                console.log('Job found with summary:', job.summary ? 'Yes' : 'No');
                console.log('Job summary:', JSON.stringify(job.summary, null, 2));
                console.log('Full job object keys:', Object.keys(job));
                // Ensure summary is properly set
                if (job.summary && typeof job.summary === 'object') {
                    console.log('Summary keys:', Object.keys(job.summary));
                    console.log('Has per_extension:', !!job.summary.per_extension);
                    console.log('Has failures:', !!job.summary.failures);
                }
                setSelectedJob(job);
            } else {
                console.warn('Job not found in response. Response structure:', Object.keys(response || {}));
                // Try to use the job from the list if available
                const jobFromList = jobs.find(j => (j.job_id || j.id) === jobId);
                if (jobFromList) {
                    console.log('Using job from list instead');
                    setSelectedJob(jobFromList);
                }
            }
        } catch (err) {
            console.error("Error fetching job details:", err);
            // Fallback: try to use the job from the list
            const jobFromList = jobs.find(j => (j.job_id || j.id) === jobId);
            if (jobFromList) {
                console.log('Using job from list as fallback');
                setSelectedJob(jobFromList);
            }
        }
    };

    useEffect(() => {
        if (session) {
            fetchJobs();
            // Refresh every 5 seconds
            const interval = setInterval(() => {
                fetchJobs();
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [session]);

    // Calculate progress percentage
    const getProgress = (job: Job): number => {
        const total = job.total_files || 0;
        const processed = job.processed_files || job.completed_files || job.files_processed || 0;
        if (total === 0) return 0;
        return Math.round((processed / total) * 100);
    };

    // Get status color
    const getStatusColor = (status: string | undefined): string => {
        const statusValue = (status || '').toLowerCase();
        if (statusValue === 'completed' || statusValue === 'success' || statusValue === 'done') {
            return 'text-green-600 dark:text-green-400';
        } else if (statusValue === 'failed' || statusValue === 'error') {
            return 'text-red-600 dark:text-red-400';
        } else if (statusValue === 'processing' || statusValue === 'running' || statusValue === 'in_progress') {
            return 'text-blue-600 dark:text-blue-400';
        }
        return 'text-gray-600 dark:text-gray-400';
    };

    // Format date - handles both string dates and numeric Unix timestamps
    const formatDate = (dateValue: string | number | undefined): string => {
        if (!dateValue) return 'N/A';
        try {
            // If it's a number, treat it as Unix timestamp (seconds)
            const date = typeof dateValue === 'number' 
                ? new Date(dateValue * 1000)  // Convert seconds to milliseconds
                : new Date(dateValue);
            return format(date, 'PPp');
        } catch {
            return typeof dateValue === 'number' ? dateValue.toString() : dateValue;
        }
    };

    if (session === undefined) {
        return <p className="text-gray-600 dark:text-gray-400">Loading...</p>;
    }

    return (
        <div className="flex flex-col max-w-7xl mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2 dark:text-white">Ingestion Job Status</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Monitor the status of your knowledge graph upload jobs
                    </p>
                </div>
                <button
                    onClick={fetchJobs}
                    disabled={refreshing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : jobs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400 text-lg">No jobs found</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                        Upload some knowledge graph files to see job status here
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Job ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Progress
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Files
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Started
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {jobs.map((job, index) => {
                                    const jobId = job.job_id || job.id || `job-${index}`;
                                    const status = job.status || job.state || 'unknown';
                                    const progress = getProgress(job);
                                    const totalFiles = job.total_files || 0;
                                    const processedFiles = job.processed_files || job.completed_files || job.files_processed || 0;

                                    return (
                                        <tr 
                                            key={jobId}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                            onClick={() => fetchJobDetails(jobId)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                                                    {jobId.substring(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-medium capitalize ${getStatusColor(status)}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2" style={{ minWidth: '100px' }}>
                                                        <div 
                                                            className={`h-2 rounded-full transition-all ${
                                                                progress === 100 ? 'bg-green-600' : 
                                                                status.toLowerCase().includes('error') || status.toLowerCase().includes('failed') ? 'bg-red-600' :
                                                                'bg-blue-600'
                                                            }`}
                                                            style={{ width: `${Math.min(100, progress)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem]">
                                                        {progress}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-gray-100">
                                                    {processedFiles} / {totalFiles}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {formatDate(job.start_time || job.startTime || job.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fetchJobDetails(jobId);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Job Details Modal */}
            {selectedJob && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedJob(null)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[70vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold dark:text-white">Job Details</h2>
                                <button
                                    onClick={() => setSelectedJob(null)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            {/* Basic Job Information */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4 dark:text-white">Basic Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Job ID</label>
                                        <p className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                                            {selectedJob.job_id || selectedJob.id || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                                        <p className={`mt-1 text-sm font-medium capitalize ${getStatusColor(selectedJob.status || selectedJob.state)}`}>
                                            {selectedJob.status || selectedJob.state || 'Unknown'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">User ID</label>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                            {selectedJob.user_id || getUserId() || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Progress</label>
                                        <div className="mt-1">
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                                <div 
                                                    className={`h-3 rounded-full transition-all ${
                                                        (selectedJob.progress_percent ?? getProgress(selectedJob)) === 100 ? 'bg-green-600' : 
                                                        (selectedJob.status || '').toLowerCase().includes('error') ? 'bg-red-600' :
                                                        'bg-blue-600'
                                                    }`}
                                                    style={{ width: `${Math.min(100, selectedJob.progress_percent ?? getProgress(selectedJob))}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {selectedJob.progress_percent ?? getProgress(selectedJob)}%
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Files</label>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                            {selectedJob.total_files ?? 0}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Processed Files</label>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                            {selectedJob.processed_files ?? 0}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Success Count</label>
                                        <p className="mt-1 text-sm text-green-600 dark:text-green-400 font-medium">
                                            {selectedJob.success_count ?? 0}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Fail Count</label>
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-medium">
                                            {selectedJob.fail_count ?? 0}
                                        </p>
                                    </div>
                                    {selectedJob.endpoint && (
                                        <div className="col-span-2">
                                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Endpoint</label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-all font-mono">
                                                {selectedJob.endpoint}
                                            </p>
                                        </div>
                                    )}
                                    {selectedJob.named_graph_iri && (
                                        <div className="col-span-2">
                                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Named Graph IRI</label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-all">
                                                {selectedJob.named_graph_iri}
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Started</label>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                            {formatDate(selectedJob.start_time || selectedJob.startTime || selectedJob.created_at)}
                                        </p>
                                    </div>
                                    {(selectedJob.end_time || selectedJob.endTime || selectedJob.completed_at) && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                                {formatDate(selectedJob.end_time || selectedJob.endTime || selectedJob.completed_at)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* File Statistics */}
                            {selectedJob.summary && (
                                <>
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                        <h3 className="text-lg font-semibold mb-4 dark:text-white">File Statistics</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Files</label>
                                                <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                    {selectedJob.summary.total_files ?? selectedJob.total_files ?? 0}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Success</label>
                                                <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                                                    {selectedJob.summary.success_count ?? selectedJob.success_count ?? 0}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Failed</label>
                                                <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                                                    {selectedJob.summary.fail_count ?? selectedJob.fail_count ?? 0}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Success Rate</label>
                                                <p className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">
                                                    {selectedJob.summary.success_rate_percent?.toFixed(1) ?? '0.0'}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Size Statistics */}
                                    {(selectedJob.summary.total_bytes !== undefined || selectedJob.summary.total_bytes_human || 
                                      selectedJob.summary.total_success_bytes !== undefined || selectedJob.summary.avg_file_size_bytes !== undefined) && (
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                            <h3 className="text-lg font-semibold mb-4 dark:text-white">Size Statistics</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Size</label>
                                                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                        {selectedJob.summary.total_bytes_human || 
                                                         (selectedJob.summary.total_bytes !== undefined ? `${selectedJob.summary.total_bytes.toLocaleString()} bytes` : 'N/A')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Success Size</label>
                                                    <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                                                        {selectedJob.summary.total_success_bytes_human || 
                                                         (selectedJob.summary.total_success_bytes !== undefined ? `${selectedJob.summary.total_success_bytes.toLocaleString()} bytes` : 'N/A')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Average File Size</label>
                                                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                        {selectedJob.summary.avg_file_size_human || 
                                                         (selectedJob.summary.avg_file_size_bytes !== undefined ? `${selectedJob.summary.avg_file_size_bytes.toLocaleString()} bytes` : 'N/A')}
                                                    </p>
                                                </div>
                                                {selectedJob.summary.max_file_name && (
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Largest File</label>
                                                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-all">
                                                            {selectedJob.summary.max_file_name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {selectedJob.summary.max_file_size_human || 
                                                             (selectedJob.summary.max_file_size_bytes !== undefined ? `${selectedJob.summary.max_file_size_bytes.toLocaleString()} bytes` : 'N/A')}
                                                        </p>
                                                    </div>
                                                )}
                                                {selectedJob.summary.min_file_name && (
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Smallest File</label>
                                                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-all">
                                                            {selectedJob.summary.min_file_name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {selectedJob.summary.min_file_size_human || 
                                                             (selectedJob.summary.min_file_size_bytes !== undefined ? `${selectedJob.summary.min_file_size_bytes.toLocaleString()} bytes` : 'N/A')}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Performance Statistics */}
                                    {(selectedJob.summary.overall_elapsed_s !== undefined || 
                                      selectedJob.summary.overall_bps !== undefined || 
                                      selectedJob.summary.success_bps !== undefined) && (
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                            <h3 className="text-lg font-semibold mb-4 dark:text-white">Performance Metrics</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {selectedJob.summary.overall_elapsed_s !== undefined && (
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Elapsed Time</label>
                                                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                            {selectedJob.summary.overall_elapsed_s.toFixed(2)}s
                                                        </p>
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Rate</label>
                                                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                        {selectedJob.summary.overall_rate_human || 
                                                         (selectedJob.summary.overall_bps !== undefined ? `${selectedJob.summary.overall_bps.toLocaleString()} B/s` : 'N/A')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Success Rate</label>
                                                    <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                                                        {selectedJob.summary.success_rate_human || 
                                                         (selectedJob.summary.success_bps !== undefined ? `${selectedJob.summary.success_bps.toLocaleString()} B/s` : 'N/A')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Per Extension Statistics */}
                                    {selectedJob.summary.per_extension && Object.keys(selectedJob.summary.per_extension).length > 0 && (
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                            <h3 className="text-lg font-semibold mb-4 dark:text-white">Per Extension Breakdown</h3>
                                            <div className="space-y-3">
                                                {Object.entries(selectedJob.summary.per_extension).map(([ext, stats]) => (
                                                    <div key={ext} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="font-semibold text-gray-900 dark:text-gray-100 uppercase">.{ext}</span>
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">{stats.count} files</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                                            <div>
                                                                <span className="text-gray-500 dark:text-gray-400">Total: </span>
                                                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                                                    {stats.total_bytes_human || `${(stats.total_bytes ?? 0).toLocaleString()} bytes`}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 dark:text-gray-400">Avg: </span>
                                                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                                                    {stats.avg_size_human || `${(stats.avg_size_bytes ?? 0).toLocaleString()} bytes`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Failures */}
                                    {selectedJob.summary.failures && selectedJob.summary.failures.length > 0 && (
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                            <h3 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">Failures</h3>
                                            <div className="space-y-3">
                                                {selectedJob.summary.failures.map((failure, index) => (
                                                    <div key={index} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                                        <div className="mb-2">
                                                            <span className="font-semibold text-red-700 dark:text-red-300">File: </span>
                                                            <span className="text-red-900 dark:text-red-200">{failure.file || 'Unknown'}</span>
                                                        </div>
                                                        {failure.http_status && (
                                                            <div className="mb-2">
                                                                <span className="font-semibold text-red-700 dark:text-red-300">HTTP Status: </span>
                                                                <span className="text-red-900 dark:text-red-200">{failure.http_status}</span>
                                                            </div>
                                                        )}
                                                        {(failure.response_body || failure.error) && (
                                                            <div className="mt-2">
                                                                <span className="font-semibold text-red-700 dark:text-red-300 block mb-1">Error Details:</span>
                                                                <pre className="text-xs text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/30 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                                                                    {failure.response_body || failure.error}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Fallback if no summary */}
                            {!selectedJob.summary && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Files</label>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                            {selectedJob.total_files || 0}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Processed Files</label>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                            {selectedJob.processed_files || selectedJob.completed_files || selectedJob.files_processed || 0}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedJob.message && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Message</label>
                                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        {selectedJob.message}
                                    </p>
                                </div>
                            )}
                            {selectedJob.error && (
                                <div>
                                    <label className="text-sm font-medium text-red-500 dark:text-red-400">Error</label>
                                    <p className="mt-1 text-sm text-red-700 dark:text-red-300 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                        {selectedJob.error}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

