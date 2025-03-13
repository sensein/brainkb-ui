import type {Metadata} from "next";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {redirect} from "next/navigation";
import yaml from "@/src/app/components/privacy-policy.yaml";

export const metadata: Metadata = {
    title: "Privacy Policy",
};

export default async function PrivacyPolicy() {
    const current_session = await getServerSession(authOptions);

    // Redirect logged-in users to the admin page
    if (current_session) return redirect("/admin");

    const sections = yaml.sections;
    const page_meta = yaml.page_meta;

    return (
        <div className="p-8 space-y-12 set-margin-hundred">
            {/* Header Section */}
            {page_meta.map((section, sectionIndex) => (
                <div className="text-center" key={sectionIndex}>
                    {section.title && (
                        <h1 className="text-4xl font-bold text-sky-900">{section.title}</h1>
                    )}
                    {section.subtitle && (<p className="text-lg text-gray-600 mt-2 max-w-3xl mx-auto">
                        {section.subtitle}
                    </p>)}<br/><br/>
                    {section.description && (
                        <p className="text-lg text-gray-700">{section.description}</p>
                    )}

                </div>
            ))
            }


            {/* Privacy Policy Sections */}
            {sections.map((section, sectionIndex) => (
                <section key={sectionIndex} className="pb-8 border-b border-gray-300 last:border-b-0">
                    {/* Section Title */}
                    <h2 className="text-2xl font-semibold text-sky-900 mb-4">{section.title}</h2>

                    {/* Section Subtitle (if available) */}
                    {section.subtitle && (
                        <p className="text-lg text-gray-700 mb-6 max-w-3xl">{section.subtitle}</p>
                    )}

                    {/* Subsections */}
                    {section.subsections && (
                        <div className="space-y-6">
                            {section.subsections.map((subsection, index) => (
                                <div key={index} className="p-4 bg-gray-50 rounded-md">
                                    {/* Subsection Title */}
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{subsection.title}</h3>

                                    {/* Description */}
                                    <p className="text-gray-600 text-base">
                                        {subsection.description.split("\n").map((line, i) => (
                                            <span key={i} className="block">
                        {line.includes("HTTP cookies") ? (
                            <a
                                href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                            >
                                HTTP cookies
                            </a>
                        ) : (
                            line
                        )}
                      </span>
                                        ))}
                                    </p>

                                    {/* Bullet Points (if any) */}
                                    {subsection.bullet_points && (
                                        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-600">
                                            {subsection.bullet_points.map((point, bpIndex) => (
                                                <li key={bpIndex} className="ml-4">{point.content}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            ))}
        </div>
    );
}
