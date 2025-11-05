
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
export default  async function AdminIndex(){
  const session = await getServerSession();
  if (!session || !session.user) {
    redirect("/login");
  }
    return (
        redirect("/user/profile")

    );
}