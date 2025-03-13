import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { getServerSession } from "next-auth";
import SessionProvider from "./components/SessionProvider";
import Footer from "./Footer";
import dynamic from "next/dynamic"; // Required for Client Component import

// Dynamically import the CookieConsentBanner (client component)
const CookieConsentBanner = dynamic(() => import("./components/CookieConsent"), { ssr: false });

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

          <main className="flex min-h-screen flex-col">{children}</main>

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
