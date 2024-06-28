
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect, useRouter } from "next/navigation";
import { authOptions } from "@/lib/auth";
export const metadata: Metadata = {
    title:"Home",

};
export default async function Home() {
    const current_session = await getServerSession(authOptions);
    //user is logged in so redirect to admin page
    if (current_session) return redirect("/admin");
  return (
      <div className="main-holder-brainkb">

          <div className="pt-32 sm:pt-40 md:pt-48">
              <div className="lg:w-2/3 mx-auto animate-fade-in">
                  <h3 className="animate-slide-up text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400 sm:text-5xl lg:text-6xl">
                      BrainKB: A Large Scale Neuroscience Knowledge Graph
                  </h3>
              </div>
              <br/><br/>
              <p className="text-2xl  font-light text-sky-900 text-center animate-slide-up">
                  Facilitating Evidence-Based Decision Making to Unlock the Mysteries of the Mind
              </p>
              <div className="h-64"></div>
          </div>

          <div className="pt-32 sm:pt-40 md:pt-48 bg-gray-100">
              <div className="lg:w-2/3 mx-auto animate-fade-in">
                  <h3 className="animate-slide-up text-center text-4xl font-bold ">
                      Connected Models
                  </h3>
              </div>
              <br/>
              <p className="text-2xl  font-light text-sky-900 text-center animate-slide-up">
                  List os struc
              </p>
          </div>

      </div>

  );
}
