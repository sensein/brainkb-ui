"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import SignInButtons from "@/src/app/components/auth/SignInButtons";
import { instrumentSerif, plexSans, plexMono, dmSans } from "./fonts";
import { COLORS } from "./tokens";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/mcp", label: "Use with AI" },
  { href: "/explore", label: "Explore knowledge" },
  { href: "/knowledge-base/synth-scholar", label: "Literature reviews" },
  { href: "/skills", label: "Extraction tools" },
  { href: "/tutorial", label: "Tutorial" },
];

export default function MarketingHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  return (
    <header
      className={`${instrumentSerif.variable} ${plexSans.variable} ${plexMono.variable} ${dmSans.variable}`}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(255,255,255,.92)",
        backdropFilter: "blur(8px)",
        borderBottom: `1px solid ${COLORS.border}`,
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          padding: "0 clamp(16px, 3vw, 40px)",
          minHeight: 76,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          aria-label="BrainKB home"
          style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, fontWeight: 700, letterSpacing: "-.8px", color: COLORS.ink }}
        >
          <Image src="/brainkb_logo.png" alt="" width={38} height={38} style={{ width: 38, height: 38, borderRadius: "50%" }} priority />
          BrainKB
        </Link>
        <nav aria-label="Main navigation" style={{ display: "flex", gap: 28, fontSize: 14, flexWrap: "wrap", alignItems: "center", color: "#596476" }}>
          {NAV_LINKS.map((link) => {
            // A section's pages count too (e.g. one review under Literature reviews).
            const active = pathname === link.href || (link.href !== "/" && !!pathname?.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                style={{ color: active ? COLORS.accent : "#596476", fontWeight: active ? 600 : 400 }}
              >
                {link.label}
              </Link>
            );
          })}
          {session ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Link href="/user/dashboard" style={{ color: COLORS.ink, fontWeight: 500 }}>
                {session.user?.name || session.user?.email}
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  font: "600 14px var(--font-dm-sans), system-ui, sans-serif",
                  padding: "8px 14px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 7,
                  background: "#fff",
                  color: COLORS.ink,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <SignInButtons />
          )}
        </nav>
      </div>
    </header>
  );
}
