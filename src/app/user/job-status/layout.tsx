import { PageAccessGate } from "@/src/app/components/auth/PageAccessGate";

export default function JobStatusLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageAccessGate pageKey="tools.job-status" label="Job status">
      {children}
    </PageAccessGate>
  );
}
