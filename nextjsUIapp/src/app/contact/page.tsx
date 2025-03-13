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
    email: <EnvelopeIcon className="w-6 h-6 text-blue-500" />,
    phone: <PhoneIcon className="w-6 h-6 text-blue-500" />,
    location: <MapPinIcon className="w-6 h-6 text-blue-500" />,
  };

  if (!contactData) {
    return <p className="text-center text-red-500">Contact information is not available.</p>;
  }

  return (
    <div className="p-8 space-y-12 set-margin-hundred">
      {/* Page Header */}
      {contactData.title && (
        <div className="text-center">
          <h1 className="text-4xl font-bold text-sky-900">{contactData.title}</h1>
          {contactData.subtitle && <p className="text-lg text-gray-600 mt-2 max-w-3xl mx-auto">{contactData.subtitle}</p>}
        </div>
      )}

      {/* Contact Details Section */}
      {contactData.details && contactData.details.length > 0 && (
        <section className="grid md:grid-cols-3 gap-6">
          {contactData.details.map((item, index) => (
            <div key={index} className="p-6 bg-gray-50 rounded-lg shadow-md flex items-center space-x-4">
              {iconMap[item.icon]}
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{item.label}</h3>
                <p className="text-gray-600">{item.value}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Contact Form */}
      {contactData.form && (
        <section className="bg-gray-100 p-8 rounded-lg shadow-md">
          {contactData.form.title && <h2 className="text-2xl font-semibold text-sky-900 mb-4">{contactData.form.title}</h2>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {contactData.form.fields && contactData.form.fields.length > 0 && contactData.form.fields.map((field, index) => (
              <div key={index}>
                {field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    placeholder={field.placeholder}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    required
                    onChange={handleChange}
                  />
                ) : (
                  <input
                    type={field.type}
                    name={field.name}
                    placeholder={field.placeholder}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    onChange={handleChange}
                  />
                )}
              </div>
            ))}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-semibold p-3 rounded-lg hover:bg-blue-700 transition duration-200"
            >
              {contactData.form.submit_text}
            </button>
          </form>

          {/* Success Message */}
          {submitted && (
            <p className="text-green-600 text-center font-semibold mt-4">
              Thank you! Your message has been sent.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
