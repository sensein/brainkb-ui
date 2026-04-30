import { PageAccessGate } from "@/src/app/components/auth/PageAccessGate";

export default function SieLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageAccessGate pageKey="tools.ner-extraction" label="NER extraction">
      {children}
    </PageAccessGate>
  );
}
