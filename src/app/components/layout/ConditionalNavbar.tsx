"use client";
import Navbar from './Navbar';

// The original site navbar (logo + Home / Knowledge Base / HMBA Taxonomy /
// Data Visualization / StructSense / Resources / About / user dropdown) is
// the canonical top chrome and renders on every route. Earlier work tried
// to swap in a prototype-style Topbar; that was reverted.
const ConditionalNavbar = () => <Navbar />;

export default ConditionalNavbar;
