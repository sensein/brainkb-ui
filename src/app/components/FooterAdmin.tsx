"use client";
import {useState} from 'react';
import Link from 'next/link';

const FooterAdmin: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (


        <footer className="bg-white rounded-lg shadow dark:bg-gray-900 ">
            <div className="mx-auto p-4 md:py-8">
                <div className="sm:flex sm:items-center sm:justify-between">
                    <a href="#"
                       className="flex items-center mb-4 sm:mb-0 space-x-3 rtl:space-x-reverse">
                        <img src="brainkb_logo.png" className="h-8" alt="BrainKB Logo"/>
                        <span
                            className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">BrainKB</span>
                    </a>
                    <ul className="flex flex-wrap items-center mb-6 text-sm font-medium text-gray-500 sm:mb-0 dark:text-gray-400">
                        <li>
                            <Link href="/about" className="hover:underline me-4 md:me-6">
                               About
                            </Link>

                        </li>
                        <li>
                            <Link href="/privacy-policy" className="hover:underline me-4 md:me-6">
                                Privacy Policy
                            </Link>

                        </li>

                        <li>
                             <Link href="/contact" className="hover:underline me-4 md:me-6">
                               Contact
                            </Link>
                        </li>
                    </ul>
                </div>
                <hr className="my-6 border-gray-200 sm:mx-auto dark:border-gray-700 lg:my-8"/>
                <span className="block text-sm text-gray-500 sm:text-center dark:text-gray-400">
                    © {new Date().getFullYear()} BrainKB™  Admin&  <Link className="hover:underline" href="https://sensein.group" target="_blank">Senseable Intelligence Group</Link>. All Rights Reserved.
</span>

            </div>
        </footer>


    );
};

export default FooterAdmin;
