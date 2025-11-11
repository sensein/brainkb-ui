import { useState, useCallback, useRef } from 'react';
import { sanitizeErrorMessage } from './errorUtils';

/**
 * Status types for SSE stream processing
 */
export type SseStatus = 'idle' | 'connecting' | 'connected' | 'processing' | 'error' | 'done';

/**
 * Options for the SSE stream hook
 */
export interface UseSseStreamOptions {
    /**
     * Callback function that creates the FormData to send in the request.
     * Should include endpoint, clientId, and any other required fields.
     */
    createFormData: () => FormData;
    
    /**
     * Optional callback for status updates
     */
    onStatusChange?: (status: SseStatus) => void;
    
    /**
     * Optional callback for error updates
     */
    onError?: (error: string) => void;
}

/**
 * Return type for the useSseStream hook
 */
export interface UseSseStreamReturn {
    /**
     * The final result from the SSE stream
     */
    result: any;
    
    /**
     * Error message if processing failed
     */
    error: string | null;
    
    /**
     * Current status of the stream
     */
    status: SseStatus;
    
    /**
     * Whether the stream is currently being processed
     */
    isLoading: boolean;
    
    /**
     * Function to start processing the SSE stream
     */
    processStream: () => Promise<void>;
    
    /**
     * Function to reset the stream state
     */
    reset: () => void;
}

/**
 * Custom hook for handling Server-Sent Events (SSE) streams.
 * 
 * This hook encapsulates the logic for:
 * - Making the initial request to /api/ws-connection
 * - Reading the SSE stream
 * - Parsing events and managing status
 * - Handling errors and extracting results
 * 
 * @param options - Configuration options for the SSE stream
 * @returns Object containing result, error, status, isLoading, processStream, and reset
 * 
 * @example
 * const { result, error, status, isLoading, processStream, reset } = useSseStream({
 *   createFormData: () => {
 *     const formData = new FormData();
 *     formData.append('endpoint', endpoint);
 *     formData.append('clientId', clientId);
 *     // ... other fields
 *     return formData;
 *   },
 *   onStatusChange: (status) => setCurrentStatus(status),
 *   onError: (error) => setError(error)
 * });
 */
