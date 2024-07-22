import type { Metadata } from "next";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {redirect} from "next/navigation";
import ConfigureFormPage from "@/src/app/knowledge-base/kb-layoutpage";
import SideBarKB from "@/src/app/components/SideBarKB";

export const metadata: Metadata = {
    title:"Knowledge Base",

};

export default async function KnowledgeBase(){
        const current_session = await getServerSession(authOptions);
    //user is logged in so redirect to admin page
    if (current_session) return redirect("/admin");
    return (
        <div className="kb-page-margin">
            <SideBarKB/>
            <ConfigureFormPage/>
        </div>

    );
}