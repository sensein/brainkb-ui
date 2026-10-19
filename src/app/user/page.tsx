
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
export default  async function AdminIndex(){
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/");
  }
    return (
        redirect("/user/profile")

    );
}