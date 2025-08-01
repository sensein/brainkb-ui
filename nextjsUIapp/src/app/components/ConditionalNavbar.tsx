"use client";
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import NavbarAdmin from './NavBarAdmin';

const ConditionalNavbar = () => {
  const pathname = usePathname();
  
  // Check if we're on an admin page
  const isAdminPage = pathname?.startsWith('/admin');
  
  if (isAdminPage) {
    return <NavbarAdmin />;
  }
  
  return <Navbar />;
};

export default ConditionalNavbar; 