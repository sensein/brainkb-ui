// Navbar.client.js
"use client";
import { useState, useEffect, useRef } from 'react';
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { ChevronDown, ExternalLink } from "lucide-react";
import SignInButtons from "./SignInButtons"; // Import the client-side sign-in buttons

interface DropdownItem {
    href: string;
    label: string;
    target?: string;
    showExternalIcon?: boolean;
}

interface ClickableDropdownProps {
    label: string;
    items: DropdownItem[];
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    dropdownRef: React.RefObject<HTMLDivElement>;
}

const ClickableDropdown: React.FC<ClickableDropdownProps> = ({ 
    label, 
    items, 
    isOpen, 
    onToggle, 
    onClose, 
    dropdownRef 
}) => {
    return (
        <li className="flex items-center relative">
            <div ref={dropdownRef} className="relative">
                <button 
                    onClick={onToggle} 
                    className="flex items-center gap-2 py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700"
                >
                    {label}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                    <div className="absolute left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-[100] min-w-[180px]">
                        {items.map((item, index) => (
                            <Link 
                                key={index}
                                href={item.href}
                                target={item.target || "_self"}
                                onClick={onClose} 
                                className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <span>{item.label}</span>
                                {item.showExternalIcon && <ExternalLink className="w-4 h-4" />}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </li>
    );
};

const Navbar: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isResourcesOpen, setIsResourcesOpen] = useState(false);
    const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
    const [isSubmitDataOpen, setIsSubmitDataOpen] = useState(false);
    const { data: session } = useSession();
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const ResourcesRef = useRef<HTMLDivElement>(null);
    const knowledgeBaseRef = useRef<HTMLDivElement>(null);
    const submitDataRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        await signOut({ redirect: false });
        router.push('/');
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const dropdowns = [
            { ref: dropdownRef, isOpen: isUserMenuOpen, setIsOpen: setIsUserMenuOpen },
            { ref: ResourcesRef, isOpen: isResourcesOpen, setIsOpen: setIsResourcesOpen },
            { ref: knowledgeBaseRef, isOpen: isKnowledgeBaseOpen, setIsOpen: setIsKnowledgeBaseOpen },
            { ref: submitDataRef, isOpen: isSubmitDataOpen, setIsOpen: setIsSubmitDataOpen }
        ];

        const handleClickOutside = (event: MouseEvent) => {
            dropdowns.forEach(({ ref, isOpen, setIsOpen }) => {
                if (isOpen && ref.current && !ref.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            });
        };

        const hasOpenDropdown = dropdowns.some(({ isOpen }) => isOpen);
        if (hasOpenDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isUserMenuOpen, isResourcesOpen, isKnowledgeBaseOpen, isSubmitDataOpen]);

    return (
        <nav
            className="bg-white dark:bg-gray-900 fixed w-full z-20 top-0 start-0 border-b border-gray-200 dark:border-gray-600"
            style={{ zIndex: 999999, maxWidth: '100vw' }}>
            <div className="relative flex flex-wrap items-center justify-between mx-2 sm:mx-4 md:mx-8 lg:mx-12 p-2 sm:p-4 max-w-full">
                <Link href="/" className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse flex-shrink-0 min-w-0">
                    <Image 
                        src="/brainkb_logo.png" 
                        alt="BrainKB Logo"
                        width={56}
                        height={56}
                        className="h-10 w-10 sm:h-14 sm:w-auto flex-shrink-0"
                        priority
                    />
                    <span
                        className="self-center text-2xl sm:text-3xl md:text-4xl font-semibold whitespace-nowrap dark:text-white truncate">BrainKB</span>
                </Link>

                <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse flex-shrink-0">
                    <button 
                        data-collapse-toggle="navbar-sticky" 
                        type="button"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600 z-50 flex-shrink-0"
                        aria-controls="navbar-sticky" 
                        aria-expanded={isMobileMenuOpen}>
                        <span className="sr-only">Open main menu</span>
                        {isMobileMenuOpen ? (
                            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1h15M1 7h15M1 13h15"/>
                            </svg>
                        )}
                    </button>
                </div>
                <div className={`items-center justify-between w-full md:flex md:w-auto md:order-1 ${isMobileMenuOpen ? 'flex' : 'hidden'} absolute md:relative top-full left-0 right-0 md:top-auto md:left-auto md:right-auto bg-white dark:bg-gray-900 md:bg-transparent shadow-lg md:shadow-none overflow-visible`}
                     id="navbar-sticky"
                     style={{ maxWidth: '100vw' }}>
                    <ul className="flex flex-col p-4 md:p-0 mt-4 font-medium border border-gray-100 rounded-lg bg-gray-50 md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700 md:items-center z-40 w-full md:w-auto">
                        <li className="flex items-center">
                            <Link href="/"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="block py-2 px-3 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 md:dark:text-blue-500">
                                Home
                            </Link>

                        </li>
                        <ClickableDropdown
                            label="Knowledge Base"
                            items={[
                                { href: "/knowledge-base", label: "Library Generation" }
                            ]}
                            isOpen={isKnowledgeBaseOpen}
                            onToggle={() => setIsKnowledgeBaseOpen(!isKnowledgeBaseOpen)}
                            onClose={() => {
                                setIsKnowledgeBaseOpen(false);
                                setIsMobileMenuOpen(false);
                            }}
                            dropdownRef={knowledgeBaseRef}
                        />
                        <li className="flex items-center">
                            <Link href="/hmba-taxonomy"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                HMBA Taxonomy
                            </Link>
                        </li>
                         
                        <li className="flex items-center">
                            <Link href="/playground"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                Data Visualization
                            </Link>
                        </li>

                        {session && (
                            <li className="flex items-center">
                            <Link href="/user/dashboard"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                Structsense
                            </Link>
                        </li>
                        )}
                         

                        <ClickableDropdown
                            label="Resources"
                            items={[
                                { href: "/tools-and-libraries", label: "Tools and Libraries" },
                                { href: "http://docs.brainkb.org", label: "Documentation", target: "_blank", showExternalIcon: true },
                                { href: "https://github.com/sensein/BrainKB/issues", label: "Help", target: "_blank", showExternalIcon: true }
                            ]}
                            isOpen={isResourcesOpen}
                            onToggle={() => setIsResourcesOpen(!isResourcesOpen)}
                            onClose={() => {
                                setIsResourcesOpen(false);
                                setIsMobileMenuOpen(false);
                            }}
                            dropdownRef={ResourcesRef}
                        />

                        <li className="flex items-center">
                            <Link href="/about"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                About
                            </Link>
                        </li>

                        <li className="md:ml-4 flex items-center relative">
                            {session ? (
                                <div ref={dropdownRef} className="relative">
                                    <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                        {session.user?.name || session.user?.email}
                                    </button>
                                    {isUserMenuOpen && (
                                        <div className="absolute right-0 md:right-0 left-auto md:left-auto mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[120px] max-w-[200px]">
                                            <Link href="/user/ingest-kg" onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Submit Data</Link>
                                            <Link href="/user/profile" onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Profile</Link>
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
