import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from './components/Navbar';
import { getServerSession } from "next-auth";
import SessionProvider from "./components/SessionProvider";
import Footer from "./Footer";
import {redirect} from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title:{
        absolute: "",
        default: "BrainKB",
        template: "%s | BrainKB",
    },
  description: "A large scale Neuroscience Knowledge Graph Infrastructure",
};

export default async  function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const session = await getServerSession();

  return (
      <html lang="en">
      <body className={inter.className}>
      <SessionProvider session={session}>
          <header>
              <Navbar/>
          </header>


          <main className="flex min-h-screen flex-col p-24">
              {children}
          </main>

          <footer>
              <Footer/>
          </footer>
      </SessionProvider>

      </body>
      </html>
  );
}
