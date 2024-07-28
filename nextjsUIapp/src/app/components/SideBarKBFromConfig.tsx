import { useState } from 'react';
import Link from "next/link";

import {getData} from "@/src/app/components/getData";
import yaml from "@/src/app/components/config-knowledgebases.yaml";
export default function SideBarKBFromConfig() {


    return (
        <>
            <aside id="logo-sidebar"
                   className="fixed sidebarwidth left-0 z-40 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700"
                   aria-label="Sidebar">
                <div className="h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
                    <ul className="space-y-2 font-medium">
                        <li>
                            <Link href="/assertions"
                                  className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
                                <svg
                                    className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                                    aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM13 11H17V13H13V17H11V13H7V11H11V7H13V11Z"/>
                                </svg>

                                <span className="ms-3">Assertions</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="/evidence"
                                  className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
                                <svg
                                    className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                                    aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 16.5H13V18H11V16.5ZM11 6H13V14H11V6Z"/>
                                </svg>
                                <span className="ms-3">Evidence</span>
                            </Link>
                        </li>

                        {yaml.pages.map((page, index) => (
                            <li key={index}>
                            {page.slug !== "default" && (
                            <Link href={{
                                pathname: `/knowledge-base/${page.slug}`,

                            }}
                                  className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
                                <svg
                                    className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                                    aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
                                    viewBox="0 0 120 24">
                                    <g transform="translate(0, 0)">
                                        <path
                                            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 16.93V12.07L8.07 14.14L6.93 12.86L10.93 9.86V8H13.07V9.86L17.07 12.86L15.93 14.14L13 12.07V16.93L15.93 15.93L17.07 17.07L12 19.93L6.93 17.07L8.07 15.93L11 16.93Z"/>
                                    </g>
                                    <g transform="translate(24, 0)">
                                        <path
                                            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C15.87 4 19 7.13 19 11C19 14.87 15.87 18 12 18C8.13 18 5 14.87 5 11C5 7.13 8.13 4 12 4ZM12 6C9.24 6 7 8.24 7 11C7 13.76 9.24 16 12 16C14.76 16 17 13.76 17 11C17 8.24 14.76 6 12 6ZM11 8H13V13H11V8ZM11 14H13V16H11V14Z"/>
                                    </g>
                                    <g transform="translate(48, 0)">
                                        <path
                                            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 7H14V9H10V7ZM10 11H14V13H10V11ZM10 15H14V17H10V15Z"/>
                                    </g>
                                    <g transform="translate(72, 0)">
                                        <path
                                            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 16.93V12.07L8.07 14.14L6.93 12.86L10.93 9.86V8H13.07V9.86L17.07 12.86L15.93 14.14L13 12.07V16.93L15.93 15.93L17.07 17.07L12 19.93L6.93 17.07L8.07 15.93L11 16.93Z"/>
                                    </g>
                                    <g transform="translate(96, 0)">
                                        <path
                                            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 16.93V12.07L8.07 14.14L6.93 12.86L10.93 9.86V8H13.07V9.86L17.07 12.86L15.93 14.14L13 12.07V16.93L15.93 15.93L17.07 17.07L12 19.93L6.93 17.07L8.07 15.93L11 16.93Z"/>
                                    </g>
                                </svg>

                                <span className="flex-1 ms-3">{page.title}</span>
                            </Link>
                                )}
                        </li>

                       ))}



                    </ul>
                </div>
            </aside>

        </>
    );
};

