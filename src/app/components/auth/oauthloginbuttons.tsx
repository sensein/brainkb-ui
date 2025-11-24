"use client";

import Image from "next/image";
import google_logo from "@/public/google_logo.png";
import github_logo from "@/public/github_logo.png";
import { signIn } from "next-auth/react";

export function GoogleOAuthSignInButton() {
  const handleGoogleButtonClick = () => {
    signIn("google");
  };

  return (
    <button
      onClick={handleGoogleButtonClick}
      className="w-full flex items-center font-semibold justify-center h-14 px-6 mt-4 text-xl transition-colors duration-300 bg-white border-2 border-gray-300 text-gray-600 rounded-lg focus:shadow-outline hover:bg-gray-100"
    >
      <Image src={google_logo} alt="Google" width={20} height={20} />
      <span className="ml-5">Continue with Google</span>
    </button>
  );
}

export function GithubOAuthSignInButton() {
  const handleClick = () => {
    signIn("github");
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center font-semibold justify-center h-14 px-6 mt-4 text-xl transition-colors duration-300 bg-white border-2 border-gray-300 text-gray-600 rounded-lg focus:shadow-outline hover:bg-gray-100"
    >
      <Image src={github_logo} alt="Github" width={20} height={20} />
      <span className="ml-5">Continue with Github</span>
    </button>
  );
}