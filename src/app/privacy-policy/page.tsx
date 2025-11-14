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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-sky-50">
            {/* Hero Section */}
            {page_meta.map((section, sectionIndex) => (
                <section key={sectionIndex} className="py-20 bg-gradient-to-br from-sky-50 via-white to-emerald-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mt-[30px]">
                            {section.title && (
                                <h1 className="text-5xl sm:text-6xl font-extrabold mb-6">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-600 to-emerald-600">
                                        {section.title}
                                    </span>
                                </h1>
                            )}
                            {section.subtitle && (
                                <p className="text-xl sm:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed mb-4">
                                    {section.subtitle}
                                </p>
                            )}
                            {section.description && (
                                <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                                    {section.description}
                                </p>
                            )}
                        </div>
                    </div>
                </section>
            ))}

            {/* Privacy Policy Sections */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                {sections.map((section, sectionIndex) => (
                    <section key={sectionIndex} className={`mb-16 ${sectionIndex < sections.length - 1 ? 'pb-16 border-b border-gray-200' : ''}`}>
                        {/* Section Title */}
                        <div className="text-center mb-12">
                            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                                {section.title}
                            </h2>
                        </div>

                        {/* Subsections */}
                        {section.subsections && (
                            <div className="space-y-6">
                                {section.subsections.map((subsection, index) => (
                                    <div 
                                        key={index} 
                                        className="group bg-gradient-to-br from-sky-50 to-white rounded-xl p-6 border-2 border-gray-100 hover:border-sky-300 hover:shadow-lg transition-all duration-300"
                                    >
                                        {/* Subsection Title */}
                                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                                            {subsection.title}
                                        </h3>

                                        {/* Description */}
                                        <div className="text-gray-700 text-base leading-relaxed mb-4">
                                            {subsection.description.split("\n").map((line, i) => (
                                                <p key={i} className="mb-2">
                                                    {line.includes("HTTP cookies") ? (
                                                        <>
                                                            {line.split("HTTP cookies")[0]}
                                                            <a
                                                                href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sky-600 hover:text-sky-700 font-semibold underline"
                                                            >
                                                                HTTP cookies
                                                            </a>
                                                            {line.split("HTTP cookies")[1]}
                                                        </>
                                                    ) : (
                                                        line
                                                    )}
                                                </p>
                                            ))}
                                        </div>

                                        {/* Bullet Points (if any) */}
                                        {subsection.bullet_points && (
                                            <ul className="mt-4 space-y-3">
                                                {subsection.bullet_points.map((point, bpIndex) => (
                                                    <li key={bpIndex} className="flex items-start gap-3">
                                                        <div className="flex-shrink-0 w-2 h-2 bg-sky-500 rounded-full mt-2"></div>
                                                        <span className="text-gray-700 leading-relaxed">{point.content}</span>
                                                    </li>
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
        </div>
    );
}
