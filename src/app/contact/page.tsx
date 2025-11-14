"use client";

import type { Metadata } from "next";
import { useState } from "react";
import yaml from "@/src/app/components/contact.yaml";
import { EnvelopeIcon, PhoneIcon, MapPinIcon } from "@heroicons/react/24/solid";

export default function ContactPage() {
  const contactData = yaml.contact;
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000); // Simulate form submission
  };

  const iconMap = {
    email: <EnvelopeIcon className="w-6 h-6 text-white" />,
    phone: <PhoneIcon className="w-6 h-6 text-white" />,
    location: <MapPinIcon className="w-6 h-6 text-white" />,
  };

  if (!contactData) {
    return <p className="text-center text-red-500">Contact information is not available.</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-sky-50">
      {/* Hero Section */}
      {contactData.title && (
        <section className="py-20 bg-gradient-to-br from-sky-50 via-white to-emerald-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mt-[30px]">
              <h1 className="text-5xl sm:text-6xl font-extrabold mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-600 to-emerald-600">
                  {contactData.title}
                </span>
              </h1>
              {contactData.subtitle && (
                <p className="text-xl sm:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
                  {contactData.subtitle}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Contact Details Section */}
        {contactData.details && contactData.details.length > 0 && (
          <section className="mb-20">
            <div className="grid md:grid-cols-3 gap-6">
              {contactData.details.map((item, index) => (
                <div 
                  key={index} 
                  className="group bg-gradient-to-br from-sky-50 to-white rounded-xl p-6 border-2 border-gray-100 hover:border-sky-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        {iconMap[item.icon]}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{item.label}</h3>
                      <p className="text-gray-700 leading-relaxed">{item.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact Form */}
        {contactData.form && (
          <section className="bg-gradient-to-br from-white to-sky-50 rounded-xl p-8 border-2 border-gray-100 shadow-lg">
            {contactData.form.title && (
              <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                {contactData.form.title}
              </h2>
            )}
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
              {contactData.form.fields && contactData.form.fields.length > 0 && contactData.form.fields.map((field, index) => (
                <div key={index}>
                  {field.type === "textarea" ? (
                    <textarea
                      name={field.name}
                      placeholder={field.placeholder}
                      className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200 bg-white"
                      rows={6}
                      required
                      onChange={handleChange}
                    />
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      placeholder={field.placeholder}
                      className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200 bg-white"
                      required
                      onChange={handleChange}
                    />
                  )}
                </div>
              ))}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold p-4 rounded-lg hover:from-sky-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                {contactData.form.submit_text}
              </button>
            </form>

            {/* Success Message */}
            {submitted && (
              <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg text-center">
                <p className="text-green-700 font-semibold">
                  Thank you! Your message has been sent.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
