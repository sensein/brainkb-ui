"use client";

import { useState, useEffect } from "react";

interface UseApiKeyValidatorOptions {
    storageKey?: string;
    initialKey?: string;
}

export function useApiKeyValidator(options: UseApiKeyValidatorOptions = {}) {
    const { storageKey, initialKey } = options;
    const [apiKey, setApiKey] = useState<string>(initialKey || '');
    const [isApiKeyValid, setIsApiKeyValid] = useState<boolean>(false);
    const [isValidatingKey, setIsValidatingKey] = useState<boolean>(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Load from sessionStorage on mount if storageKey provided
    useEffect(() => {
        if (storageKey && typeof window !== 'undefined') {
            const storedKey = sessionStorage.getItem(storageKey);
            if (storedKey) {
                setApiKey(storedKey);
            }
        }
    }, [storageKey]);

    const validateApiKey = async () => {
        if (!apiKey.trim()) {
            setApiKeyError("Please enter an API key.");
            setIsApiKeyValid(false);
            return;
        }

        setIsValidatingKey(true);
        setApiKeyError(null);
        setSuccessMessage(null);

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
                
                // Store in sessionStorage if key provided
                if (storageKey && typeof window !== 'undefined') {
                    sessionStorage.setItem(storageKey, apiKey.trim());
                }
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

    const handleApiKeyChange = (key: string) => {
        setApiKey(key);
        setIsApiKeyValid(false);
        setApiKeyError(null);
        setSuccessMessage(null);
    };

    const handleClear = () => {
        setApiKey('');
        setIsApiKeyValid(false);
        setApiKeyError(null);
        setSuccessMessage(null);
        
        if (storageKey && typeof window !== 'undefined') {
            sessionStorage.removeItem(storageKey);
        }
    };

    return {
        apiKey,
        isApiKeyValid,
        isValidatingKey,
        apiKeyError,
        successMessage,
        setApiKey: handleApiKeyChange,
        validateApiKey,
        handleClear
    };
}

