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


            <div className="flex items-center justify-center h-48 mb-4 rounded bg-gray-50 dark:bg-gray-800">
                <p className="text-2xl text-gray-400 dark:text-gray-500">
                    This dashboard is currently under development.
                    Note: SIE option will not work, we are updating the backend.
                    <br/>
                    If you have any feedback or suggestions, feel free to email me at{' '}
                    <a href="mailto:tekraj@mit.edu" className="underline text-blue-400 hover:text-blue-600">
                        tekraj@mit.edu
                    </a>.
                </p>
            </div>


        </>

    );
}