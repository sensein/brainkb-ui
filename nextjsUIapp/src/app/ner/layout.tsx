"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
interface LayoutProps {
    children: ReactNode;
}

export default function NERLayout({ children }: LayoutProps) {
    const pathname = usePathname();

    // Determine if a nav link is active
    const isActive = (path: string) => {
        if (path === "/ner" && pathname === "/ner") {
            return true;
        }
        if (path === "/ner/entity" && pathname.startsWith("/ner/entity")) {
            return true;
        }
        return false;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 set-margin-hundred">
            <main className="py-6">
                {children}
            </main>


        </div>
    );
}
