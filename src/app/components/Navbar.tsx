// Navbar.client.js
"use client";
import { useState } from 'react';
import Link from "next/link";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import SignInButtons from  "@/src/app/components/SignInButtons"; // Import the client-side sign-in buttons

const Navbar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { data: session } = useSession();

    return (
        <nav
            className="bg-white dark:bg-gray-900 fixed w-full z-20 top-0 start-0 border-b border-gray-200 dark:border-gray-600">
            <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
                <Link href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
                    <Image 
                        src="/brainkb_logo.png" 
                        alt="BrainKB Logo"
                        width={32}
                        height={32}
                        className="h-8 w-auto"
                        priority
                    />
                    <span
                        className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">BrainKB</span>
                </Link>

                <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
                  {session ? (
                        <>
                            <button onClick={() => setIsOpen(!isOpen)} className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                {session.user?.name || session.user?.email}
                            </button>
                            {isOpen && (
                                <div className="absolute mt-12  bg-white border border-gray-200 rounded shadow py-1">
                                    <Link href="/admin/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</Link>
                                    <button onClick={() => signOut()} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        Logout
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-blue-600 dark:bg-blue-700 rounded-lg px-4 py-3 shadow-md">
                            <SignInButtons />
                        </div>
                    )}

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
                    <ul className="flex flex-col p-4 md:p-0 mt-4 font-medium border border-gray-100 rounded-lg bg-gray-50 md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
                        <li>
                            <Link href="/"
                                  className="block py-2 px-3 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 md:dark:text-blue-500">
                                Home
                            </Link>

                        </li>
                        <li>
                            <Link href="/knowledge-base"
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                Knowledge Base
                            </Link>
                        </li>
                        <li>
                            <Link href="/hmba-taxonomy"
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                HMBA Taxonomy
                            </Link>
                        </li>


                        <li>
                            <Link href="/playground"
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                Playground
                            </Link>
                        </li>
                        <li>
                            <Link href="/see"
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                SEE
                            </Link>
                        </li>

                        <li>
                            <Link href="/tools-and-libraries"
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                Tools & Libraries
                            </Link>
                        </li>

                        <li>
                            <Link href="/data-release"
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                Data Release
                            </Link>
                        </li>
                        <li>

                            <Link href="http://docs.brainkb.org" target="_blank"

                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                Documentation
                            </Link>
                        </li>
                        <li>
                            <Link href="http://sandbox.brainkb.org" target="_blank"
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                Sandbox
                            </Link>
                        </li>

                        <li>
                            <Link href="/about"
                                  className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">
                                About
                            </Link>
                        </li>

                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
