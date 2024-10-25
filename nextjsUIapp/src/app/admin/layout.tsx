import { Inter } from "next/font/google";
import "../globals.css";
import NavbarAdmin from "@/src/app/components/NavBarAdmin";
import FooterAdmin from "@/src/app/components/FooterAdmin";
import { getServerSession } from "next-auth";
import SessionProvider from "@/src/app/components/SessionProvider";


const inter = Inter({ subsets: ["latin"] });



export default async  function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const session = await getServerSession();

  return (
      <SessionProvider session={session}>
          <header>
              <NavbarAdmin/>
          </header>
          <div className="p-4 sm:ml-64">
              <div className="p-4 border-2 border-gray-200 border-dashed rounded-lg dark:border-gray-700 mt-14">

                  {children}
              </div>

              </div>



    <footer>
        @
    </footer>
</SessionProvider>

)
    ;
}
