"use client";

/**
 * What a review brings beyond its result fields: the files kept with it (an
 * imported local run's manuscript, PDF, figures, tables, RDF and verification
 * reports) and its provenance record — where it came from, which SynthScholar
 * version and model produced it, how the search ran, what each screening decision
 * was judged on, how full texts were obtained, and where it went in the graph.
 *
 * Shared by the public review page and the owner's review view. Public reviews'
 * files load from their public URLs; an owner's private files need the bearer
 * token, so they are fetched and shown from object URLs.
 */

import React from "react";
import { Download, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";
import { fetchArtifact, publicArtifactUrl } from "@/src/services/api/synthScholar";
import type { ReviewArtifact, ReviewDetail, ReviewProvenance } from "@/src/types/synthScholar";

type Access = { reviewId: string; isPublic: boolean };

const MB = 1024 * 1024;
export const formatBytes = (n?: number | null) =>
  n == null ? "—" : n >= MB ? `${(n / MB).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`;
const when = (s?: string | null) => (s ? new Date(s).toLocaleString() : "—");
const isImage = (a: ReviewArtifact) => /^image\//.test(a.media_type);

export const MANUSCRIPT = "review.manuscript.md";
export const hasManuscript = (artifacts?: ReviewArtifact[]) => !!artifacts?.some((a) => a.path === MANUSCRIPT);

const KIND_LABEL: Record<string, string> = {
  review_result: "Review result", manuscript_pdf: "Manuscript (PDF)", manuscript_markdown: "Manuscript (Markdown)",
  manuscript_sections: "Manuscript sections", manuscript_tex: "Manuscript (LaTeX)", review_markdown: "Review (Markdown)",
  rdf: "RDF", bibliography: "Bibliography", protocol: "Protocol", search_log: "Search log",
  url_verification: "URL verification", citation_verification: "Citation verification", readme: "Read me",
  figure: "Figure", figure_data: "Figure data", table: "Table", report: "Report", data: "Data",
  document: "Document", generated_pdf: "PDF (generated)", other: "File",
};

// ── Loading files ────────────────────────────────────────────────────

/** Object/public URLs for the review's images, keyed by path. */
function useImageUrls({ reviewId, isPublic }: Access, artifacts: ReviewArtifact[]) {
  const [urls, setUrls] = React.useState<Record<string, string>>({});
  const key = artifacts.filter(isImage).map((a) => a.path + a.sha256).join("|");
  React.useEffect(() => {
    const images = artifacts.filter(isImage);
    if (isPublic) {
      setUrls(Object.fromEntries(images.map((a) => [a.path, publicArtifactUrl(reviewId, a.path)])));
      return;
    }
    let live = true;
    const made: string[] = [];
    Promise.all(images.map(async (a) => {
      try {
        const u = URL.createObjectURL(await fetchArtifact(reviewId, a.path));
        made.push(u);
        return [a.path, u] as const;
      } catch {
        return null;
      }
    })).then((pairs) => {
      if (live) setUrls(Object.fromEntries(pairs.filter(Boolean) as [string, string][]));
    });
    return () => {
      live = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, isPublic, key]);
  return urls;
}

function useArtifactText({ reviewId, isPublic }: Access, path: string, enabled: boolean) {
  const [state, setState] = React.useState<{ text?: string; error?: string; loading: boolean }>({ loading: enabled });
  React.useEffect(() => {
    if (!enabled) return;
    let live = true;
    setState({ loading: true });
    fetchArtifact(reviewId, path, { isPublic })
      .then((b) => b.text())
      .then((text) => live && setState({ text, loading: false }))
      .catch((e) => live && setState({ error: e instanceof Error ? e.message : String(e), loading: false }));
    return () => { live = false; };
  }, [reviewId, isPublic, path, enabled]);
  return state;
}

async function download({ reviewId, isPublic }: Access, a: ReviewArtifact) {
  const name = a.path.split("/").pop() || "file";
  const href = isPublic ? publicArtifactUrl(reviewId, a.path, true) : URL.createObjectURL(await fetchArtifact(reviewId, a.path));
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  link.click();
  if (!isPublic) setTimeout(() => URL.revokeObjectURL(href), 1000);
}

// ── Manuscript ───────────────────────────────────────────────────────

/** The manuscript a local run wrote (review.manuscript.md), with its figures. */
export function ReviewManuscript({ access, artifacts }: { access: Access; artifacts: ReviewArtifact[] }) {
  const { text, error, loading } = useArtifactText(access, MANUSCRIPT, hasManuscript(artifacts));
  const images = useImageUrls(access, artifacts);
  if (loading) return <Busy label="Loading the manuscript…" />;
  if (error) return <p className="text-sm text-red-600">Could not load the manuscript: {error}</p>;
  if (!text) return null;
  // Pandoc image attributes ({width=100%}) are not Markdown; drop them.
  const md = text.replace(/(!\[[^\]]*\]\([^)]*\))\{[^}]*\}/g, "$1");
  return (
    <MarkdownContent
      style={{ fontSize: 15, lineHeight: 1.7 }}
      resolveImage={(src) => images[src.replace(/^\.\//, "")]}
    >
      {md}
    </MarkdownContent>
  );
}

// ── Files ────────────────────────────────────────────────────────────

export function ReviewFiles({ access, artifacts }: { access: Access; artifacts: ReviewArtifact[] }) {
  const images = useImageUrls(access, artifacts);
  const [err, setErr] = React.useState<string | null>(null);
  const figures = artifacts.filter((a) => isImage(a) && images[a.path]);
  const grab = (a: ReviewArtifact) => download(access, a).catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  if (!artifacts.length) return <p className="text-sm text-gray-500">No files are kept with this review.</p>;
  return (
    <div className="space-y-6">
      {figures.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> Figures</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {figures.map((a) => (
              <figure key={a.path} className="border border-gray-200 rounded-lg p-3 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[a.path]} alt={a.path} className="w-full h-auto" />
                <figcaption className="mt-2 text-xs text-gray-500 font-mono flex justify-between gap-2">
                  <span className="truncate">{a.path}</span>
                  <button type="button" onClick={() => grab(a)} className="text-sky-700 hover:underline shrink-0">Download</button>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><FileText className="w-4 h-4" /> All files ({artifacts.length})</h3>
        {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-700 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">File</th>
                <th className="px-3 py-2 text-left">What</th>
                <th className="px-3 py-2 text-right">Size</th>
                <th className="px-3 py-2 text-left">SHA-256</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {artifacts.map((a) => (
                <tr key={a.path}>
                  <td className="px-3 py-2 font-mono text-xs text-gray-800 break-all">{a.path}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{KIND_LABEL[a.kind] ?? a.kind}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 text-right tabular-nums whitespace-nowrap">{formatBytes(a.size_bytes)}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-gray-400" title={a.sha256}>{a.sha256.slice(0, 12)}…</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => grab(a)} aria-label={`Download ${a.path}`}
                      className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Provenance ───────────────────────────────────────────────────────

/** The review's provenance record (ml_service provenance_view), as readable cards. */
export function ReviewProvenanceDetails({ review }: { review: ReviewDetail }) {
  const p: ReviewProvenance | null | undefined = review.provenance;
  if (!p) return null;
  const o = p.origin;
  const lr = o.local_run ?? {};
  const imported = o.source === "import";
  return (
    <div className="space-y-4">
      <Card title="Origin">
        <Facts rows={[
          ["Source", imported ? "Imported from a local SynthScholar run (its output directory)" : "Run on BrainKB"],
          ...(imported ? [
            ["Run completed", when(o.run_completed_at)],
            ["Imported", when(o.imported_at)],
            ...(o.imported_by ? [["Imported by", o.imported_by]] : []),
            ["Original review id", o.original_review_id || "—"],
            ["Files kept", `${o.file_count ?? "—"} (${formatBytes(o.total_bytes)})`],
            ["Left out", o.skipped?.length ? `${o.skipped.length} file(s) — ${Array.from(new Set(o.skipped.map((s) => s.reason))).join("; ")}` : "nothing"],
          ] as [string, string][] : [
            ["Created", when(o.created_at)],
            ["Completed", when(o.completed_at)],
          ] as [string, string][]),
        ]} />
      </Card>

      {p.software && (
        <Card title="Software">
          <Facts rows={[
            ["SynthScholar", p.software.synthscholar_version || "—"],
            ["Model", p.software.model_name || "—"],
            ["Started", when(p.software.started_at)],
            ...Object.entries(p.software.pipeline_settings ?? {}).slice(0, 12).map(([k, v]) => [k, String(v)] as [string, string]),
          ]} />
        </Card>
      )}

      {(lr.search_log?.length ?? 0) > 0 && (
        <Card title="Searches (as recorded by the run)">
          <Table head={["Database", "Query", "Records", "Date"]} rows={lr.search_log!.map((s) => [
            s.database, <code key="q" className="font-mono text-[11px] break-words">{s.query}</code>, s.count ?? "—", s.date ?? "—",
          ])} />
        </Card>
      )}

      {(p.search_iterations?.length ?? 0) > 0 && (
        <Card title="Search iterations">
          <Table head={["#", "Kind", "Database", "Query", "New", "Cumulative"]} rows={p.search_iterations!.map((s) => [
            s.iteration, s.kind, s.database, <code key="q" className="font-mono text-[11px] break-words">{s.query}</code>, s.new_records, s.cumulative,
          ])} />
        </Card>
      )}

      {(p.plan_iterations?.length ?? 0) > 0 && (
        <Card title="Search plan">
          <Table head={["Iteration", "Decision", "Model", "When", "Feedback"]} rows={p.plan_iterations!.map((x) => [
            x.iteration, x.decision, x.model_name || "—", when(x.generated_at), x.feedback || "—",
          ])} />
        </Card>
      )}

      {p.screening && p.screening.decisions > 0 && (
        <Card title="Screening — what each decision was judged on">
          <Table head={["Stage", "Judged on", "Decisions"]} rows={Object.entries(p.screening.basis_by_stage).flatMap(([stage, c]) =>
            Object.entries(c).map(([basis, n]) => [stage, basis.replace(/_/g, " ") || "—", n]))} />
          {Object.keys(p.screening.full_text_sources).length > 0 && (
            <p className="text-xs text-gray-600 mt-2">Full texts from: {pairs(p.screening.full_text_sources)}</p>
          )}
        </Card>
      )}

      {p.retrieval && p.retrieval.included > 0 && (
        <Card title="Full-text retrieval (included studies)">
          <Facts rows={[
            ["Included", String(p.retrieval.included)],
            ["Read in full text", String(p.retrieval.with_full_text)],
            ["Abstract only", String(p.retrieval.abstract_only)],
            ["Routes", pairs(p.retrieval.routes)],
          ]} />
        </Card>
      )}

      {(p.agents?.length ?? 0) > 0 && (
        <Card title="Agents">
          <Table head={["Agent", "Step", "Model", "Calls", "Tokens", "Failures"]} rows={p.agents!.map((a) => [
            a.agent, a.step, a.model_name, a.calls, a.tokens.toLocaleString(), a.failures,
          ])} />
        </Card>
      )}

      {(lr.citation_verification || lr.url_verification || lr.manuscript_check) && (
        <Card title="Verification (as recorded by the run)">
          <Facts rows={[
            ...(lr.citation_verification ? Object.entries(lr.citation_verification).map(([k, v]) =>
              [`Citations · ${k.replace(/_/g, " ")}`, typeof v === "object" && v ? pairs(v as Record<string, unknown>) : String(v)] as [string, string]) : []),
            ...(lr.url_verification ? [
              ["URLs checked", `${lr.url_verification.checked} (${lr.url_verification.reachable} reachable)`],
              ["URL statuses", pairs(lr.url_verification.statuses)],
              ["URLs checked at", when(lr.url_verification.checked_at)],
            ] as [string, string][] : []),
            ...(lr.manuscript_check ? Object.entries(lr.manuscript_check).map(([k, v]) =>
              [`Manuscript · ${k.replace(/_/g, " ")}`, String(v ?? "—")] as [string, string]) : []),
          ]} />
        </Card>
      )}

      <Card title="Knowledge graph">
        {p.graph_ingests.length ? (
          <Table head={["Space", "Graph", "Ingested", "From", "Job"]} rows={p.graph_ingests.map((g) => [
            g.space_slug, <code key="g" className="font-mono text-[11px] break-all">{g.graph_iri}</code>, when(g.ingested_at),
            g.source_file ?? "—", g.job_id ? <code key="j" className="font-mono text-[11px]">{g.job_id.slice(0, 8)}</code> : "—",
          ])} />
        ) : (
          <p className="text-sm text-gray-500">Not in the knowledge graph yet.</p>
        )}
      </Card>
    </div>
  );
}

// ── Small pieces ─────────────────────────────────────────────────────

const pairs = (o: Record<string, unknown>) => Object.entries(o).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", ") || "—";

function Busy({ label }: { label: string }) {
  return <div className="flex items-center gap-2 text-sm text-gray-500 py-6"><Loader2 className="w-4 h-4 animate-spin" /> {label}</div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-[minmax(10rem,auto)_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([k, v]) => (
        <React.Fragment key={k}>
          <dt className="text-gray-500">{k}</dt>
          <dd className="text-gray-900 break-words">{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={i} className="align-top">{r.map((c, j) => <td key={j} className="px-3 py-1.5 text-gray-800">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
