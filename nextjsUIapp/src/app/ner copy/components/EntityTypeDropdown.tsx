"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { fetchEntityData } from "@/src/app/ner/services/dataService";
export default function EntityTypeDropdown() {
    const [entityTypes, setEntityTypes] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchTypes = async () => {
            setIsLoading(true);
            try {
                const data = await fetchEntityData();
                setEntityTypes(Object.keys(data.entities));
            } catch (err) {
                console.error("Error fetching entity types:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTypes();
    }, []);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:bg-gray-100 dark:active:bg-gray-800 transition ease-in-out duration-150"
            >
                Entity Types
                <svg className="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg">
                    <div className="rounded-md bg-white dark:bg-gray-800 shadow-xs">
                        <div className="py-1">
                            {isLoading ? (
                                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                    Loading entity types...
                                </div>
                            ) : entityTypes.length > 0 ? (
                                entityTypes.map((type) => (
                                    <Link
                                        key={type}
                                        href={`/ner/entity/${type}`}
                                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {type}
                                    </Link>
                                ))
                            ) : (
                                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                    No entity types found
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}