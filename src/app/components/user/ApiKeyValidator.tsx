"use client";

// UI Component for API Key Validation
// This component receives state and handlers from the useApiKeyValidator hook
export function ApiKeyValidatorUI({ 
    apiKey, 
    onApiKeyChange,
    isApiKeyValid,
    isValidatingKey,
    apiKeyError,
    successMessage,
    onValidate,
    onClear,
    warningMessage
}: {
    apiKey: string;
    onApiKeyChange: (key: string) => void;
    isApiKeyValid: boolean;
    isValidatingKey: boolean;
    apiKeyError: string | null;
    successMessage: string | null;
    onValidate: () => void;
    onClear: () => void;
    warningMessage?: string;
}) {
    return (
        <>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">OpenRouter API Key Configuration</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => {
                            onApiKeyChange(e.target.value);
                        }}
                        placeholder="Enter your API key"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                        type="button"
                        onClick={onValidate}
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
                            onClick={onClear}
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
                    <p className="mt-3 text-sm text-green-600 dark:text-green-400">
                        ✓ API key validated successfully. {successMessage || "You can now process documents."}
                    </p>
                )}
            </div>

            {!isApiKeyValid && warningMessage && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ {warningMessage}
                    </p>
                </div>
            )}
        </>
    );
}

