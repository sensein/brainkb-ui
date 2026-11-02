import Image from "next/image";
import Link from "next/link";
import { dmSans } from "./fonts";
import { COLORS } from "./tokens";

const LINKS = [
  { href: "https://docs.brainkb.org", label: "Docs" },
  { href: "https://github.com/sensein/brainkb", label: "GitHub" },
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/contact", label: "Contact" },
];

export default function MarketingFooter() {
  return (
    <footer
      className={dmSans.variable}
      style={{
        borderTop: `1px solid ${COLORS.border}`,
        marginTop: "auto",
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
        color: COLORS.muted,
      }}
    >
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "48px clamp(16px, 3vw, 40px) 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "32px 96px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 320px" }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 19, fontWeight: 700, letterSpacing: "-.5px", color: COLORS.ink }}>
              <Image src="/brainkb_logo.png" alt="" width={32} height={32} style={{ width: 32, height: 32, borderRadius: "50%" }} />
              BrainKB
            </Link>
            <p style={{ margin: "14px 0 0", maxWidth: "56ch", fontSize: 14, lineHeight: 1.65, color: "#5d6878" }}>
              An open neuroscience knowledge graph supported by U24MH130918 (BICAN Knowledgebase), P41EB019936
              (ReproNim), U24MH136628 (BBQS), UM1NS132358 (Brain Connects), and the MIT MGAIC consortium.
            </p>
          </div>
          <nav aria-label="About" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, fontSize: 14 }}>
            <h4 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: COLORS.ink }}>About</h4>
            {LINKS.map((l) => (
              <a key={l.label} href={l.href} style={{ color: "#5d6878" }}>
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${COLORS.border}`, fontSize: 13 }}>
          © {new Date().getFullYear()} BrainKB · Senseable Intelligence Group, MIT
        </div>
      </div>
    </footer>
  );
}
