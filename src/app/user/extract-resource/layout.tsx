import { PageAccessGate } from "@/src/app/components/auth/PageAccessGate";

export default function ExtractResourceLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageAccessGate pageKey="tools.extract-resource" label="Resource extraction">
      {children}
    </PageAccessGate>
  );
}
