"use Client";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
export const metadata: Metadata = {
    title:"Admin",

};
export default  async function AdminIndex(){
  const session = await getServerSession();
  if (!session || !session.user) {
    redirect("/login");
  }
    return (
        <>
        <h1>Admin  Page</h1>
        <p> Signed in as {session.user.email} <br /></p>
            </>
    );
}