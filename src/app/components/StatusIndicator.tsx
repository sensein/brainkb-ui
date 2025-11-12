"use client";

import React from 'react';

export type StatusType = 'idle' | 'connecting' | 'connected' | 'processing' | 'done' | 'error';

interface StatusIndicatorProps {
    status: StatusType;
    label: string;
    isActive?: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, label, isActive = false }) => {
    const getStatusIcon = () => {
        switch (status) {
            case 'idle':
                return (
                    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                        <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" fill="none" className="text-gray-400" />
                        <circle cx="10" cy="10" r="2" fill="currentColor" className="text-gray-400" />
                    </svg>
                );
            case 'connecting':
                return (
                    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="4 4" className="text-orange-500" />
                        <circle cx="10" cy="10" r="3" fill="currentColor" className="text-orange-500" />
                    </svg>
                );
            case 'connected':
                return (
                    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-green-500" />
                        <path d="M6 10l2 2 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-green-500" />
                    </svg>
                );
            case 'processing':
                return (
                    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-purple-500" />
                        <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500" />
                    </svg>
                );
            case 'done':
                return (
                    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-green-500" />
                        <path d="M6 10l2 2 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-green-500" />
                    </svg>
                );
            case 'error':
                return (
                    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-red-500" />
                        <path d="M10 7v4M10 13h.01" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" className="text-red-500" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'idle':
                return 'text-gray-400';
            case 'connecting':
                return 'text-orange-500';
            case 'connected':
                return 'text-green-500';
            case 'processing':
                return 'text-purple-500';
            case 'done':
                return 'text-green-500';
            case 'error':
                return 'text-red-500';
            default:
                return 'text-gray-400';
        }
    };

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            isActive 
                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 shadow-sm animate-pulse' 
                : ''
        }`}>
            <div className={`flex items-center justify-center ${getStatusColor()} ${isActive ? 'animate-pulse' : ''}`}>
                {getStatusIcon()}
            </div>
            <span className={`text-sm font-medium ${
                isActive 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-gray-500 dark:text-gray-400'
            }`}>
                {label}
            </span>
        </div>
    );
};

export default StatusIndicator;

