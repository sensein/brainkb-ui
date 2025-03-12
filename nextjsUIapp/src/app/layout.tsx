import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import Navbar from './components/Navbar';
import {getServerSession} from "next-auth";
import SessionProvider from "./components/SessionProvider";
import Footer from "./Footer";
import {redirect} from "next/navigation";

const inter = Inter({subsets: ["latin"]});

export const metadata: Metadata = {
    title: {
        absolute: "",
        default: "BrainKB",
        template: "%s | BrainKB",
    },
    description: "A large scale Neuroscience Knowledge Graph Infrastructure",
};

export default async function RootLayout({
                                             children,
                                         }: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await getServerSession();

    return (
        <html lang="en">
        <head>

            <script async src="https://www.googletagmanager.com/gtag/js?id=G-3WBJJSZNMR"></script>
            <script dangerouslySetInnerHTML={{
                __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', 'G-3WBJJSZNMR');
                `
            }}/>
            <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests"/>


        </head>
        <body className={inter.className}>

        <SessionProvider session={session}>
            <header>
                <Navbar/>
            </header>


            <main className="flex min-h-screen flex-col">

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
