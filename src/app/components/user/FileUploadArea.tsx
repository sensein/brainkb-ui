"use client";

import { useState } from "react";

interface FileUploadAreaProps {
    files: File[];
    onFilesChange: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    disabled?: boolean;
    allowedFileTypes?: string[];
    errorMessage?: string;
}

export default function FileUploadArea({
    files,
    onFilesChange,
    accept = ".pdf",
    multiple = false,
    disabled = false,
    allowedFileTypes = ["pdf"],
    errorMessage
}: FileUploadAreaProps) {
    const [isDragOver, setIsDragOver] = useState<boolean>(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const validateAndSetFiles = (selectedFiles: FileList | File[]) => {
        const fileArray = Array.from(selectedFiles);
        const validFiles: File[] = [];
        const errors: string[] = [];

        for (const file of fileArray) {
            const fileType = file.name.split('.').pop()?.toLowerCase();
            const mimeType = file.type.toLowerCase();
            
            const isValidType = allowedFileTypes.some(type => 
                fileType === type || 
                mimeType.includes(type) ||
                (type === 'pdf' && mimeType === 'application/pdf') ||
                (type === 'txt' && (mimeType === 'text/plain' || file.name.endsWith('.txt')))
            );

            if (isValidType) {
                validFiles.push(file);
            } else {
                errors.push(`${file.name} is not a valid ${allowedFileTypes.join(' or ')} file.`);
            }
        }

        if (errors.length > 0) {
            setLocalError(errors.join(' '));
        } else {
            setLocalError(null);
        }

        if (multiple) {
            onFilesChange(validFiles);
        } else {
            onFilesChange(validFiles.length > 0 ? [validFiles[0]] : []);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            validateAndSetFiles(selectedFiles);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!disabled) {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);

        if (disabled) return;

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            validateAndSetFiles(droppedFiles);
        }
    };

    const fileInputId = `file-upload-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Upload {allowedFileTypes.map(t => t.toUpperCase()).join('/')}
            </label>
            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
                    isDragOver
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    id={fileInputId}
                    onChange={handleFileChange}
                    className="hidden"
                    accept={accept}
                    multiple={multiple}
                    disabled={disabled}
                />
                <label
                    htmlFor={fileInputId}
                    className={`flex flex-col items-center justify-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <svg className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {files.length > 0 
                            ? multiple 
                                ? files.map(file => file.name).join(', ')
                                : files[0]?.name
                            : "Click to select files or drag and drop"
                        }
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {allowedFileTypes.map(t => t.toUpperCase()).join('/')} files only
                    </span>
                </label>
            </div>
            {(localError || errorMessage) && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {localError || errorMessage}
                </p>
            )}
        </div>
    );
}

