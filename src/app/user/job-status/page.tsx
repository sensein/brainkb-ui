"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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

interface ProcessingHistoryEntry {
    timestamp?: number;
    stage?: string;
    file_name?: string;
    file_info?: string;
    status_message?: string;
    file_index?: number;
    total_files?: number;
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
    // New fields from latest API
    current_file?: string;
    current_stage?: string;
    stage_description?: string;
    status_message?: string;
    processing_history?: ProcessingHistoryEntry[];
    elapsed_seconds?: number;
    estimated_remaining_seconds?: number;
    can_recover?: boolean;
    is_recoverable?: boolean;
    recoverable_checked?: boolean; // Track if we've checked recoverable status
    process_running?: boolean; // Whether the job process is still running
    unrecoverable?: boolean; // Whether job is marked as unrecoverable
    unrecoverable_reason?: string; // Reason why job is unrecoverable
    recovery_attempted?: boolean; // Track if recovery has been attempted
    recovery_failed?: boolean; // Track if recovery attempt failed
}

export default function JobStatusPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [recovering, setRecovering] = useState<Record<string, boolean | string>>({});
    const [checkingRecoverable, setCheckingRecoverable] = useState<Record<string, boolean>>({});
    const [recoveryError, setRecoveryError] = useState<{ title: string; message: string; details?: string } | null>(null);
    const [recoveryConfirm, setRecoveryConfirm] = useState<{ jobId: string; jobInfo?: string } | null>(null);

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

    // Fetch all jobs for the current user (silent update to prevent blinking)
    const fetchJobs = async (silent: boolean = false) => {
        const userId = getUserId();
        if (!userId) {
            if (!silent) {
            setError("User ID not found. Please log in again.");
            }
            setLoading(false);
            return;
        }

        if (!clientEnv.kgJobStatusEndpoint) {
            if (!silent) {
            setError("Jobs endpoint not configured. Please set NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT in your environment variables.");
            }
            setLoading(false);
            return;
        }

        try {
            if (!silent) {
            setRefreshing(true);
            }
            // Use Next.js API route to proxy the request (avoids CORS issues)
            const apiUrl = new URL('/api/job-status', window.location.origin);
            apiUrl.searchParams.set('user_id', userId);
            apiUrl.searchParams.set('limit', '100');
            apiUrl.searchParams.set('offset', '0');

            const response = await fetch(apiUrl.toString());
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            const responseData = await response.json();

            // Handle different response formats
            let jobsArray: Job[] = [];
            if (Array.isArray(responseData)) {
                jobsArray = responseData;
            } else if (responseData && typeof responseData === 'object') {
                jobsArray = responseData.data || responseData.jobs || responseData.results || responseData.items || [];
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

            // Silently update jobs without causing re-renders if data hasn't changed
            setJobs(prevJobs => {
                // Check if jobs have actually changed to prevent unnecessary re-renders
                if (prevJobs.length === jobsArray.length) {
                    const hasChanges = prevJobs.some((prevJob, index) => {
                        const newJob = jobsArray[index];
                        const prevId = prevJob.job_id || prevJob.id;
                        const newId = newJob.job_id || newJob.id;
                        if (prevId !== newId) return true;
                        
                        // Check if key fields have changed
                        return (
                            prevJob.status !== newJob.status ||
                            prevJob.progress_percent !== newJob.progress_percent ||
                            prevJob.processed_files !== newJob.processed_files ||
                            prevJob.current_file !== newJob.current_file ||
                            prevJob.stage_description !== newJob.stage_description
                        );
                    });
                    
                    // If no significant changes, merge with existing data to preserve current activity info
                    if (!hasChanges) {
                        return prevJobs.map(prevJob => {
                            const newJob = jobsArray.find(j => (j.job_id || j.id) === (prevJob.job_id || prevJob.id));
                            if (!newJob) return prevJob;
                            
                            // Merge: keep existing current activity info if new job doesn't have it
                            return {
                                ...newJob,
                                current_file: newJob.current_file || prevJob.current_file,
                                current_stage: newJob.current_stage || prevJob.current_stage,
                                stage_description: newJob.stage_description || prevJob.stage_description,
                                status_message: newJob.status_message || prevJob.status_message,
                                processing_history: newJob.processing_history || prevJob.processing_history,
                                elapsed_seconds: newJob.elapsed_seconds || prevJob.elapsed_seconds,
                                estimated_remaining_seconds: newJob.estimated_remaining_seconds || prevJob.estimated_remaining_seconds,
                                // Preserve recoverable check status
                                recoverable_checked: prevJob.recoverable_checked || newJob.recoverable_checked,
                                is_recoverable: prevJob.is_recoverable !== undefined ? prevJob.is_recoverable : newJob.is_recoverable,
                                process_running: prevJob.process_running !== undefined ? prevJob.process_running : newJob.process_running,
                                unrecoverable: prevJob.unrecoverable || newJob.unrecoverable,
                                unrecoverable_reason: prevJob.unrecoverable_reason || newJob.unrecoverable_reason,
                            };
                        });
                    }
                }
                
                // If there are changes, update with new data
                return jobsArray;
            });
            
            if (!silent) {
            setError(null);
            }
            
            // For running jobs, fetch details to get current activity info (without opening modal) and check recoverable status
            // Always fetch details for running jobs to ensure we have accurate status information
            jobsArray.forEach(job => {
                const normalizedStatus = getNormalizedStatus(job);
                if (normalizedStatus === 'running') {
                    const jobId = job.job_id || job.id;
                    if (jobId) {
                        // Always fetch details for running jobs to get current activity info
                        // This ensures we have accurate data before showing "stuck" status
                        fetchJobDetailsSilently(jobId).catch(err => {
                            console.error(`Failed to fetch details for job ${jobId}:`, err);
                        });
                        
                        // Check recoverable status if not already checked
                        // Do this after a small delay to allow details to load first
                        if (!job.recoverable_checked) {
                            // Delay recoverable check slightly to let details load first
                            setTimeout(() => {
                                checkRecoverableStatus(job);
                            }, 1500);
                        }
                    }
                }
            });
        } catch (err) {
            console.error("Error fetching jobs:", err);
            if (!silent) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Failed to load jobs: ${errorMessage}`);
            }
        } finally {
            if (!silent) {
            setRefreshing(false);
            }
            setLoading(false);
        }
    };

    // Fetch job details silently (without opening modal) - for updating current activity
    const fetchJobDetailsSilently = async (jobId: string) => {
        const userId = getUserId();
        if (!userId || !clientEnv.kgAllJobsStatusEndpoint) {
            console.error("Missing user ID or job detail endpoint");
            return;
        }

        try {
            // Use Next.js API route to proxy the request (avoids CORS issues)
            const apiUrl = new URL('/api/job-details', window.location.origin);
            apiUrl.searchParams.set('user_id', userId);
            apiUrl.searchParams.set('job_id', jobId);

            const response = await fetch(apiUrl.toString());
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            const responseData = await response.json();
            
            // Handle different response formats
            let job: Job | null = null;
            
            if (Array.isArray(responseData)) {
                job = responseData.find(j => (j.job_id || j.id) === jobId) || responseData[0] || null;
            } else if (responseData && typeof responseData === 'object') {
                if (responseData.job_id || responseData.id) {
                    job = responseData as Job;
                } else {
                    const possibleJob = responseData.data || responseData.job || responseData.result || responseData;
                    if (possibleJob && (possibleJob.job_id || possibleJob.id)) {
                        job = possibleJob as Job;
                    }
                }
            }

            if (job) {
                // Update job in jobs list with current activity info (don't open modal)
                // Use functional update to prevent unnecessary re-renders
                setJobs(prevJobs => {
                    const jobIndex = prevJobs.findIndex(j => (j.job_id || j.id) === jobId);
                    if (jobIndex === -1) return prevJobs;
                    
                    const existingJob = prevJobs[jobIndex];
                    // Only update if there are actual changes to prevent blinking
                    const hasChanges = 
                        existingJob.current_file !== job.current_file ||
                        existingJob.current_stage !== job.current_stage ||
                        existingJob.stage_description !== job.stage_description ||
                        existingJob.status_message !== job.status_message ||
                        existingJob.elapsed_seconds !== job.elapsed_seconds ||
                        existingJob.estimated_remaining_seconds !== job.estimated_remaining_seconds;
                    
                    if (!hasChanges) return prevJobs;
                    
                    const updatedJobs = [...prevJobs];
                    updatedJobs[jobIndex] = {
                        ...existingJob,
                        current_file: job.current_file || existingJob.current_file,
                        current_stage: job.current_stage || existingJob.current_stage,
                        stage_description: job.stage_description || existingJob.stage_description,
                        status_message: job.status_message || existingJob.status_message,
                        processing_history: job.processing_history || existingJob.processing_history,
                        elapsed_seconds: job.elapsed_seconds !== undefined ? job.elapsed_seconds : existingJob.elapsed_seconds,
                        estimated_remaining_seconds: job.estimated_remaining_seconds !== undefined ? job.estimated_remaining_seconds : existingJob.estimated_remaining_seconds,
                    };
                    return updatedJobs;
                });
                
                // Check recoverable status if not already checked
                if (!job.recoverable_checked) {
                    checkRecoverableStatus(job);
                }
            }
        } catch (err) {
            console.error("Error fetching job details silently:", err);
        }
    };

    // Fetch job details (opens modal)
    const fetchJobDetails = async (jobId: string) => {
        const userId = getUserId();
        if (!userId || !clientEnv.kgAllJobsStatusEndpoint) {
            console.error("Missing user ID or job detail endpoint");
            return;
        }

        try {
            // Use Next.js API route to proxy the request (avoids CORS issues)
            const apiUrl = new URL('/api/job-details', window.location.origin);
            apiUrl.searchParams.set('user_id', userId);
            apiUrl.searchParams.set('job_id', jobId);

            console.log('Fetching job details from:', apiUrl.toString());
            console.log('Job ID:', jobId, 'User ID:', userId);

            const response = await fetch(apiUrl.toString());
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            const responseData = await response.json();
            
            console.log('Job details response:', responseData);

            // Handle different response formats
            let job: Job | null = null;
            
            if (Array.isArray(responseData)) {
                // If response is an array, find the job with matching ID
                job = responseData.find(j => (j.job_id || j.id) === jobId) || responseData[0] || null;
            } else if (responseData && typeof responseData === 'object') {
                // Check if response is the job object directly
                if (responseData.job_id || responseData.id) {
                    job = responseData as Job;
                } else {
                    // Check common response wrapper keys
                    const possibleJob = responseData.data || responseData.job || responseData.result || responseData;
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
                
                // Update job in jobs list with current activity info
                setJobs(prevJobs => prevJobs.map(j => {
                    if ((j.job_id || j.id) === jobId) {
                        return {
                            ...j,
                            current_file: job.current_file,
                            current_stage: job.current_stage,
                            stage_description: job.stage_description,
                            status_message: job.status_message,
                            processing_history: job.processing_history,
                            elapsed_seconds: job.elapsed_seconds,
                            estimated_remaining_seconds: job.estimated_remaining_seconds,
                        };
                    }
                    return j;
                }));
                
                // Check recoverable status if not already checked
                if (!job.recoverable_checked) {
                    checkRecoverableStatus(job);
                }
            } else {
                console.warn('Job not found in response. Response structure:', Object.keys(responseData || {}));
                // Don't set selected job on error - only set it when we have valid data
                // This prevents the modal from opening automatically
            }
        } catch (err) {
            console.error("Error fetching job details:", err);
            // Don't set selected job on error - this prevents the modal from opening automatically
        }
    };

    useEffect(() => {
        if (session) {
            fetchJobs(false); // Initial load - not silent
            // Refresh every 15 seconds silently (no visual blinking)
            const interval = setInterval(() => {
                fetchJobs(true); // Silent refresh
            }, 30000);
            
            return () => clearInterval(interval);
        }
    }, [session]);

    // Auto-recovery effect - runs periodically, not on every jobs update
    useEffect(() => {
        if (session && jobs.length > 0) {
            // Check for stuck jobs after jobs are loaded/updated
            const checkStuckJobs = async () => {
                const userId = getUserId();
                if (!userId) return;

                const stuckJobs = jobs.filter(job => {
                    const normalizedStatus = getNormalizedStatus(job);
                    if (normalizedStatus !== 'running') return false;
                    
                    // Skip jobs that are already marked as unrecoverable or checked
                    if (job.unrecoverable || (job.recoverable_checked && !job.is_recoverable)) {
                        return false;
                    }
                    
                    const ageHours = getJobAgeHours(job);
                    // Recover jobs that are running and older than 7 hours
                    return ageHours >= 7;
                });

                if (stuckJobs.length > 0) {
                    console.log(`[Auto-Recovery] Found ${stuckJobs.length} stuck job(s) to recover`);
                    // Recover all stuck jobs sequentially to avoid overwhelming the API
                    for (const job of stuckJobs) {
                        const jobId = job.job_id || job.id;
                        if (jobId) {
                            // Use a functional update to check if already recovering
                            let shouldRecover = false;
                            setRecovering(prev => {
                                if (!prev[jobId]) {
                                    shouldRecover = true;
                                    return { ...prev, [jobId]: 'checking' };
                                }
                                return prev;
                            });
                            
                            if (shouldRecover) {
                                await handleRecoverJob(jobId, true); // Silent recovery
                                // Small delay between recoveries to avoid rate limiting
                                await new Promise(resolve => setTimeout(resolve, 2000));
                            }
                        }
                    }
                }
            };

            // Check immediately on mount (with delay to avoid race conditions)
            const initialTimeout = setTimeout(() => {
                checkStuckJobs();
            }, 5000); // Wait 5 seconds after mount
            
            // Also check every 10 minutes (not on every jobs update)
            const autoRecoveryInterval = setInterval(() => {
                checkStuckJobs();
            }, 10 * 60 * 1000); // 10 minutes
            
            return () => {
                clearTimeout(initialTimeout);
                clearInterval(autoRecoveryInterval);
            };
        }
    }, [session]); // Removed 'jobs' from dependencies to prevent running on every update

    // Calculate progress percentage
    const getProgress = (job: Job): number => {
        const total = job.total_files || 0;
        const processed = job.processed_files || job.completed_files || job.files_processed || 0;
        if (total === 0) return 0;
        return Math.round((processed / total) * 100);
    };

    // Get normalized status from backend API response
    // Backend status: "done", "partial", "failed", "error", "running", "pending"
    const getNormalizedStatus = (job: Job): string => {
        const status = (job.status || job.state || '').toLowerCase();
        
        // If status is already one of the backend statuses, return it
        if (['done', 'partial', 'failed', 'error', 'running', 'pending'].includes(status)) {
            return status;
        }
        
        // Legacy status mapping
        if (status === 'completed' || status === 'success') {
            return 'done';
        }
        if (status === 'processing' || status === 'in_progress') {
            return 'running';
        }
        
        // If we have success_count and fail_count, determine status from counts
        if (job.success_count !== undefined && job.fail_count !== undefined) {
            if (job.fail_count === 0 && job.success_count > 0) {
                return 'done';
            } else if (job.success_count > 0 && job.fail_count > 0) {
                return 'partial';
            } else if (job.success_count === 0 && job.fail_count > 0) {
                return 'failed';
            }
        }
        
        return status || 'pending';
    };

    // Get status color based on backend status values
    const getStatusColor = (status: string | undefined): string => {
        const statusValue = (status || '').toLowerCase();
        if (statusValue === 'done') {
            return 'text-green-600 dark:text-green-400';
        } else if (statusValue === 'partial') {
            return 'text-yellow-600 dark:text-yellow-400';
        } else if (statusValue === 'failed' || statusValue === 'error') {
            return 'text-red-600 dark:text-red-400';
        } else if (statusValue === 'running') {
            return 'text-blue-600 dark:text-blue-400';
        } else if (statusValue === 'pending') {
            return 'text-gray-600 dark:text-gray-400';
        }
        // Legacy support
        if (statusValue === 'completed' || statusValue === 'success') {
            return 'text-green-600 dark:text-green-400';
        } else if (statusValue === 'processing' || statusValue === 'in_progress') {
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

    // Format time duration
    const formatTime = (seconds: number | undefined): string => {
        if (!seconds) return '0s';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    // Get stage icon
    const getStageIcon = (stage: string | undefined): string => {
        const icons: Record<string, string> = {
            pending: '⏳',
            initializing: '🔧',
            processing: '⚙️',
            attaching_provenance: '📝',
            uploading: '📤',
            completed: '✅',
            error: '❌',
            failed: '❌',
            running: '🔄',
        };
        return icons[stage || ''] || '•';
    };

    // Check if job is recoverable using API
    const checkRecoverableStatus = async (job: Job) => {
        const userId = getUserId();
        const jobId = job.job_id || job.id;
        if (!userId || !jobId || job.recoverable_checked) {
            return; // Already checked or missing info
        }

        // Only check for running/processing jobs
        const normalizedStatus = getNormalizedStatus(job);
        if (normalizedStatus !== 'running') {
            return; // Not a running job, no need to check
        }

        // Prevent duplicate concurrent checks
        if (checkingRecoverable[jobId]) {
            return; // Already checking this job
        }

        setCheckingRecoverable(prev => ({ ...prev, [jobId]: true }));

        try {
            const apiUrl = new URL('/api/job-check-recoverable', window.location.origin);
            apiUrl.searchParams.set('user_id', userId);
            apiUrl.searchParams.set('job_id', jobId);

            const response = await fetch(apiUrl.toString());
            
            // Handle 404 specifically - job doesn't exist on backend, mark as checked and unrecoverable
            if (response.status === 404) {
                setJobs(prevJobs => prevJobs.map(j => {
                    if ((j.job_id || j.id) === jobId) {
                        return { 
                            ...j, 
                            recoverable_checked: true, 
                            is_recoverable: false,
                            unrecoverable: true,
                            unrecoverable_reason: 'Job not found on backend'
                        };
                    }
                    return j;
                }));
                return; // Don't throw error for 404, just mark as checked
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            const isRecoverable = result.recoverable === true; // Explicitly check for true
            const processRunning = result.process_running === true;
            const unrecoverable = result.unrecoverable === true;

            // Update job in state
            setJobs(prevJobs => prevJobs.map(j => {
                if ((j.job_id || j.id) === jobId) {
                    return { 
                        ...j, 
                        is_recoverable: isRecoverable, 
                        recoverable_checked: true,
                        process_running: processRunning,
                        unrecoverable: unrecoverable,
                        unrecoverable_reason: result.reason || result.unrecoverable_reason
                    };
                }
                return j;
            }));

            // Update selected job if it's the one being checked
            if (selectedJob && (selectedJob.job_id || selectedJob.id) === jobId) {
                setSelectedJob(prev => prev ? { 
                    ...prev, 
                    is_recoverable: isRecoverable, 
                    recoverable_checked: true,
                    process_running: processRunning,
                    unrecoverable: unrecoverable,
                    unrecoverable_reason: result.reason || result.unrecoverable_reason
                } : null);
            }
        } catch (err) {
            // Only log non-404 errors
            if (!(err instanceof Error && err.message.includes('404'))) {
                console.error("Error checking recoverable status:", err);
            }
            // Mark as checked even on error to avoid repeated failed requests
            setJobs(prevJobs => prevJobs.map(j => {
                if ((j.job_id || j.id) === jobId) {
                    return { 
                        ...j, 
                        recoverable_checked: true, 
                        is_recoverable: false,
                        unrecoverable: true
                    };
                }
                return j;
            }));
        } finally {
            setCheckingRecoverable(prev => ({ ...prev, [jobId]: false }));
        }
    };

    // Check if job should show recovery option
    const shouldShowRecovery = (job: Job): boolean => {
        // Never show for unrecoverable jobs
        if (job.unrecoverable) {
            return false;
        }

        // If we've checked and it's not recoverable, don't show
        if (job.recoverable_checked && job.is_recoverable === false) {
            return false;
        }

        // If process is still running, don't show recovery button
        if (job.process_running === true) {
            return false;
        }

        // Show if explicitly marked as recoverable
        if (job.can_recover || job.is_recoverable === true) return true;
        
        // Show for running jobs that are older than 1 hour (stuck jobs)
        // But only if we haven't checked yet or it's recoverable
        const normalizedStatus = getNormalizedStatus(job);
        if (normalizedStatus === 'running') {
            const startTime = job.start_time || job.startTime || job.created_at;
            if (startTime) {
                const startTimestamp = typeof startTime === 'number' ? startTime : new Date(startTime).getTime() / 1000;
                const now = Math.floor(Date.now() / 1000);
                const ageHours = (now - startTimestamp) / 3600;
                // Show recovery for jobs older than 1 hour (if not checked or if recoverable)
                if (ageHours >= 1 && (!job.recoverable_checked || job.is_recoverable !== false)) {
                    return true;
                }
            }
        }
        
        return false;
    };

    // Get job age in hours
    const getJobAgeHours = (job: Job): number => {
        const startTime = job.start_time || job.startTime || job.created_at;
        if (!startTime) return 0;
        const startTimestamp = typeof startTime === 'number' ? startTime : new Date(startTime).getTime() / 1000;
        const now = Math.floor(Date.now() / 1000);
        return (now - startTimestamp) / 3600;
    };

    // Handle job recovery (called after confirmation)
    const handleRecoverJob = async (jobId: string, silent: boolean = false) => {
        const userId = getUserId();
        if (!userId) {
            if (!silent) {
                setError("User ID not found. Please log in again.");
            }
            return;
        }

        setRecovering(prev => ({ ...prev, [jobId]: 'checking' }));

        try {
            // OPTIMIZATION: Check recoverability first (lightweight, non-blocking)
            // Skip check if job is already marked as unrecoverable or checked
            const currentJob = jobs.find(j => (j.job_id || j.id) === jobId);
            if (currentJob?.unrecoverable || (currentJob?.recoverable_checked && !currentJob?.is_recoverable)) {
                if (!silent) {
                    setRecoveryError({
                        title: 'Recovery Not Available',
                        message: currentJob?.unrecoverable_reason || 'Job is not recoverable',
                    });
                }
                setRecovering(prev => ({ ...prev, [jobId]: false }));
                return;
            }

            const checkUrl = new URL('/api/job-check-recoverable', window.location.origin);
            checkUrl.searchParams.set('user_id', userId);
            checkUrl.searchParams.set('job_id', jobId);
            checkUrl.searchParams.set('max_age_hours', '7.0');

            const checkResponse = await fetch(checkUrl.toString());
            
            // Handle 404 - job doesn't exist, mark as unrecoverable
            if (checkResponse.status === 404) {
                setJobs(prevJobs => prevJobs.map(j => {
                    if ((j.job_id || j.id) === jobId) {
                        return { 
                            ...j, 
                            recoverable_checked: true,
                            is_recoverable: false,
                            unrecoverable: true,
                            unrecoverable_reason: 'Job not found on backend'
                        };
                    }
                    return j;
                }));
                if (!silent) {
                    setRecoveryError({
                        title: 'Recovery Not Available',
                        message: 'Job not found on backend',
                    });
                }
                setRecovering(prev => ({ ...prev, [jobId]: false }));
                return;
            }
            
            if (!checkResponse.ok) {
                throw new Error(`Check failed: HTTP ${checkResponse.status}`);
            }

            const checkResult = await checkResponse.json();
            
            // If not recoverable, show reason and stop
            if (!checkResult.recoverable) {
                // Special handling for process still running
                if (checkResult.process_running) {
                    if (!silent) {
                        setRecoveryError({
                            title: 'Recovery Not Available',
                            message: 'Job process is still running. Cannot recover an active job.',
                            details: checkResult.reason || `The job process is actively running (age: ${checkResult.age_hours || 'unknown'} hours). Recovery is only available for jobs where the process has stopped but the database still shows them as running.`,
                        });
                    }
                    setRecovering(prev => ({ ...prev, [jobId]: false }));
                    return;
                }
                
                // Handle unrecoverable jobs
                if (checkResult.unrecoverable) {
                    if (!silent) {
                        setRecoveryError({
                            title: 'Recovery Not Available',
                            message: `Job is marked as unrecoverable: ${checkResult.reason || 'Unknown reason'}`,
                        });
                    }
                    // Update job state to mark as unrecoverable
                    setJobs(prevJobs => prevJobs.map(j => {
                        if ((j.job_id || j.id) === jobId) {
                            return { 
                                ...j, 
                                unrecoverable: true,
                                unrecoverable_reason: checkResult.reason,
                                recoverable_checked: true,
                                is_recoverable: false
                            };
                        }
                        return j;
                    }));
                    setRecovering(prev => ({ ...prev, [jobId]: false }));
                    await fetchJobs(); // Reload to update UI
                    return;
                }
                
                // Other not recoverable reasons - mark as recovery attempted and failed
                setJobs(prevJobs => prevJobs.map(j => {
                    if ((j.job_id || j.id) === jobId) {
                        return { 
                            ...j, 
                            recovery_attempted: true,
                            recovery_failed: true,
                            recoverable_checked: true,
                            is_recoverable: false
                        };
                    }
                    return j;
                }));
                if (!silent) {
                    setRecoveryError({
                        title: 'Recovery Not Available',
                        message: checkResult.reason || 'Job is not recoverable',
                        details: checkResult.age_hours ? `Job age: ${checkResult.age_hours.toFixed(1)} hours. Maximum age for recovery: ${checkResult.max_age_hours || 7.0} hours.` : undefined,
                    });
                }
                setRecovering(prev => ({ ...prev, [jobId]: false }));
                return;
            }

            // If recoverable, proceed with recovery
            setRecovering(prev => ({ ...prev, [jobId]: 'recovering' }));

            const apiUrl = new URL('/api/job-recover', window.location.origin);
            apiUrl.searchParams.set('user_id', userId);
            apiUrl.searchParams.set('job_id', jobId);
            apiUrl.searchParams.set('max_age_hours', '7.0'); // Use 7 hours for recovery

            const response = await fetch(apiUrl.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                
                // Check if error contains nested JSON string
                if (errorData.error && typeof errorData.error === 'string' && errorData.error.includes('{')) {
                    try {
                        // Try to extract and parse nested JSON from error message
                        const jsonMatch = errorData.error.match(/\{.*\}/);
                        if (jsonMatch) {
                            const nestedError = JSON.parse(jsonMatch[0]);
                            errorData = { ...errorData, ...nestedError };
                        }
                    } catch {
                        // If parsing fails, use original error
                    }
                }
                
                // Mark recovery as attempted and failed
                setJobs(prevJobs => prevJobs.map(j => {
                    if ((j.job_id || j.id) === jobId) {
                        return { 
                            ...j, 
                            recovery_attempted: true,
                            recovery_failed: true
                        };
                    }
                    return j;
                }));
                
                throw errorData;
            }

            const result = await response.json();
            
            if (result.status === 'success') {
                if (!silent) {
                    setRecoveryError({
                        title: 'Recovery Successful',
                        message: `Job recovered successfully! ${result.recovered_count ? `Recovered ${result.recovered_count} job(s).` : ''}`,
                    });
                    // Auto-close success message after 3 seconds
                    setTimeout(() => setRecoveryError(null), 3000);
                } else {
                    console.log(`[Auto-Recovery] Job ${jobId} recovered successfully`);
                }
                // Refresh jobs list
                await fetchJobs();
                // Refresh selected job if it's the one being recovered
                if (selectedJob && (selectedJob.job_id === jobId || selectedJob.id === jobId)) {
                    await fetchJobDetails(jobId);
                }
            } else {
                // Mark recovery as attempted and failed
                setJobs(prevJobs => prevJobs.map(j => {
                    if ((j.job_id || j.id) === jobId) {
                        return { 
                            ...j, 
                            recovery_attempted: true,
                            recovery_failed: true
                        };
                    }
                    return j;
                }));
                if (!silent) {
                    // Parse error message from result
                    const reason = result.reason || result.message || 'Unknown error';
                    const jobAge = result.job_age_hours ? `${result.job_age_hours.toFixed(1)} hours` : '';
                    const maxAge = result.max_age_hours ? `${result.max_age_hours} hours` : '7.0 hours';
                    
                    setRecoveryError({
                        title: 'Recovery Not Available',
                        message: reason,
                        details: jobAge ? `Job age: ${jobAge}. Maximum age for recovery: ${maxAge}.` : undefined,
                    });
                } else {
                    console.warn(`[Auto-Recovery] Job ${jobId} recovery failed:`, result.message);
                }
            }
        } catch (err: any) {
            // Mark recovery as attempted and failed on exception
            setJobs(prevJobs => prevJobs.map(j => {
                if ((j.job_id || j.id) === jobId) {
                    return { 
                        ...j, 
                        recovery_attempted: true,
                        recovery_failed: true
                    };
                }
                return j;
            }));
            console.error("Error recovering job:", err);
            if (!silent) {
                let errorMessage = "An unknown error occurred.";
                let errorDetails: string | undefined;
                let title = 'Recovery Not Available';
                
                // Handle different error formats
                if (err && typeof err === 'object') {
                    // Special handling for process_running flag
                    if (err.process_running === true) {
                        title = 'Recovery Not Available';
                        errorMessage = 'Job process is still running. Cannot recover an active job.';
                        errorDetails = err.reason || `The job process is actively running (age: ${err.age_hours || 'unknown'} hours). Recovery is only available for jobs where the process has stopped but the database still shows them as running (dangling jobs).`;
                    }
                    // Direct error object from API
                    else if (err.reason || err.message) {
                        errorMessage = err.reason || err.message;
                        const jobAge = err.job_age_hours ? `${parseFloat(err.job_age_hours).toFixed(1)} hours` : '';
                        const maxAge = err.max_age_hours ? `${err.max_age_hours} hours` : '7.0 hours';
                        
                        if (jobAge) {
                            errorDetails = `This job has been running for ${jobAge}. Recovery is only available for jobs that have been running for at least ${maxAge}.`;
                        } else if (err.reason) {
                            // Extract time information from reason if available
                            const timeMatch = err.reason.match(/(\d+\.?\d*)\s*hours?/);
                            if (timeMatch) {
                                errorDetails = `The job needs to be running for at least ${maxAge} before it can be recovered.`;
                            }
                        }
                        
                        // Determine title based on error type
                        if (err.recoverable === false || err.reason?.includes('not recoverable') || err.reason?.includes('within normal processing time') || err.reason?.includes('still running')) {
                            title = 'Recovery Not Available';
                        } else {
                            title = 'Recovery Error';
                        }
                    } else if (err.error) {
                        // Error wrapped in error field
                        if (typeof err.error === 'string') {
                            // Check if it's a nested JSON string
                            try {
                                const jsonMatch = err.error.match(/\{.*\}/);
                                if (jsonMatch) {
                                    const nestedError = JSON.parse(jsonMatch[0]);
                                    errorMessage = nestedError.reason || nestedError.message || nestedError.error || err.error;
                                    if (nestedError.reason?.includes('within normal processing time')) {
                                        title = 'Recovery Not Available';
                                        const timeMatch = nestedError.reason.match(/(\d+\.?\d*)\s*hours?/);
                                        const maxMatch = nestedError.reason.match(/Maximum age.*?(\d+\.?\d*)\s*hours?/);
                                        if (timeMatch && maxMatch) {
                                            errorDetails = `This job has been running for ${timeMatch[1]} hours. Recovery is only available for jobs that have been running for at least ${maxMatch[1]} hours.`;
                                        }
                                    }
                                } else {
                                    errorMessage = err.error;
                                }
                            } catch {
                                errorMessage = err.error;
                            }
                        } else {
                            errorMessage = JSON.stringify(err.error);
                        }
                    } else {
                        errorMessage = err.message || JSON.stringify(err);
                    }
                } else if (err instanceof Error) {
                    errorMessage = err.message;
                }
                
                setRecoveryError({
                    title,
                    message: errorMessage,
                    details: errorDetails,
                });
            }
        } finally {
            setRecovering(prev => ({ ...prev, [jobId]: false }));
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
                    onClick={() => fetchJobs(false)}
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
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                                                    {jobId.substring(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {(() => {
                                                        const normalizedStatus = getNormalizedStatus(job);
                                                        
                                                        // Check if job is actively processing (has current activity indicators)
                                                        const hasActiveProcessing = job.current_file || 
                                                            job.stage_description || 
                                                            job.status_message ||
                                                            (job.processing_history && job.processing_history.length > 0);
                                                        
                                                        // Show "stuck" only if:
                                                        // 1. Status is "running" from backend
                                                        // 2. We've checked recoverability (recoverable_checked === true)
                                                        // 3. Process is NOT running (process_running === false) - explicitly false, not undefined
                                                        // 4. Not recoverable (is_recoverable === false)
                                                        // 5. AND there's NO active processing indicators
                                                        // 6. AND we've had time to fetch details (to avoid showing stuck before details are loaded)
                                                        // If process_running is undefined, we haven't checked yet, so don't show stuck
                                                        // If there's active processing, always show the actual status (running)
                                                        const shouldShowStuck = normalizedStatus === 'running' &&
                                                            job.recoverable_checked &&
                                                            job.is_recoverable === false &&
                                                            !job.unrecoverable &&
                                                            job.process_running === false && // Explicitly false, not undefined
                                                            !hasActiveProcessing;
                                                        
                                                        if (shouldShowStuck) {
                                                            return (
                                                                <span className={`text-sm font-medium capitalize ${getStatusColor('error')}`}>
                                                                    Stuck
                                                </span>
                                                            );
                                                        }
                                                        
                                                        // Always show the actual normalized status from backend
                                                        return (
                                                            <span className={`text-sm font-medium capitalize ${getStatusColor(normalizedStatus)}`}>
                                                                {normalizedStatus}
                                                            </span>
                                                        );
                                                    })()}
                                                    {/* Only show "Not Recoverable" if recovery was attempted and failed */}
                                                    {job.recovery_attempted && job.recovery_failed && (
                                                        <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded" title="Recovery was attempted but failed">
                                                            Not Recoverable
                                                        </span>
                                                    )}
                                                    {job.process_running && job.recoverable_checked && (
                                                        <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded" title="Job process is still running">
                                                            Process Running
                                                        </span>
                                                    )}
                                                    {job.unrecoverable && (
                                                        <span className="text-xs px-2 py-0.5 bg-red-200 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded" title={job.unrecoverable_reason || "Job is marked as unrecoverable"}>
                                                            Unrecoverable
                                                        </span>
                                                    )}
                                                    {shouldShowRecovery(job) && getJobAgeHours(job) >= 7 && (
                                                        <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded" title="Will be automatically recovered">
                                                            Auto-Recover
                                                        </span>
                                                    )}
                                                    {checkingRecoverable[jobId] && (
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">Checking...</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2" style={{ minWidth: '100px', maxWidth: '200px' }}>
                                                    {(() => {
                                                        const normalizedStatus = getNormalizedStatus(job);
                                                        return (
                                                            <>
                                                        <div 
                                                            className={`h-2 rounded-full transition-all ${
                                                                        normalizedStatus === 'done' ? 'bg-green-600' :
                                                                        normalizedStatus === 'partial' ? 'bg-yellow-600' :
                                                                        normalizedStatus === 'failed' || normalizedStatus === 'error' ? 'bg-red-600' :
                                                                        normalizedStatus === 'running' ? 'bg-blue-600' :
                                                                        'bg-gray-400'
                                                            }`}
                                                            style={{ width: `${Math.min(100, progress)}%` }}
                                                        ></div>
                                                            </>
                                                        );
                                                    })()}
                                                    </div>
                                                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                    {progress}% ({processedFiles} / {totalFiles})
                                                    </span>
                                                </div>
                                            {(() => {
                                                const normalizedStatus = getNormalizedStatus(job);
                                                return (
                                                    <>
                                                        {job.current_file && normalizedStatus === 'running' && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words" title={job.current_file}>
                                                                📄 {job.current_file.split('/').pop() || job.current_file}
                                                </div>
                                                        )}
                                                        {(job.stage_description || job.status_message) && normalizedStatus === 'running' && (
                                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 break-words">
                                                                {job.stage_description || job.status_message}
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-500 dark:text-gray-400 break-words">
                                                    {formatDate(job.start_time || job.startTime || job.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fetchJobDetails(jobId);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    View Details
                                                </button>
                                                    {shouldShowRecovery(job) && !job.unrecoverable && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const jobInfo = `Job ${jobId.substring(0, 8)}... (${status} status)`;
                                                                setRecoveryConfirm({ jobId, jobInfo });
                                                            }}
                                                            disabled={!!recovering[jobId]}
                                                            className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                                            title={getJobAgeHours(job) >= 7 ? 'This job will be automatically recovered' : 'Recover stuck job'}
                                                        >
                                                            {recovering[jobId] === 'checking' ? 'Checking...' :
                                                             recovering[jobId] === 'recovering' ? 'Recovering...' :
                                                             'Recover'}
                                                        </button>
                                                    )}
                                                    {job.unrecoverable && (
                                                        <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded" title={job.unrecoverable_reason || 'Job is marked as unrecoverable'}>
                                                            Unrecoverable
                                                        </span>
                                                    )}
                                                </div>
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
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[85vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold dark:text-white">Job Details</h2>
                                <div className="flex items-center gap-3">
                                    {checkingRecoverable[selectedJob.job_id || selectedJob.id || ''] && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Checking recoverable status...</span>
                                    )}
                                    {selectedJob.recovery_attempted && selectedJob.recovery_failed && (
                                        <span className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded" title="Recovery was attempted but failed">
                                            Not Recoverable
                                        </span>
                                    )}
                                    {selectedJob.process_running && selectedJob.recoverable_checked && (
                                        <span className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded" title="Job process is still running">
                                            Process Running
                                        </span>
                                    )}
                                    {selectedJob.unrecoverable && (
                                        <span className="text-xs px-3 py-1 bg-red-200 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded" title={selectedJob.unrecoverable_reason || "Job is marked as unrecoverable"}>
                                            Unrecoverable
                                        </span>
                                    )}
                                    {selectedJob.recoverable_checked && selectedJob.is_recoverable === true && (
                                        <span className="text-xs px-3 py-1 bg-green-200 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                                            Recoverable
                                        </span>
                                    )}
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
                        </div>
                        <div className="flex-1 overflow-hidden flex">
                            {/* Left Column - Job Information */}
                            <div className="flex-1 p-6 space-y-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700 min-w-0">
                            {/* Current Status Section */}
                            {(selectedJob.current_file || selectedJob.status === 'running' || selectedJob.current_stage) && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                    <h3 className="text-lg font-semibold mb-3 dark:text-white">Current Status</h3>
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{getStageIcon(selectedJob.current_stage)}</span>
                                        <div className="flex-1">
                                            {selectedJob.current_file && (
                                                <div className="mb-2">
                                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current File: </span>
                                                    <span className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                                                        {selectedJob.current_file}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="mb-2">
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Stage: </span>
                                                <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">
                                                    {selectedJob.stage_description || selectedJob.current_stage || 'N/A'}
                                                </span>
                                            </div>
                                            {selectedJob.status_message && (
                                                <div className="mt-2">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                        {selectedJob.status_message}
                                                    </span>
                                                </div>
                                            )}
                                            {(selectedJob.elapsed_seconds !== undefined || selectedJob.estimated_remaining_seconds !== undefined) && (
                                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                    {selectedJob.elapsed_seconds !== undefined && (
                                                        <span>Elapsed: {formatTime(selectedJob.elapsed_seconds)}</span>
                                                    )}
                                                    {selectedJob.estimated_remaining_seconds !== undefined && (
                                                        <span className="ml-3">Remaining: ~{formatTime(selectedJob.estimated_remaining_seconds)}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Basic Job Information */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4 dark:text-white">Basic Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Job ID</label>
                                        <p className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                                            {selectedJob.job_id || selectedJob.id || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                                        {(() => {
                                            const normalizedStatus = getNormalizedStatus(selectedJob);
                                            
                                            // Check if job is actively processing (has current activity indicators)
                                            const hasActiveProcessing = selectedJob.current_file || 
                                                selectedJob.stage_description || 
                                                selectedJob.status_message ||
                                                (selectedJob.processing_history && selectedJob.processing_history.length > 0);
                                            
                                            // Show "stuck" only if:
                                            // 1. Status is "running" from backend
                                            // 2. We've checked recoverability (recoverable_checked === true)
                                            // 3. Process is NOT running (process_running === false) - explicitly false, not undefined
                                            // 4. Not recoverable (is_recoverable === false)
                                            // 5. AND there's NO active processing indicators
                                            // If process_running is undefined, we haven't checked yet, so don't show stuck
                                            // If there's active processing, always show the actual status (running)
                                            const shouldShowStuck = normalizedStatus === 'running' &&
                                                selectedJob.recoverable_checked &&
                                                selectedJob.is_recoverable === false &&
                                                !selectedJob.unrecoverable &&
                                                selectedJob.process_running === false && // Explicitly false, not undefined
                                                !hasActiveProcessing;
                                            
                                            const displayStatus = shouldShowStuck ? 'stuck' : normalizedStatus;
                                            
                                            return (
                                                <p className={`mt-1 text-sm font-medium capitalize ${getStatusColor(displayStatus)}`}>
                                                    {displayStatus}
                                                </p>
                                            );
                                        })()}
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
                                                        (() => {
                                                            const normalizedStatus = getNormalizedStatus(selectedJob);
                                                            return normalizedStatus === 'done' ? 'bg-green-600' :
                                                                   normalizedStatus === 'partial' ? 'bg-yellow-600' :
                                                                   normalizedStatus === 'failed' || normalizedStatus === 'error' ? 'bg-red-600' :
                                                                   normalizedStatus === 'running' ? 'bg-blue-600' :
                                                                   'bg-gray-400';
                                                        })()
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

                                    </div>
                            
                            {/* Right Column - Processing History Live Feed */}
                            {selectedJob.processing_history && selectedJob.processing_history.length > 0 ? (
                                <div className="w-96 flex-shrink-0 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 border-l border-gray-200 dark:border-gray-700">
                                    <div className="sticky top-0 bg-gray-50 dark:bg-gray-900/50 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700 z-10">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-semibold dark:text-white">Live Processing Feed</h3>
                                            {(() => {
                                                const normalizedStatus = getNormalizedStatus(selectedJob);
                                                const isLive = normalizedStatus === 'running';
                                                return (
                                                    <span className={`text-xs px-2 py-1 rounded ${isLive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 animate-pulse' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                                        {isLive ? '● Live' : '● Complete'}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {selectedJob.processing_history.length} {selectedJob.processing_history.length === 1 ? 'entry' : 'entries'}
                                            </p>
                                            {(() => {
                                                const normalizedStatus = getNormalizedStatus(selectedJob);
                                                if (normalizedStatus === 'running' && selectedJob.processed_files !== undefined && selectedJob.total_files !== undefined) {
                                                    return (
                                                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                                            {selectedJob.processed_files} / {selectedJob.total_files} files
                                                        </p>
                                                    );
                                                }
                                                return null;
                                            })()}
                                    </div>
                                </div>
                                    <div className="space-y-3" id="processing-feed-container">
                                        {/* Sort by timestamp (most recent first) - Live feed style */}
                                        {[...selectedJob.processing_history]
                                            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                                            .map((entry, index) => {
                                                const stageColors: Record<string, string> = {
                                                    completed: 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500',
                                                    uploading: 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500',
                                                    attaching_provenance: 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500',
                                                    processing: 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500',
                                                    failed: 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500',
                                                    error: 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500',
                                                };
                                                const stageColor = stageColors[entry.stage || ''] || 'bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-400';
                                                
                                                // Calculate relative time
                                                const now = Date.now() / 1000;
                                                const entryTime = entry.timestamp || 0;
                                                const secondsAgo = now - entryTime;
                                                const timeAgo = secondsAgo < 60 ? `${Math.floor(secondsAgo)}s ago` :
                                                                 secondsAgo < 3600 ? `${Math.floor(secondsAgo / 60)}m ago` :
                                                                 `${Math.floor(secondsAgo / 3600)}h ago`;
                                                
                                                return (
                                                    <div 
                                                        key={index} 
                                                        className={`p-3 rounded-lg ${stageColor} transition-all hover:shadow-sm ${index === 0 ? 'ring-2 ring-blue-400' : ''}`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <div className="flex-shrink-0 mt-0.5">
                                                                <span className="text-xl">{getStageIcon(entry.stage)}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                {/* Header: Time ago and Stage */}
                                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                                        {timeAgo}
                                                                    </span>
                                                                    {entry.stage && (
                                                                        <span className="text-xs px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded font-medium capitalize">
                                                                            {entry.stage.replace('_', ' ')}
                                                                        </span>
                                                                    )}
                                                                    {(entry.file_index !== undefined && entry.total_files !== undefined) && (
                                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                            ({entry.file_index + 1}/{entry.total_files})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* File Name */}
                                                                {entry.file_name && (
                                                                    <div className="mb-1.5">
                                                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">
                                                                            {entry.file_name}
                                                                        </span>
                                </div>
                            )}
                                                                
                                                                {/* Status Message */}
                                                                {entry.status_message && (
                                                                    <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                                                        {entry.status_message}
                                </div>
                            )}
                        </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            ) : (
                                // Empty state when no processing history
                                <div className="w-96 flex-shrink-0 p-6 bg-gray-50 dark:bg-gray-900/50 border-l border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No processing history available</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                {shouldShowRecovery(selectedJob) && !selectedJob.unrecoverable && (
                                    <button
                                        onClick={() => {
                                            const jobId = selectedJob.job_id || selectedJob.id;
                                            if (jobId) {
                                                const normalizedStatus = getNormalizedStatus(selectedJob);
                                                const jobInfo = `Job ${jobId.substring(0, 8)}... (${normalizedStatus} status)`;
                                                setRecoveryConfirm({ jobId, jobInfo });
                                            }
                                        }}
                                        disabled={!!recovering[selectedJob.job_id || selectedJob.id || '']}
                                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                        title={getJobAgeHours(selectedJob) >= 7 ? 'This job will be automatically recovered' : 'Recover stuck job'}
                                    >
                                        {recovering[selectedJob.job_id || selectedJob.id || ''] === 'checking' ? 'Checking...' :
                                         recovering[selectedJob.job_id || selectedJob.id || ''] === 'recovering' ? 'Recovering...' :
                                         'Recover Job'}
                                    </button>
                                )}
                                {selectedJob.unrecoverable && (
                                    <span className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm" title={selectedJob.unrecoverable_reason || 'Job is marked as unrecoverable'}>
                                        Unrecoverable
                                    </span>
                                )}
                            </div>
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

            {/* Recovery Confirmation Popup */}
            {recoveryConfirm && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
                    onClick={() => setRecoveryConfirm(null)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
                                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                                    Confirm Job Recovery
                                </h3>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                    Are you sure you want to recover/retry this job? This will mark it as recovered if it was stuck.
                                </p>
                                {recoveryConfirm.jobInfo && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded font-mono">
                                        {recoveryConfirm.jobInfo}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setRecoveryConfirm(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                onClick={() => setRecoveryConfirm(null)}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const jobId = recoveryConfirm.jobId;
                                    setRecoveryConfirm(null);
                                    await handleRecoverJob(jobId, false);
                                }}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                            >
                                Confirm Recovery
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recovery Error/Success Popup */}
            {recoveryError && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
                    onClick={() => setRecoveryError(null)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                recoveryError.title === 'Recovery Successful' 
                                    ? 'bg-green-100 dark:bg-green-900/30' 
                                    : recoveryError.title === 'Recovery Not Available'
                                    ? 'bg-orange-100 dark:bg-orange-900/30'
                                    : 'bg-red-100 dark:bg-red-900/30'
                            }`}>
                                {recoveryError.title === 'Recovery Successful' ? (
                                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : recoveryError.title === 'Recovery Not Available' ? (
                                    <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className={`text-lg font-semibold mb-3 ${
                                    recoveryError.title === 'Recovery Successful' 
                                        ? 'text-green-800 dark:text-green-300' 
                                        : recoveryError.title === 'Recovery Not Available'
                                        ? 'text-orange-800 dark:text-orange-300'
                                        : 'text-red-800 dark:text-red-300'
                                }`}>
                                    {recoveryError.title}
                                </h3>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                                    {recoveryError.message}
                                </p>
                                {recoveryError.details && (
                                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-1">ℹ️ Additional Information:</p>
                                        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                                            {recoveryError.details}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setRecoveryError(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setRecoveryError(null)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    recoveryError.title === 'Recovery Successful'
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

