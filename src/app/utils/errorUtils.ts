/**
 * Utility functions for sanitizing and formatting error messages.
 * Removes URLs and provides user-friendly error messages for common scenarios.
 */

/**
 * Sanitizes error messages by removing URLs and providing user-friendly messages.
 * 
 * @param message - The raw error message to sanitize
 * @returns A sanitized, user-friendly error message
 * 
 * @example
 * sanitizeErrorMessage("500 Server Error: Internal Server Error for url: https://api.example.com/api/document/pdf")
 * // Returns: "External service down, unable to extract text from PDF. Please try again later."
 */
export function sanitizeErrorMessage(message: string): string {
    if (!message) return message;
    
    const lowerMessage = message.toLowerCase();
    
    // Check for 500 Server Error related to PDF/document extraction
    // Check for various patterns: 500 error, server error, pdf/document related
    if ((lowerMessage.includes('500') || lowerMessage.includes('server error')) && 
        (lowerMessage.includes('pdf') || lowerMessage.includes('document') || lowerMessage.includes('fylogenesis'))) {
        return 'External service down, unable to extract text from PDF. Please try again later.';
    }
    
    // Remove URLs (http://, https://, or any URL pattern)
    let sanitized = message.replace(/https?:\/\/[^\s]+/gi, '').trim();
    
    // Clean up any trailing "for url:" or similar phrases
    sanitized = sanitized.replace(/\s+for\s+url:?\s*$/i, '').trim();
    
    return sanitized;
}

