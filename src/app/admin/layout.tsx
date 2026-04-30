import type { Metadata } from "next";
import { Theme } from "@/src/app/components/design-system";
import "../user/dashboard/fonts.css";
import { AdminShell } from "./AdminShell";

export const metadata: Metadata = {
  title: "Admin",
};

// The legacy site navbar is mounted by the root layout; this layout only
// supplies the bkb Theme tokens that the admin pages use.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Theme theme="light" style={{ background: "#f0eee9", minHeight: "calc(100vh - 64px)" }}>
      <AdminShell>{children}</AdminShell>
    </Theme>
  );
}
