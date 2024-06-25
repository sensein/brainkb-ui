
import type { Metadata } from "next";

export const metadata: Metadata = {
    title:"Home",

};
export default function Home() {
  return (
      <>

          <div className="pt-32 sm:pt-40 md:pt-48">
              <div className="lg:w-2/3 mx-auto animate-fade-in">
                  <h3 className="animate-slide-up text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400 sm:text-5xl lg:text-6xl">
                      BrainKB: A Large Scale Neuroscience Knowledge Graph
                  </h3>
              </div>
              <br/>
              <p className="text-2xl font-light text-sky-900 text-center animate-slide-up">
                  Facilitating Evidence-Based Decision Making to Unlock the Mysteries of the Mind
              </p>

          </div>
      </>

  );
}
