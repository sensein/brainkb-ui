/**
 * One legal page (privacy, fair use, data sharing, …) — a YAML file in
 * ../content (see content/README.md), rendered by PolicyDoc.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MarketingHeader from "../../components/marketing/MarketingHeader";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { dmSans, plexMono } from "../../components/marketing/fonts";
import PolicyDoc from "../PolicyDoc";
import { formatDate, loadPageText, loadPolicies, searchDocs } from "../content";
import "../../components/marketing/landing/landing.css";
import "../../tutorial/tutorial.css";
import "../legal.css";

export function generateStaticParams() {
  return loadPolicies().map((p) => ({ id: p.id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const policy = loadPolicies().find((p) => p.id === id);
  return policy ? { title: policy.name, description: policy.tagline } : {};
}

export default async function PolicyPage({ params }: Props) {
  const { id } = await params;
  const policies = loadPolicies();
  const i = policies.findIndex((p) => p.id === id);
  if (i < 0) notFound();
  const policy = policies[i];
  const doc = searchDocs([policy])[0];
  const words = [policy.summary, ...doc.sections.map((s) => s.text)].join(" ").split(/\s+/).length;
  const link = (p?: (typeof policies)[number]) => (p ? { id: p.id, name: p.name } : undefined);

  return (
    <div className={`lp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />
      <main className="wrap">
        <PolicyDoc
          policy={policy}
          policies={policies.map(({ id, name }) => ({ id, name }))}
          number={i + 1}
          doc={doc}
          updated={formatDate(policy.last_updated, "short")}
          minutes={Math.max(1, Math.round(words / 230))}
          prev={link(policies[i - 1])}
          next={link(policies[i + 1])}
          contactText={loadPageText()}
          versions={policy.history.map((v) => ({ ...v, when: formatDate(v.date, "short") }))}
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