export function useSseStream(options: UseSseStreamOptions): UseSseStreamReturn {
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<SseStatus>('idle');
    const [isLoading, setIsLoading] = useState(false);
    
    // Use ref to always have the latest options without recreating the callback
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const processStream = useCallback(async () => {
        const opts = optionsRef.current;
        try {
            // Reset state
            setResult(null);
            setError(null);
            setStatus('connecting');
            setIsLoading(true);
            opts.onStatusChange?.('connecting');

            // Create form data
            const formData = opts.createFormData();

            // Make request to WebSocket connection endpoint
            const response = await fetch("/api/ws-connection", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMsg = errorData.error || `Error: ${response.status}`;
                const sanitizedError = sanitizeErrorMessage(errorMsg);
                setError(sanitizedError);
                setStatus('error');
                setIsLoading(false);
                opts.onError?.(sanitizedError);
                opts.onStatusChange?.('error');
                return;
            }

            // Read Server-Sent Events stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let streamResult: any = null;
            let buffer = '';
            let hasError = false;
            let streamErrorMessage = '';

            if (!reader) {
                throw new Error('Failed to get response stream');
            }

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

                            if (data.type === 'connected') {
                                setStatus('connected');
                                opts.onStatusChange?.('connected');
                            } else if (data.type === 'task_created') {
                                setStatus('processing');
                                opts.onStatusChange?.('processing');
                            } else if (data.type === 'status' || data.type === 'job_update') {
                                const eventStatus = data.status;
                                if (eventStatus === 'processing' || eventStatus === 'running' || eventStatus === 'pending') {
                                    setStatus('processing');
                                    opts.onStatusChange?.('processing');
                                } else if (eventStatus === 'failed' || eventStatus === 'error') {
                                    // Handle failed status
                                    hasError = true;
                                    
                                    // Try multiple possible error fields - check nested data first (data.data.error because job_update is wrapped)
                                    const rawError = data.data?.error || data.error || data.data?.message || data.message || data.error_message || 'Task failed. Please try again.';
                                    streamErrorMessage = sanitizeErrorMessage(rawError);
                                    setError(streamErrorMessage);
                                    setStatus('error');
                                    setIsLoading(false);
                                    opts.onError?.(streamErrorMessage);
                                    opts.onStatusChange?.('error');
                                    console.error('Task failed:', data);
                                } else if (eventStatus === 'completed' || eventStatus === 'done' || eventStatus === 'finished' || eventStatus === 'success') {
                                    // Check if status is completed but result is null (indicates failure)
                                    if (data.result === null || (data.data === null && !data.result)) {
                                        hasError = true;
                                        streamErrorMessage = 'Agent couldn\'t complete task, likely LLM auth failed. Please check your API key and try again.';
                                        setError(streamErrorMessage);
                                        setStatus('error');
                                        setIsLoading(false);
                                        opts.onError?.(streamErrorMessage);
                                        opts.onStatusChange?.('error');
                                        console.error('Task completed with null result:', data);
                                    } else {
                                        // Status indicates completion, but wait for result data
                                        setStatus('processing');
                                        opts.onStatusChange?.('processing');
                                        // If there's data in the status message, treat as result
                                        if (data.data) {
                                            streamResult = data.data;
                                        } else if (data.result) {
                                            streamResult = data.result;
                                        }
                                    }
                                }
                            } else if (data.type === 'progress') {
                                setStatus('processing');
                                opts.onStatusChange?.('processing');
                            } else if (data.type === 'result') {
                                streamResult = data.data;
                                setStatus('processing');
                                opts.onStatusChange?.('processing');
                            } else if (data.type === 'message') {
                                // Handle generic messages - check if they contain result data
                                if (data.data) {
                                    const msgData = data.data;
                                    // Check if this message contains result data
                                    if (msgData.data || msgData.result || (msgData.status && (msgData.status === 'completed' || msgData.status === 'done'))) {
                                        streamResult = msgData.data || msgData.result || msgData;
                                    }
                                }
                            } else if (data.type === 'error') {
                                hasError = true;
                                const rawError = data.error || 'Processing error';
                                streamErrorMessage = sanitizeErrorMessage(rawError);
                                setError(streamErrorMessage);
                                setStatus('error');
                                setIsLoading(false);
                                opts.onError?.(streamErrorMessage);
                                opts.onStatusChange?.('error');
                                console.error('SSE error:', streamErrorMessage);
                                // Don't break here, wait for 'done' event
                            } else if (data.type === 'done') {
                                break;
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }

            // If there was an error, set it and return early
            if (hasError) {
                setError(streamErrorMessage || 'An error occurred during processing.');
                setStatus('error');
                setIsLoading(false);
                opts.onError?.(streamErrorMessage || 'An error occurred during processing.');
                opts.onStatusChange?.('error');
                return;
            }

            // Set the final result
            setResult(streamResult);
            setStatus('done');
            setIsLoading(false);
            opts.onStatusChange?.('done');

        } catch (err) {
            console.error("Error processing SSE stream:", err);
            const rawErrorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            const sanitizedError = sanitizeErrorMessage(rawErrorMessage);
            const finalError = `Failed to process stream: ${sanitizedError}`;
            setError(finalError);
            setStatus('error');
            setIsLoading(false);
            opts.onError?.(finalError);
            opts.onStatusChange?.('error');
        }
    }, []);

    const reset = useCallback(() => {
        setResult(null);
        setError(null);
        setStatus('idle');
        setIsLoading(false);
        optionsRef.current.onStatusChange?.('idle');
    }, []);

    return {
        result,
        error,
        status,
        isLoading,
        processStream,
        reset,
    };
}

