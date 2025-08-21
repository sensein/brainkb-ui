// Navbar.client.js
"use client";
import { useState, useRef, useEffect } from 'react';
import Link from "next/link";
import Image from "next/image";
import { useRouter } from 'next/navigation';

import { signIn, signOut, useSession } from "next-auth/react";

const NavbarAdmin: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { data: session } = useSession();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close dropdown on outside click
    useEffect(() => {
        if (!isOpen) return;
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Close dropdown on route change
    useEffect(() => {
        setIsOpen(false);
    }, [router]);

    return (
        <>
            <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                <div className="px-3 py-3 lg:px-5 lg:pl-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center justify-start rtl:justify-end">
                            <button data-drawer-target="logo-sidebar" data-drawer-toggle="logo-sidebar" aria-controls="logo-sidebar" type="button" className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600">
                                <span className="sr-only">Open sidebar</span>
                                <svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path clipRule="evenodd" fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 012 10z"></path>
                                </svg>
                            </button>
                            <Link href="/admin"  className="flex ms-2 md:me-24">
                                <Image 
                                    src="/brainkb_logo.png" 
                                    alt="BrainKB"
                                    width={32}
                                    height={32}
                                    className="h-8 w-auto me-3"
                                    priority
                                />
                                <span className="self-center text-xl font-semibold sm:text-2xl whitespace-nowrap dark:text-white">BrainKB</span>
                            </Link>
                        </div>
                        <div className="flex items-center">
                            <div className="relative flex items-center md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
                                    {session ? (
                                        <>
                                            <button onClick={() => setIsOpen(!isOpen)} className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                                {session.user?.name || session.user?.email}
                                            </button>
                                            {isOpen && (
                                                <div ref={dropdownRef} className="absolute mt-2 top-full bg-white border border-gray-200 rounded shadow py-1 z-50">
                                                    <Link href="/admin/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsOpen(false)}>
                                                        Profile
                                                    </Link>
                                                    <button onClick={() => { setIsOpen(false); signOut(); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                        Logout
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <Link href="/login"  className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                        Login
                                        </Link>

                                    )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <aside id="logo-sidebar" className="fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700" aria-label="Sidebar">
                <div className="h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
                    <ul className="space-y-2 font-medium">
                        <li>
                            <Link href="/admin"
                                  className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
                                <svg
                                    className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                                    aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
                                    viewBox="0 0 22 21">
                                    <path
                                        d="M16.975 11H10V4.025a1 1 0 0 0-1.066-.998 8.5 8.5 0 1 0 9.039 9.039.999.999 0 0 0-1-1.066h.002Z"/>
                                    <path
                                        d="M12.5 0c-.157 0-.311.01-.565.027A1 1 0 0 0 11 1.02V10h8.975a1 1 0 0 0 1-.935c.013-.188.028-.374.028-.565A8.51 8.51 0 0 0 12.5 0Z"/>
                                </svg>
                                <span className="ms-3">Dashboard</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/ingest-kg"
                                  className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
                                <svg
                                    className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                                    aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        d="M12 1a1 1 0 0 0-1 1v8h-1a1 1 0 0 0-.707.293l-7 7a1 1 0 1 0 1.414 1.414l7-7A1 1 0 0 0 12 11h1v8a1 1 0 1 0 2 0v-8h1a1 1 0 0 0 0-2h-1V2a1 1 0 0 0-1-1z"/>
                                    <path
                                        d="M12 3a1 1 0 0 1 1 1v6h1a1 1 0 0 1 0 2h-1v6a1 1 0 1 1-2 0v-6h-1a1 1 0 0 1 0-2h1V4a1 1 0 0 1 1-1z"/>
                                </svg>
                                <span className="ms-3">Ingest KGs</span>
                            </Link>
                        </li>

                        <li>
                        <Link href="/admin/ingest-structured-resource"
                                  className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
                                <svg
                                    className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                                    aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        d="M12 1a1 1 0 0 0-1 1v8h-1a1 1 0 0 0-.707.293l-7 7a1 1 0 1 0 1.414 1.414l7-7A1 1 0 0 0 12 11h1v8a1 1 0 1 0 2 0v-8h1a1 1 0 0 0 0-2h-1V2a1 1 0 0 0-1-1z"/>
                                    <path
                                        d="M12 3a1 1 0 0 1 1 1v6h1a1 1 0 0 1 0 2h-1v6a1 1 0 1 1-2 0v-6h-1a1 1 0 0 1 0-2h1V4a1 1 0 0 1 1-1z"/>
                                </svg>
                                <span className="ms-3">Resource Extraction</span>
                            </Link>
                        </li>

                        <li>
                            <Link href="/admin/sie"
                                  className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
                                <svg
                                    className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                                    aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        d="M12 1a1 1 0 0 0-1 1v8h-1a1 1 0 0 0-.707.293l-7 7a1 1 0 1 0 1.414 1.414l7-7A1 1 0 0 0 12 11h1v8a1 1 0 1 0 2 0v-8h1a1 1 0 0 0 0-2h-1V2a1 1 0 0 0-1-1z"/>
                                    <path
                                        d="M12 3a1 1 0 0 1 1 1v6h1a1 1 0 0 1 0 2h-1v6a1 1 0 1 1-2 0v-6h-1a1 1 0 0 1 0-2h1V4a1 1 0 0 1 1-1z"/>
                                </svg>
                                <span className="ms-3">SIE</span>
                            </Link>
                        </li>


                        <li>
                            <Link href="/admin/profile"
                                  className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
                                <svg
                                    className="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                                    aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
                                    viewBox="0 0 20 18">
                                    <path
                                        d="M14 2a3.963 3.963 0 0 0-1.4.267 6.439 6.439 0 0 1-1.331 6.638A4 4 0 1 0 14 2Zm1 9h-1.264A6.957 6.957 0 0 1 15 15v2a2.97 2.97 0 0 1-.184 1H19a1 1 0 0 0 1-1v-1a5.006 5.006 0 0 0-5-5ZM6.5 9a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM8 10H5a5.006 5.006 0 0 0-5 5v2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2a5.006 5.006 0 0 0-5-5Z"/>
                                </svg>
                                <span className="flex-1 ms-3 whitespace-nowrap">Profile</span>
                            </Link>
                        </li>


                    </ul>
                </div>
            </aside>
        </>
    );
};

export default NavbarAdmin;
