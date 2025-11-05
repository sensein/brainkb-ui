"use client";
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from './Navbar';

const ConditionalNavbar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
//   we removed /admin as it's more of a user. NavBarAdmin is not being used.
//   // Check if we're on an admin page
//   const isAdminPage = pathname?.startsWith('/user');
//
//   // Show admin navbar only on admin pages
//   if (isAdminPage) {
//     return <NavbarAdmin />;
//   }
  
  // Show regular navbar for all other pages (including home page)
  return <Navbar />;
};

export default ConditionalNavbar; 