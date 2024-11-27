"use client"; // Mark this file as a Client Component

import { signIn } from "next-auth/react";

export default function SignInButtons() {
  return (
    <>
      {/* GitHub OAuth button */}
      <button
        onClick={() => signIn("github")}
        className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
      >
        Sign in with GitHub
      </button>

      {/* ORCID OAuth button */}
      <button
        onClick={() => signIn("orcid")}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
      >
        Sign in with ORCID
      </button>
    </>
  );
}
