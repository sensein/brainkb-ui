import { PageAccessGate } from "@/src/app/components/auth/PageAccessGate";

export default function SynthScholarLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageAccessGate pageKey="tools.synth-scholar" label="SynthScholar">
      {children}
    </PageAccessGate>
  );
}
