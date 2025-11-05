// Navbar.client.js
"use client";
import { useState, useEffect, useRef } from 'react';
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { ChevronDown, ExternalLink } from "lucide-react";
import SignInButtons from "./SignInButtons"; // Import the client-side sign-in buttons

const Navbar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExternalResourcesOpen, setIsExternalResourcesOpen] = useState(false);
    const [isSubmitDataOpen, setIsSubmitDataOpen] = useState(false);
    const { data: session } = useSession();
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const externalResourcesRef = useRef<HTMLDivElement>(null);
    const submitDataRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        await signOut({ redirect: false });
        router.push('/');
        setIsOpen(false);
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
            if (externalResourcesRef.current && !externalResourcesRef.current.contains(event.target as Node)) {
                setIsExternalResourcesOpen(false);
            }
            if (submitDataRef.current && !submitDataRef.current.contains(event.target as Node)) {
                setIsSubmitDataOpen(false);
            }
        };

        if (isOpen || isExternalResourcesOpen || isSubmitDataOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, isExternalResourcesOpen, isSubmitDataOpen]);

    return (
        <nav
            className="bg-white dark:bg-gray-900 fixed w-full z-20 top-0 start-0 border-b border-gray-200 dark:border-gray-600">
            <div className="flex flex-wrap items-center justify-between mx-6 md:mx-8 lg:mx-12 p-4">
                <Link href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
                    <Image 
                        src="/brainkb_logo.png" 
                        alt="BrainKB Logo"
                        width={56}
                        height={56}
                        className="h-14 w-auto"
                        priority
                    />
                    <span
                        className="self-center text-4xl font-semibold whitespace-nowrap dark:text-white">BrainKB</span>
                </Link>

                <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
                    <button data-collapse-toggle="navbar-sticky" type="button"
                            className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
                            aria-controls="navbar-sticky" aria-expanded="false">
                        <span className="sr-only">Open main menu</span>
                        <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
                             viewBox="0 0 17 14">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M1 1h15M1 7h15M1 13h15"/>
                        </svg>
                    </button>
                </div>
                <div className="items-center justify-between hidden w-full md:flex md:w-auto md:order-1"
                     id="navbar-sticky">
                    <ul className="flex flex-col p-4 md:p-0 mt-4 font-medium border border-gray-100 rounded-lg bg-gray-50 md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700 md:items-center">
                        <li className="flex items-center">
                            <Link href="/"
                                  className="block py-2 px-3 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 md:dark:text-blue-500">
                                HOME
                            </Link>

                        </li>
                        <li className="flex items-center">
                            <Link href="/knowledge-base"
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                KNOWLEDGE BASE
                            </Link>
                        </li>
                        <li className="flex items-center">
                            <Link href="/hmba-taxonomy"
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                HMBA TAXONOMY
                            </Link>
                        </li>
                         
                        <li className="flex items-center">
                            <Link href="/playground"
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                PLAYGROUND
                            </Link>
                        </li>
                       <li className="flex items-center">
                            <Link href="/see"
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                SEE
                            </Link>
                        </li>

                        <li className="flex items-center">
                            <Link href="/tools-and-libraries"
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                TOOLS
                            </Link>
                        </li>

                        {session && (
                            <li className="flex items-center relative">
                                <div ref={submitDataRef} className="relative">
                                    <button
                                        onClick={() => setIsSubmitDataOpen(!isSubmitDataOpen)}
                                        className="flex items-center gap-2 py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700"
                                    >
                                        SUBMIT DATA
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isSubmitDataOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isSubmitDataOpen && (
                                        <div className="absolute left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[180px]">
                                            <Link
                                                href="/user/ingest-kg"
                                                onClick={() => setIsSubmitDataOpen(false)}
                                                className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <span>KNOWLEDGE GRAPHS</span>
                                            </Link>
                                            <Link
                                                href="/user/sie"
                                                onClick={() => setIsSubmitDataOpen(false)}
                                                className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <span>NER EXTRACTION</span>
                                            </Link>
                                            <Link
                                                href="/user/ingest-structured-resource"
                                                onClick={() => setIsSubmitDataOpen(false)}
                                                className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <span>RESOURCE EXTRACTION</span>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </li>
                        )}
                         

                        <li className="flex items-center relative">
                            <div ref={externalResourcesRef} className="relative">
                                <button 
                                    onClick={() => setIsExternalResourcesOpen(!isExternalResourcesOpen)} 
                                    className="flex items-center gap-2 py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700"
                                >
                                    EXTERNAL RESOURCES
                                    <ChevronDown className={`w-4 h-4 transition-transform ${isExternalResourcesOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isExternalResourcesOpen && (
                                    <div className="absolute left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[180px]">
                                        <Link 
                                            href="/about"
                                            onClick={(e) => {
                                                setIsExternalResourcesOpen(false);
                                            }} 
                                            className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <span>About</span>
                                        </Link>
                                        <Link 
                                            href="http://docs.brainkb.org" 
                                            target="_blank"
                                            onClick={() => setIsExternalResourcesOpen(false)} 
                                            className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <span>Documentation</span>
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                        <Link 
                                            href="https://github.com/sensein/BrainKB/issues"
                                            target="_blank"
                                            onClick={() => setIsExternalResourcesOpen(false)} 
                                            className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <span>Help</span>
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>

                                    </div>
                                )}
                            </div>
                        </li>

                        <li className="md:ml-4 flex items-center relative">
                            {session ? (
                                <div ref={dropdownRef} className="relative">
                                    <button onClick={() => setIsOpen(!isOpen)} className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                        {session.user?.name || session.user?.email}
                                    </button>
                                    {isOpen && (
                                        <div className="absolute right-0 md:right-0 left-auto md:left-auto mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[120px] max-w-[200px]">
                                            <Link href="/user/profile" onClick={() => setIsOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Profile</Link>
                                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <SignInButtons />
                            )}
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
