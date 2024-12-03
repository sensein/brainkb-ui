"use Client";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
export const metadata: Metadata = {
    title:"Profile",

};
export default  async function Profile(){
  const session = await getServerSession();
  if (!session || !session.user) {
    redirect("/login");
  }
    return (
        <>

            <div className="flex items-center justify-center h-48 mb-4 rounded bg-gray-50 dark:bg-gray-800">
                <p className="text-2xl text-gray-400 dark:text-gray-500">
                    My Profile

                </p>
            </div>

            <div className="flex items-center justify-center h-48 mb-4 rounded bg-gray-50 dark:bg-gray-800">
                <p className="text-2xl text-gray-400 dark:text-gray-500">
                    {session.user?.name }
                    <br/>

                    {session.user?.email}
                    <br/>

                    {session.user?.id}
                    <br/>

                    {session.user?.image}
                </p>
            </div>




        </>
    );
}