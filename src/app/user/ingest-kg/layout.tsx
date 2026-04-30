import { PageAccessGate } from "@/src/app/components/auth/PageAccessGate";

// Default-deny gate: until an admin creates a /admin/page-access entry for
// `tools.ingest-kg` and grants roles or users, this route returns the denied
// page. Admins are exempt.
export default function IngestKgLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageAccessGate pageKey="tools.ingest-kg" label="Ingest KGs">
      {children}
    </PageAccessGate>
  );
}
