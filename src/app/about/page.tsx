"use client";

import { Target, Zap, CheckCircle } from "lucide-react";
import yaml from "@/src/config/yaml/about.yaml";

export default function About() {
  const sections = yaml.sections;
  const objectivesSection = sections.find(s => s.section === "objectives");
  const expectedOutcomeSection = sections.find(s => s.section === "expectedoutcome");
  const whatIsSection = sections.find(s => s.section === "whatisbrainkb");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-sky-50">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-sky-50 via-white to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mt-[30px]">
            <h1 className="text-5xl sm:text-6xl font-extrabold mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-600 to-emerald-600">
                About BrainKB
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Learn about our mission, objectives, and expected outcomes
            </p>
          </div>
        </div>
      </section>

      {/* What is BrainKB Section */}
      {whatIsSection && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                {whatIsSection.title}
              </h2>
              {whatIsSection.subtitle && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
                  {whatIsSection.subtitle}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {whatIsSection.bullet_points?.map((point, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-sky-50 to-emerald-50 rounded-xl p-6 border border-sky-100 hover:shadow-lg transition-all duration-300"
                  >
                    <CheckCircle className="w-8 h-8 text-sky-600 mb-4" />
                    <p className="text-gray-700 font-medium leading-relaxed">
                      {point.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Objectives Section */}
      {objectivesSection && (
        <section className="py-20 bg-gradient-to-br from-gray-50 to-sky-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                {objectivesSection.title}
              </h2>
              {objectivesSection.subtitle && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {objectivesSection.subtitle}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {objectivesSection.bullet_points?.map((point, index) => (
                <div
                  key={index}
                  className="group bg-gradient-to-br from-sky-50 to-white rounded-xl p-6 border-2 border-gray-100 hover:border-sky-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {point.title}
                      </h3>
                      {point.description && (
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {point.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Expected Outcomes Section */}
      {expectedOutcomeSection && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                {expectedOutcomeSection.title}
              </h2>
              {expectedOutcomeSection.subtitle && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
                  {expectedOutcomeSection.subtitle}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {expectedOutcomeSection.bullet_points?.map((point, index) => (
                <div
                  key={index}
                  className="group bg-gradient-to-br from-emerald-50 to-sky-50 rounded-xl p-6 border-2 border-gray-100 hover:border-emerald-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {point.title}
                      </h3>
                      {point.description && (
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {point.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
