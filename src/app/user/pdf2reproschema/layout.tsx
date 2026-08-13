import { PageAccessGate } from "@/src/app/components/auth/PageAccessGate";

export default function Pdf2ReproschemaLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageAccessGate pageKey="tools.pdf2reproschema" label="PDF → Reproschema">
      {children}
    </PageAccessGate>
  );
}
