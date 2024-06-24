import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from './Navbar';
import Footer from "./Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title:{
        absolute: "",
        default: "BrainKB",
        template: "%s | BrainKB",
    },
  description: "A large scale Neuroscience Knowledge Graph Infrastructure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en">
      <body className={inter.className}>
      <header>
          <Navbar />
      </header>


      <main className="flex min-h-screen flex-col p-24">
          {children}
      </main>

      <footer>
         <Footer/>
      </footer>
</body>
      </html>
  );
}
