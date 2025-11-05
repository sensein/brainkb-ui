"use client";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Database, Brain, FileText, Upload, User } from "lucide-react";

const UserSideBar: React.FC = () => {
    const pathname = usePathname();

    const menuItems = [
        {
            title: "Dashboard",
            href: "/user/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Ingest KGs",
            href: "/user/ingest-kg",
            icon: Database,
        },
        {
            title: "NER Extraction",
            href: "/user/sie",
            icon: Brain,
        },
        {
            title: "Resource Extraction",
            href: "/user/ingest-structured-resource",
            icon: FileText,
        },
        {
            title: "Pdf2Reproschema",
            href: "/user/pdf2reproschema",
            icon: Upload,
        },

    ];

    return (
        <>
            

            <aside id="logo-sidebar" className="fixed top-0 left-0 z-30 w-64 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700" aria-label="Sidebar">
                <div className="h-full px-4 py-4 overflow-y-auto bg-white dark:bg-gray-800">
                    <ul className="space-y-1 font-medium">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center p-3 text-gray-900 rounded-lg dark:text-white transition-colors group ${
                                            isActive
                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <Icon className={`w-5 h-5 transition-colors ${
                                            isActive
                                                ? 'text-blue-700 dark:text-blue-300'
                                                : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                                        }`} />
                                        <span className="ml-3">{item.title}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </aside>
        </>
    );
};

export default UserSideBar;
