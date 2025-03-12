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
            <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests"/>
            {/* Google Tag Manager */}
            <script dangerouslySetInnerHTML={{
                __html: `
(function(w,d,s,l,i){w[l] = w[l] || [];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-W79DN38R');
`
            }}/>
            {/* End Google Tag Manager */}

        </head>
        <body className={inter.className}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
            <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-W79DN38R"
                    height="0" width="0" style={{display: "none", visibility: "hidden"}}/>
        </noscript>
        {/* End Google Tag Manager (noscript) */}

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
