import "../globals.css";
import "./dashboard/fonts.css";
import { Theme } from "@/src/app/components/design-system";
import { UserBreadcrumb } from "./UserBreadcrumb";
import { UserBanGate } from "./UserBanGate";
import { AuthGate } from "@/src/app/components/auth/AuthGate";

// User routes render under the original site navbar (mounted by the root
// layout via ConditionalNavbar). AuthGate enforces sign-in for the entire
// /user/* surface — without it, /user/dashboard renders to anonymous users.
// UserBanGate then replaces children with a suspension notice if the
// authenticated user has been banned by an admin. UserBreadcrumb provides
// the "← Back to dashboard" link and breathing room under the fixed navbar.
export default function UserRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Theme theme="light" style={{ background: "#f0eee9", minHeight: "calc(100vh - 64px)" }}>
      <UserBreadcrumb />
      <AuthGate>
        <UserBanGate>{children}</UserBanGate>
      </AuthGate>
    </Theme>
  );
}
