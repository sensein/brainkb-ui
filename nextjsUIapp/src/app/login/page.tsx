import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SignInButtons from  "@/src/app/components/SignInButtons"; // Import the client-side sign-in buttons

export const metadata: Metadata = {
  title: "Login",

};

export default async function OAuthLogin() {
  const currentSession = await getServerSession(authOptions);

  // If the user is logged in, redirect to the admin page
  if (currentSession) {
    redirect("/admin");
  }


  return (
    <div className="main-holder-brainkb flex justify-center items-center min-h-screen">
      <div className="flex flex-col items-center p-10 shadow-lg rounded-lg bg-white animate-fade-in">
        <h1 className="text-4xl font-bold mb-4">Sign In</h1>
        {/* Render client-side sign-in buttons */}
        <SignInButtons />

      </div>
    </div>
  );
}
