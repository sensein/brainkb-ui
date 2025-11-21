"use client";

import { FileText, Link as LinkIcon, Type } from "lucide-react";

export type InputType = 'doi' | 'pdf' | 'text';

interface InputTypeSelectorProps {
    selectedInputType: InputType;
    onInputTypeChange: (type: InputType) => void;
    disabled?: boolean;
}

export default function InputTypeSelector({ 
    selectedInputType, 
    onInputTypeChange,
    disabled = false 
}: InputTypeSelectorProps) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">
                Select Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    type="button"
                    onClick={() => onInputTypeChange('doi')}
                    disabled={disabled}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center space-y-2 group ${
                        selectedInputType === 'doi'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                    onClick={() => onInputTypeChange('pdf')}
                    disabled={disabled}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center space-y-2 group ${
                        selectedInputType === 'pdf'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                    onClick={() => onInputTypeChange('text')}
                    disabled={disabled}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center space-y-2 group ${
                        selectedInputType === 'text'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
    );
}

