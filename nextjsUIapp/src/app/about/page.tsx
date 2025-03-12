import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import yaml from "@/src/app/components/about.yaml";

export const metadata: Metadata = {
  title: "About",
};

export default async function About() {
  const current_session = await getServerSession(authOptions);

  // Redirect logged-in users to the admin page
  if (current_session) return redirect("/admin");

  const sections = yaml.sections;

  return (
    <div className="w-full p-8 space-y-12 set-margin-hundred">
      {sections.map((section, sectionIndex) => (
        <section
          key={sectionIndex}
          className="bg-gray-100 p-8 rounded-lg shadow-md animate-slide-up"
        >
          {/* Section Title */}
          <h2 className="text-4xl font-bold text-sky-900 mb-6 text-center">
            {section.title}
          </h2>

          {/* Section Subtitle aka text description (if available)  */}
          {section.subtitle && (
            <p className="text-lg text-gray-700 mb-6 text-center">
              {section.subtitle}
            </p>
          )}

          {/* Bullet Points */}
          <div className="grid md:grid-cols-2 gap-6">
            {section.bullet_points &&
              section.bullet_points.map((point, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 p-5 bg-white rounded-lg shadow"
                >
                  <CheckCircleIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">
                      {point.title}
                    </h3>
                    {point.description && (
                      <p className="text-gray-600">{point.description}</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
