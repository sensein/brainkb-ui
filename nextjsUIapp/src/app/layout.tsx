import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { getServerSession } from "next-auth";
import SessionProvider from "./components/SessionProvider";
import Footer from "./Footer";
import dynamic from "next/dynamic"; // Required for Client Component import
// Dynamically import the BrainKB Assistant client component
// import BrainKBAssistantClient from "./components/BrainKBAssistantClient";
import BrainKBAssistantWrapper from "./components/BrainKBAssistantClient";

// Dynamically import the CookieConsentBanner (client component)
const CookieConsentBanner = dynamic(() => import("./components/CookieConsent"), { ssr: false, loading: () => (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
          <span className="text-sm text-gray-600">Loading assistant...</span>
        </div>
      </div>
    </div>
  )
});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "BrainKB",
    template: "%s | BrainKB",
  },
  description: "A large-scale Neuroscience Knowledge Graph Infrastructure",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  return (
    <html lang="en">
      <head>

        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      </head>
      <body className={inter.className}>
        {/* Google Tag Manager NoScript - Runs only if consent is given */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-W79DN38R"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>

        <SessionProvider session={session}>
          <header>
            <Navbar />
          </header>

          <main className="flex min-h-screen flex-col">{children}
          <BrainKBAssistantWrapper />
          </main>

          <footer>
            <Footer />
          </footer>
        </SessionProvider>

        {/* Client-side Cookie Consent Banner */}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
