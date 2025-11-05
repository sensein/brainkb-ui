"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Database, FileText, Upload, Brain } from "lucide-react";


export default function Dashboard() {
    const { data: session } = useSession();
    const router = useRouter();

    // Redirect if not logged in
    useEffect(() => {
        if (session === null) {
            router.push("/");
        }
    }, [session, router]);

    const tasks = [
        {
            title: "Ingest KGs",
            description: "Upload Knowledge Graph files in JSON-LD or Turtle format to a specified named graph",
            icon: Database,
            href: "/user/dashboard",
            color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        },
        {
            title: "NER Extraction",
            description: "Extract Neuroscience Named Entities from text using multi-agent systems",
            icon: Brain,
            href: "/user/sie",
            color: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        },
        {
            title: "Resource Extraction",
            description: "Extract structured resources from unstructured sources and documents",
            icon: FileText,
            href: "/user/ingest-structured-resource",
            color: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
        },
        {
            title: "Pdf2Reproschema",
            description: "Convert PDF documents to Reproschema format using multi-agent extraction",
            icon: Upload,
            href: "/user/dashboard",
            color: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
        }
    ];

    return (
        <div className="flex flex-col max-w-6xl mx-auto p-4">
            <h1 className="text-3xl font-bold mb-4 dark:text-white">Welcome to Your Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                Access various tools and perform different tasks. You can navigate using the sidebar menu on the left or click on the task cards below to get started.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {tasks.map((task, index) => {
                    const Icon = task.icon;
                    return (
                        <Link
                            key={index}
                            href={task.href}
                            className={`block p-6 rounded-lg border-2 ${task.color} hover:shadow-lg transition-all duration-200 group`}
                        >
                            <div className="flex items-start space-x-4">
                                <div className={`p-3 rounded-lg bg-white dark:bg-gray-800 group-hover:scale-110 transition-transform duration-200`}>
                                    <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {task.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                        {task.description}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
