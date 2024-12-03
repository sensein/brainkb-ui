import type { Metadata } from "next";
import { 
    GithubOAuthSignInButton
} from "@/src/app/components/oauthloginbuttons";
import { getServerSession } from "next-auth";
import { redirect, useRouter } from "next/navigation";
import { authOptions } from "@/lib/auth";
export const metadata: Metadata = {
    title:"Login",

};
export default async function OAuthLogin(){
    const current_session = await getServerSession(authOptions);
    //user is logged in so redirect to admin page
    if (current_session) return redirect("/admin");

    return (
        <div className="main-holder-brainkb flex justify-center items-center min-h-screen">
            <div className="flex flex-col items-center p-10 shadow-lg rounded-lg bg-white animate-fade-in">
                <h1 className="text-4xl font-bold mb-4">Sign In</h1>
                <GithubOAuthSignInButton/>
            </div>
        </div>


    );
};
