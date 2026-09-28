"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import SignInButtons from "@/src/app/components/auth/SignInButtons";
import { instrumentSerif, plexSans, plexMono } from "./fonts";
import { COLORS } from "./tokens";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/mcp", label: "Use with AI" },
  { href: "/explore", label: "Explore the graph" },
  { href: "/skills", label: "Extraction tools" },
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
      className={`${instrumentSerif.variable} ${plexSans.variable} ${plexMono.variable}`}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(244,241,234,.9)",
        backdropFilter: "blur(8px)",
        borderBottom: `1px solid ${COLORS.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/brainkb_logo.png" alt="BrainKB Logo" width={28} height={28} style={{ height: 28, width: "auto" }} priority />
          <span
            style={{
              font: "400 20px var(--font-instrument-serif), serif",
              letterSpacing: "-.01em",
              color: COLORS.ink,
            }}
          >
            BrainKB
          </span>
        </Link>
        <nav style={{ display: "flex", gap: 26, fontSize: 14, flexWrap: "wrap", alignItems: "center" }}>
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{ color: active ? COLORS.accent : COLORS.ink }}
              >
                {link.label}
              </Link>
            );
          })}
          {session ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Link href="/user/dashboard" style={{ color: COLORS.ink }}>
                {session.user?.name || session.user?.email}
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  font: "500 13px var(--font-plex-mono)",
                  padding: "7px 12px",
                  border: `1px solid ${COLORS.borderStrong}`,
                  borderRadius: 999,
                  background: "transparent",
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
