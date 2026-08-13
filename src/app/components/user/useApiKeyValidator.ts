"use client";

import { useState, useEffect } from "react";
import { getEffectiveOpenRouterKey } from "@/src/services/api/userManagement";

interface UseApiKeyValidatorOptions {
    storageKey?: string;
    initialKey?: string;
}

/**
 * Shared sessionStorage slot for the user's *personal* OpenRouter API key.
 * Both the dashboard's API key tab and the workflow tools (SIE, Resource
 * extraction) read/write the same slot so a key configured anywhere is
 * reused everywhere.
 *
 * Precedence when calling OpenRouter (see `resolveOpenRouterKey()`):
 *   1. Personal key in sessionStorage (user-set, validated)
 *   2. Shared admin-provided key (fetched from the backend)
 *   3. None — tool shows "API key required"
 */
export const OPENROUTER_API_KEY_STORAGE = "openrouter_api_key";

/**
 * Resolves the effective OpenRouter key for an API call: personal first,
 * then shared, then null. Does not display plaintext anywhere — call sites
 * should send it directly to OpenRouter, never render it.
 */
export async function resolveOpenRouterKey(): Promise<{
    key: string | null;
    source: "personal" | "shared" | "none";
}> {
    if (typeof window !== "undefined") {
        const personal = sessionStorage.getItem(OPENROUTER_API_KEY_STORAGE);
        if (personal && personal.trim()) {
            return { key: personal.trim(), source: "personal" };
        }
    }
    try {
        const eff = await getEffectiveOpenRouterKey();
        if (eff.source === "shared" && eff.api_key) {
            return { key: eff.api_key, source: "shared" };
        }
    } catch {
        /* offline / not signed in — fall through to none */
    }
    return { key: null, source: "none" };
}

export function useApiKeyValidator(options: UseApiKeyValidatorOptions = {}) {
    const { initialKey } = options;
    // Default every caller to the shared slot. Pass a custom storageKey only
    // for genuinely separate keys (none today).
    const storageKey = options.storageKey ?? OPENROUTER_API_KEY_STORAGE;
    const [apiKey, setApiKey] = useState<string>(initialKey || '');
    const [isApiKeyValid, setIsApiKeyValid] = useState<boolean>(false);
    const [isValidatingKey, setIsValidatingKey] = useState<boolean>(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    // Tracks whether the *effective* key (personal OR admin-shared) is
    // available, plus its source so the UI can show the right banner.
    const [sharedKeyStatus, setSharedKeyStatus] = useState<{
        source: "personal" | "shared" | "none";
        last_4: string | null;
    }>({ source: "none", last_4: null });

    // Load personal key from sessionStorage AND check for an admin-shared key.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (storageKey && typeof window !== 'undefined') {
                const storedKey = sessionStorage.getItem(storageKey);
                if (storedKey) {
                    setApiKey(storedKey);
                }
            }
            // Look up the admin-shared key. The browser receives the plaintext
            // from the backend so it can use the key for OpenRouter calls; the
            // dashboard input never displays it.
            try {
                const eff = await getEffectiveOpenRouterKey();
                if (cancelled) return;
                if (eff.source === "shared" && eff.api_key) {
                    setSharedKeyStatus({ source: "shared", last_4: eff.last_4 });
                    // Mark valid so tools that gate on isApiKeyValid don't
                    // block the user when only the shared key is available.
                    if (!sessionStorage.getItem(storageKey)) {
                        setIsApiKeyValid(true);
                    }
                } else {
                    setSharedKeyStatus({ source: "none", last_4: null });
                }
            } catch {
                if (!cancelled) setSharedKeyStatus({ source: "none", last_4: null });
            }
        })();
        return () => { cancelled = true; };
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
        handleClear,
        // `source` tells the UI whether the user is actively using their
        // own key (`personal`), the admin-shared one (`shared`), or has no
        // key at all (`none`). The dashboard banner reads this to render
        // "Using shared admin-provided key — paste your own to override".
        sharedKeyStatus,
    };
}

