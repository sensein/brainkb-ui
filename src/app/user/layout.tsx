import { Inter } from "next/font/google";
import "../globals.css";
import dynamic from "next/dynamic";

const inter = Inter({ subsets: ["latin"] });

// Dynamically import the sidebar component (client component)
const UserSideBar = dynamic(() => import("../components/layout/UserSideBar"), { ssr: false });

export default async function UserRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <UserSideBar />
      <div className="p-4 sm:ml-64 mt-20">
          <div className="p-4 border-2 border-gray-200 border-dashed rounded-lg dark:border-gray-700">
              {children}
          </div>
      </div>
    </>
  );
}
