import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

export const metadata: Metadata = {
  title: "About",
};

export default async function About() {
  const current_session = await getServerSession(authOptions);

  const objectives = [
    {
      title: "Organize and Structure Neuroscience Knowledge",
      description:
        "Develop a comprehensive knowledge base using knowledge graphs (KGs) to systematically represent neuroscience research and findings.",
    },
    {
      title: "Enable Efficient Knowledge Discovery",
      description:
        "Provide advanced tools for searching, exploring, visualizing, and analyzing complex neuroscience data to help researchers uncover meaningful insights.",
    },
    {
      title: "Facilitate Evidence-Based Research",
      description:
        "Integrate scientific publications and experimental data into structured assertions with supporting evidence, ensuring the credibility and reliability of neuroscience knowledge.",
    },
    {
      title: "Support Collaborative Contributions",
      description:
        "Enable scientists to contribute new findings in a semi-automated fashion, fostering a continuously evolving repository of neuroscience insights.",
    },
    {
      title: "Accelerate Neuroscience Discoveries",
      description:
        "Serve as a central platform for neuroscientists worldwide, enhancing collaboration and knowledge sharing to drive advancements in the field.",
    },
    {
      title: "Ensure Accessibility and Usability",
      description:
        "Design an intuitive and scalable platform that accommodates researchers at all levels, providing seamless access to structured neuroscience knowledge.",
    },
    {
      title: "Promote Interdisciplinary Integration",
      description:
        "Facilitate connections between neuroscience and related domains, supporting cross-disciplinary research and innovative applications.",
    },
  ];

  const outcomes = [
    {
      title: "Automated Knowledge Extraction",
      description:
        "Extract neuroscience knowledge from structured, semi-structured, and unstructured sources, representing it through KGs.",
    },
    {
      title: "Interactive Knowledge Graph Visualization",
      description:
        "Enable visualization of KGs using entity cards to help researchers understand relationships between neuroscience concepts.",
    },
    {
      title: "Advanced Analytics Capabilities",
      description:
        "Provide a platform to perform various analytics operations over the BrainKB KGs.",
    },
    {
      title: "High-Quality Content Validation",
      description:
        "Implement semi-automated validation of BrainKB to ensure the reliability and integrity of its knowledge.",
    },
    {
      title: "Real-Time & Batch Data Processing",
      description:
        "Support both batch and streaming data ingestion to automate KG extraction and updates.",
    },
  ];

  // Redirect logged-in users to the admin page
  if (current_session) return redirect("/admin");

  return (
    <div className="w-full p-8 space-y-12 animate-slide-up">

      {/* What is BrainKB? */}
      <section className="bg-gray-100 p-8 rounded-lg shadow-md">
        <h2 className="text-4xl font-bold text-sky-900 mb-6 text-center">
          What is BrainKB?
        </h2>
        <p className="text-lg text-gray-700 mb-6 text-center">
          BrainKB is a platform designed to support neuroscience research by structuring and organizing scientific knowledge using knowledge graphs (KGs) for delivering evidence-based insights.
        </p>
        <div className="grid md:grid-cols-2 gap-6 animate-slide-up">
          {[
            "BrainKB structures neuroscience knowledge into an accessible and scalable knowledge graph.",
            "It provides tools for searching, exploring, visualizing, and analyzing neuroscience data.",
            "Researchers can contribute new findings, represented as assertions with supporting evidence from publications.",
            "BrainKB aims to be the go-to resource for neuroscientists worldwide, fostering collaboration and accelerating discoveries.",
          ].map((point, index) => (
            <div
              key={index}
              className="flex items-start space-x-4 p-5 bg-white rounded-lg shadow"
            >
              <CheckCircleIcon className="w-8 h-8 text-green-500 flex-shrink-0" />
              <p className="text-lg text-gray-700">{point}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Objectives */}
      <section className="bg-gray-100 p-8 rounded-lg shadow-md">
        <h2 className="text-4xl font-bold text-sky-900 mb-6 text-center">
          Objective(s)
        </h2>
        <div className="grid md:grid-cols-2 gap-6 animate-slide-up">
          {objectives.map((obj, index) => (
            <div
              key={index}
              className="flex items-start space-x-4 p-5 bg-white rounded-lg shadow"
            >
              <CheckCircleIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {obj.title}
                </h3>
                <p className="text-gray-600">{obj.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Expected Outcomes */}
      <section className="bg-gray-100 p-8 rounded-lg shadow-md">
        <h2 className="text-4xl font-bold text-sky-900 mb-6 text-center">
          Expected Outcome
        </h2>
        <p className="text-lg text-gray-700 mb-6 text-center">
          The BrainKB platform aims to deliver the following key outcomes:
        </p>
        <div className="grid md:grid-cols-2 gap-6 animate-slide-up">
          {outcomes.map((outcome, index) => (
            <div
              key={index}
              className="flex items-start space-x-4 p-5 bg-white rounded-lg shadow"
            >
              <CheckCircleIcon className="w-8 h-8 text-green-500 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {outcome.title}
                </h3>
                <p className="text-gray-600">{outcome.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
