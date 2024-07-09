
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import ConfigureFormPage from "@/src/app/admin/configure/configureForm";
export const metadata: Metadata = {
    title:"Admin",

};
export default  async function AdminIndex(){
  const session = await getServerSession();
  if (!session || !session.user) {
    redirect("/login");
  }

  return (
      <ConfigureFormPage/>
  );
}