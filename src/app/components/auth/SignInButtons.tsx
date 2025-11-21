"use client"; // Mark this file as a Client Component

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";

export default function SignInButtons() {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      <button
        onClick={() => signIn("github")}
        className="flex items-center justify-center w-9 h-9 bg-gray-800 hover:bg-gray-900 text-white rounded-full shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
        aria-label="Sign in with GitHub"
        title="Sign in with GitHub"
      >
        <Github className="w-4 h-4" />
      </button>
      <button
        onClick={() => signIn("orcid")}
        className="flex items-center justify-center w-9 h-9 bg-[#A6CE39] hover:bg-[#8FB832] rounded-full shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2"
        aria-label="Sign in with ORCID"
        title="Sign in with ORCID"
      >
        <svg className="w-4 h-4" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <circle cx="512" cy="512" r="512" fill="#a6ce39"></circle>
          <path d="M373.7 709.3h-50.4V358.5h50.4v350.8zm74-350.8h136.2c129.7 0 186.7 92.7 186.7 175.5 0 90.1-70.4 175.5-186 175.5H447.7v-351zm50.4 305.6h80.2c114.3 0 140.5-86.8 140.5-130 0-70.4-44.9-130-143.1-130h-77.6v260zM381.6 285.5c0 18-14.7 33.1-33.1 33.1-18.3 0-33.1-15.1-33.1-33.1 0-18.3 14.7-33.1 33.1-33.1 18.3 0 33.1 15.1 33.1 33.1z" fill="#fff"></path>
        </svg>
      </button>
    </div>
  );
}
