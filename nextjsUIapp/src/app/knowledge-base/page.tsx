import type { Metadata } from "next";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {redirect} from "next/navigation";

export const metadata: Metadata = {
    title:"Knowledge Base",

};

export default async function KnowledgeBase(){
        const current_session = await getServerSession(authOptions);
    //user is logged in so redirect to admin page
    if (current_session) return redirect("/admin");
    return (
        <h1>Knowledge Base</h1>
    );
}