"use client";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Database, Brain, FileText, Upload, User, Activity } from "lucide-react";
import { ENABLE_EXTRACTION_TOOLS, EXTRACTION_TOOL_HREFS } from "@/src/config/featureFlags";

const UserSideBar: React.FC = () => {
    const pathname = usePathname();

    const allMenuItems = [
        {
            title: "Dashboard",
            href: "/user/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "NER Extraction",
            href: "/user/sie",
            icon: Brain,
        },
        {
            title: "Resource Extraction",
            href: "/user/extract-resource",
            icon: FileText,
        },
        {
            title: "Job Status",
            href: "/user/job-status",
            icon: Activity,
        },
//         {
//             title: "Pdf2Reproschema",
//             href: "/user/pdf2reproschema",
//             icon: Upload,
//         },

    ];

    // Hide the extraction tools while the backend cannot serve them — ml_service
    // does not register their WebSocket endpoints without the structsense package.
    // Entries are kept above, not deleted, so flipping the flag restores them.
    const menuItems = ENABLE_EXTRACTION_TOOLS
        ? allMenuItems
        : allMenuItems.filter(
              (item) => !(EXTRACTION_TOOL_HREFS as readonly string[]).includes(item.href),
          );

    return (
        <>
            

            {/* Mobile-safe: -translate-x-full hides the fixed sidebar off-screen below sm (640px);
                sm:translate-x-0 slides it in at tablet+. w-64 (256px) stays within phone viewports.
                No content margin is applied elsewhere, so the hidden rail never squeezes page content. */}
            <aside id="logo-sidebar" className="fixed left-0 z-[5] w-64 max-w-[80vw] transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700" style={{ top: "56px", height: "300px" }} aria-label="Sidebar">
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
