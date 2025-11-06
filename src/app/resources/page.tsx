"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/src/app/resources/components/unified_ui/card";
import { Button } from "@/src/app/resources/components/unified_ui/button";
import { Badge } from "@/src/app/resources/components/unified_ui/badge";
import { Input } from "@/src/app/resources/components/unified_ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/app/resources/components/unified_ui/dropdown-menu";
import { Skeleton } from "@/src/app/resources/components/unified_ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/src/app/resources/components/unified_ui/dialog";
import {
  Star,
  MoreVertical,
  Tag as TagIcon,
  Calendar,
  Filter,
  ArrowUpDown,
  Search,
  ExternalLink,
  Share2,
  Network,
  Flag,
  BookOpen,
  Link,
  Activity,
  Users,
  FileText,
  Database,
} from "lucide-react";
import { Textarea } from "@/src/app/resources/components/unified_ui/textarea";

import {SortKey, ProvenanceChange, ProvenanceVersion, Provenance, CardItem, NewFeedback} from "@/src/app/resources/types/types"


/* ========== Helpers ========== */

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}
function domainFromUrl(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ========== Provenance UI ========== */
function ProvenanceInline({ p }: { p: Provenance }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {p.sourceUrl ? (
        <a
          href={p.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:underline"
          title={p.sourceUrl}
        >
          {p.sourceLabel || domainFromUrl(p.sourceUrl)}
        </a>
      ) : null}
      {p.owner ? <span>• Owner: {p.owner}</span> : null}
      {p.updated ? <span>• Updated: {formatDate(p.updated)}</span> : null}
      {p.method ? (
        <span className="uppercase text-[10px] tracking-wide rounded border px-1 py-0.5">
          {p.method}
        </span>
      ) : null}
    </div>
  );
}

/** A compact dot timeline (matches your sketch) */
function ProvenanceTimeline({ p }: { p: Provenance }) {
  if (!p.versions?.length) return null;
  const versions = [...p.versions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // For many versions, only show key milestones to avoid overlap
  const shouldShowAll = versions.length <= 4;
  const displayVersions = shouldShowAll
    ? versions
    : [
        versions[0], // First version
        ...versions.slice(1, -1).filter((_, i) => i % 2 === 0), // Every other middle version
        versions[versions.length - 1] // Last version
      ];

  const svgWidth = Math.max(400, displayVersions.length * 120);
  const lineWidth = svgWidth - 80;

  return (
    <div className="w-full rounded-xl border p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Provenance
      </div>
      <ProvenanceInline p={p} />
      <div className="mt-3">
        <svg viewBox={`0 0 ${svgWidth} 80`} className="w-full">
          <line x1="40" y1="35" x2={lineWidth + 40} y2="35" stroke="#c4b5fd" strokeWidth="3" strokeLinecap="round" />
          {displayVersions.map((v, i) => {
            const x = 40 + (i * (lineWidth / Math.max(displayVersions.length - 1, 1)));
            const isCurrent = p.currentVersionId ? v.id === p.currentVersionId : v.id === versions[versions.length - 1].id;
            const isFirst = i === 0;
            const isLast = i === displayVersions.length - 1;

            // Show version number only for first, last, and current
            const showLabel = isFirst || isLast || isCurrent || shouldShowAll;

            return (
              <g key={v.id}>
                <circle cx={x} cy={35} r={isCurrent ? 10 : 7} fill={isCurrent ? "#7c3aed" : "#a78bfa"} />
                {showLabel && (
                  <text x={x} y={60} fontSize="9" textAnchor="middle" fill="#6b7280" className="font-medium">
                    {v.id}
                  </text>
                )}
                {!shouldShowAll && !isFirst && !isLast && !isCurrent && (
                  <text x={x} y={60} fontSize="8" textAnchor="middle" fill="#9ca3af">
                    ...
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {!shouldShowAll && (
          <div className="mt-1 text-center text-xs text-muted-foreground">
            {versions.length} versions total • Use dropdown to select specific version
          </div>
        )}
      </div>
    </div>
  );
}

/** Detailed versions & change list with selector */
function ProvenancePanel({
  p,
  onLoadVersion,
}: {
  p?: Provenance;
  onLoadVersion?: (v: ProvenanceVersion) => void;
}) {
  // Sort versions by date (newest first) for better UX
  const sortedVersions = p?.versions ? [...p.versions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  ) : [];

  const [selectedId, setSelectedId] = useState<string | undefined>(
    p?.currentVersionId || sortedVersions[0]?.id
  );
  const selected = sortedVersions.find((v) => v.id === selectedId);

  useEffect(() => {
    setSelectedId(p?.currentVersionId || sortedVersions[0]?.id);
  }, [p?.currentVersionId, sortedVersions.length]);

  if (!p || !sortedVersions.length) return null;

  return (
    <div className="rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground">Version</label>
        <select
          className="rounded-md border px-2 py-1 text-sm min-w-[200px]"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {sortedVersions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} — {formatDate(v.date)}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => selected && onLoadVersion?.(selected)}
          disabled={!selected}
        >
          Load version
        </Button>
      </div>

      {selected ? (
        <div className="mt-3 rounded-lg border bg-muted/30 p-2">
          <div className="mb-1 text-xs text-muted-foreground">
            Changes in <strong>{selected.label}</strong>
            {selected.authoredBy ? (
              <>
                {" "}by <span className="font-medium">{selected.authoredBy}</span>
              </>
            ) : null}
            , {formatDate(selected.date)}
          </div>
          <ul className="space-y-1 text-sm">
            {selected.changes.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <div>
                  <span className="font-medium">{c.field}</span>{" "}
                  {c.from || c.to ? (
                    <>
                      <span className="rounded bg-red-50 px-1 text-[11px] text-red-700 line-through">
                        {c.from ?? ""}
                      </span>{" "}
                      →{" "}
                      <span className="rounded bg-emerald-50 px-1 text-[11px] text-emerald-700">
                        {c.to ?? ""}
                      </span>
                    </>
                  ) : null}
                  {c.note ? <div className="text-xs text-muted-foreground">{c.note}</div> : null}
                </div>
              </li>
            ))}
          </ul>
    </div>
      ) : null}
    </div>
  );
}

/** Compare section with three dropdowns for timestamp selection */
function CompareSection({
  provenance,
  selections,
  onSelectionChange,
  onCompare,
  comparisonResults,
  onClearResults,
}: {
  provenance?: Provenance;
  selections: (string | null)[];
  onSelectionChange: (index: number, versionId: string | null) => void;
  onCompare: () => void;
  comparisonResults?: any[];
  onClearResults: () => void;
}) {
  const versions = provenance?.versions || [];
  const hasSelections = selections.some(s => s !== null);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-3">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Compare (up to 3 timestamps)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-2">
              <label className="text-sm font-medium">Time {index + 1}:</label>
              <select
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={selections[index] || ""}
                onChange={(e) => onSelectionChange(index, e.target.value || null)}
              >
                <option value="">Select timestamp...</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} — {formatDate(v.date)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {hasSelections && (
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              onClick={onCompare}
              disabled={selections.filter(s => s !== null).length < 2}
            >
              Compare Selected Timestamps
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onSelectionChange(0, null);
                onSelectionChange(1, null);
                onSelectionChange(2, null);
                onClearResults();
              }}
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Comparison Results Table */}
      {comparisonResults && comparisonResults.length > 0 && (
        <div className="rounded-xl border p-3">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Comparison Results
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Field</th>
                  {comparisonResults.map((result, index) => (
                    <th key={index} className="text-left py-2 px-3 font-medium min-w-48">
                      {result.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-3 font-medium">Version</td>
                  {comparisonResults.map((result, index) => (
                    <td key={index} className="py-2 px-3">{result.label}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 font-medium">Date</td>
                  {comparisonResults.map((result, index) => (
                    <td key={index} className="py-2 px-3">{formatDate(result.date)}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 font-medium">Author</td>
                  {comparisonResults.map((result, index) => (
                    <td key={index} className="py-2 px-3">{result.authoredBy || "—"}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 font-medium">Changes</td>
                  {comparisonResults.map((result, index) => (
                    <td key={index} className="py-2 px-3">
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {result.changes.map((change: any, changeIndex: number) => (
                          <div key={changeIndex} className="text-xs">
                            <span className="font-medium">{change.field}</span>
                            {change.from && change.to && (
                              <div className="mt-1">
                                <span className="text-red-600 line-through">{change.from}</span>
                                <span className="mx-1">→</span>
                                <span className="text-green-600">{change.to}</span>
                              </div>
                            )}
                            {change.note && (
                              <div className="text-muted-foreground mt-1">{change.note}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== Dummy Data - Ontology Focused ========== */
const ITEMS: CardItem[] = [
  {
    id: "1",
    title: "BRCA1 Gene",
    description: "Breast cancer type 1 susceptibility protein. Tumor suppressor gene involved in DNA repair and cell cycle control.",
    tags: ["gene", "cancer", "DNA-repair"],
    rating: 4.9,
    date: "2025-08-08",
    href: "https://www.genecards.org/cgi-bin/carddisp.pl?gene=BRCA1",
    relatedIds: ["2", "3", "4"],
    ontologyType: "Gene Ontology",
    ontologyId: "GO:0003677",
    molecularFunction: "DNA binding, protein binding, zinc ion binding, ubiquitin-protein ligase activity",
    biologicalProcess: "DNA repair, cell cycle checkpoint, homologous recombination, transcription regulation",
    cellularComponent: "nucleus, cytoplasm, centrosome, nuclear body",
    synonyms: ["BRCA1", "BRCAI", "BRCC1", "RNF53", "PSCP"],
    crossReferences: [
      { database: "HGNC", id: "1100", url: "https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/HGNC:1100" },
      { database: "OMIM", id: "113705", url: "https://www.omim.org/entry/113705" },
      { database: "UniProt", id: "P38398", url: "https://www.uniprot.org/uniprot/P38398" },
      { database: "Ensembl", id: "ENSG00000012048", url: "https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=ENSG00000012048" },
    ],
    publications: [
      { title: "A strong candidate for the breast and ovarian cancer susceptibility gene BRCA1", authors: "Hall JM, Lee MK, Newman B, et al.", journal: "Science", year: 1990, pmid: "1301234" },
      { title: "BRCA1 and BRCA2: different roles in a common pathway of genome protection", authors: "Roy R, Chun J, Powell SN", journal: "Nature Reviews Cancer", year: 2012, pmid: "22285181" },
    ],
    pathways: [
      { name: "Homologous Recombination", description: "DNA double-strand break repair pathway", url: "https://www.genome.jp/kegg-bin/show_pathway?hsa03440" },
      { name: "Cell Cycle Checkpoints", description: "G1/S and G2/M checkpoint regulation", url: "https://www.genome.jp/kegg-bin/show_pathway?hsa04110" },
    ],
    expressionData: [
      { tissue: "Breast", level: "high" },
      { tissue: "Ovary", level: "high" },
      { tissue: "Testis", level: "medium" },
      { tissue: "Brain", level: "low" },
    ],
    clinicalSignificance: [
      { variant: "c.5266dupC", significance: "Pathogenic", description: "Frameshift mutation leading to protein truncation" },
      { variant: "c.68_69delAG", significance: "Pathogenic", description: "Frameshift mutation in exon 2" },
      { variant: "c.3113G>A", significance: "Benign", description: "Synonymous variant with no functional impact" },
    ],
    provenance: {
      sourceUrl: "https://www.genecards.org",
      sourceLabel: "GeneCards",
      owner: "bioinformatics@university.edu",
      updated: "2025-08-08",
      method: "curated",
      currentVersionId: "v2.1",
      versions: [
        {
          id: "v2.1",
          label: "v2.1 (pathway update)",
          date: "2025-08-07",
          authoredBy: "dr.smith@university.edu",
          changes: [
            { field: "description", from: "Tumor suppressor gene", to: "Breast cancer type 1 susceptibility protein. Tumor suppressor gene involved in DNA repair and cell cycle control.", note: "Added detailed molecular function" },
            { field: "tags", from: "gene, cancer", to: "gene, cancer, DNA-repair", note: "Added DNA repair pathway" },
            { field: "pathways", from: "—", to: "Homologous Recombination, Cell Cycle Checkpoints", note: "Added pathway information" },
            { field: "clinicalSignificance", from: "—", to: "3 variants added", note: "Added clinical variant data" },
          ],
        },
        {
          id: "v2.0",
          label: "v2.0 (GO annotation)",
          date: "2025-07-20",
          authoredBy: "curator@go.org",
          changes: [
            { field: "ontologyId", from: "—", to: "GO:0003677", note: "Added Gene Ontology molecular function annotation" },
            { field: "molecularFunction", from: "—", to: "DNA binding, protein binding, zinc ion binding", note: "Added molecular function details" },
            { field: "biologicalProcess", from: "—", to: "DNA repair, cell cycle checkpoint", note: "Added biological process information" },
            { field: "crossReferences", from: "—", to: "HGNC, OMIM, UniProt", note: "Added basic cross-references" },
          ],
        },
        {
          id: "v1.0",
          label: "v1.0 (initial)",
          date: "2025-06-15",
          authoredBy: "bioinformatics-team",
          changes: [
            { field: "created", note: "Initial gene entry with basic information" },
            { field: "description", from: "—", to: "Tumor suppressor gene", note: "Basic gene description" },
            { field: "tags", from: "—", to: "gene, cancer", note: "Initial tags" },
          ]
        },
      ],
    },
  },
  {
    id: "2",
    title: "DNA Repair Process",
    description: "Biological process that corrects DNA damage and maintains genomic integrity through various repair mechanisms including base excision repair, nucleotide excision repair, and homologous recombination.",
    tags: ["biological-process", "DNA-repair", "genomic-stability", "homologous-recombination", "excision-repair"],
    rating: 4.8,
    date: "2025-07-14",
    href: "https://www.ebi.ac.uk/QuickGO/term/GO:0006281",
    relatedIds: ["1", "3", "5"],
    ontologyType: "Gene Ontology",
    ontologyId: "GO:0006281",
    molecularFunction: "DNA binding, endonuclease activity, helicase activity, ligase activity",
    biologicalProcess: "DNA repair, base excision repair, nucleotide excision repair, homologous recombination, mismatch repair",
    cellularComponent: "nucleus, chromatin, replication fork, DNA repair complex",
    synonyms: ["DNA damage response", "DNA repair pathway", "Genomic maintenance", "DNA integrity checkpoint"],
    crossReferences: [
      { database: "GO", id: "GO:0006281", url: "https://www.ebi.ac.uk/QuickGO/term/GO:0006281" },
      { database: "Reactome", id: "R-HSA-73857", url: "https://reactome.org/content/detail/R-HSA-73857" },
      { database: "KEGG", id: "hsa03420", url: "https://www.genome.jp/kegg-bin/show_pathway?hsa03420" },
      { database: "UniProt", id: "P04637", url: "https://www.uniprot.org/uniprot/P04637" },
    ],
    publications: [
      { title: "DNA repair mechanisms and human disease", authors: "Jackson SP, Bartek J", journal: "Nature", year: 2009, pmid: "19876091" },
      { title: "The DNA damage response: putting checkpoints in perspective", authors: "Harper JW, Elledge SJ", journal: "Nature", year: 2007, pmid: "18046425" },
      { title: "DNA double-strand break repair: from mechanistic understanding to cancer treatment", authors: "Lieber MR", journal: "DNA Repair", year: 2008, pmid: "18242100" },
    ],
    pathways: [
      { name: "Base Excision Repair", description: "Repair of damaged bases through base removal and replacement", url: "https://reactome.org/content/detail/R-HSA-73857" },
      { name: "Nucleotide Excision Repair", description: "Removal of bulky DNA lesions and UV-induced damage", url: "https://reactome.org/content/detail/R-HSA-73893" },
      { name: "Homologous Recombination", description: "High-fidelity repair of DNA double-strand breaks", url: "https://reactome.org/content/detail/R-HSA-73857" },
    ],
    expressionData: [
      { tissue: "Liver", level: "high" },
      { tissue: "Kidney", level: "high" },
      { tissue: "Brain", level: "medium" },
      { tissue: "Muscle", level: "low" },
    ],
    clinicalSignificance: [
      { variant: "rs1801426", significance: "Benign", description: "Common polymorphism with no clinical significance" },
      { variant: "rs1801427", significance: "Pathogenic", description: "Associated with increased cancer risk" },
    ],
    provenance: {
      sourceUrl: "https://www.ebi.ac.uk/QuickGO",
      sourceLabel: "QuickGO",
      owner: "go-curators@ebi.ac.uk",
      updated: "2025-07-20",
      method: "reviewed",
      currentVersionId: "v5.0",
      versions: [
        {
          id: "v5.0",
          label: "v5.0 (comprehensive update)",
          date: "2025-07-20",
          authoredBy: "dr.jones@ebi.ac.uk",
          changes: [
            { field: "description", from: "Biological process that corrects DNA damage", to: "Biological process that corrects DNA damage and maintains genomic integrity through various repair mechanisms including base excision repair, nucleotide excision repair, and homologous recombination", note: "Added detailed repair mechanisms" },
            { field: "tags", from: "biological-process, DNA-repair, genomic-stability", to: "biological-process, DNA-repair, genomic-stability, homologous-recombination, excision-repair", note: "Added specific repair pathway tags" },
            { field: "molecularFunction", from: "DNA binding", to: "DNA binding, endonuclease activity, helicase activity, ligase activity", note: "Added enzymatic activities" },
            { field: "biologicalProcess", from: "DNA repair", to: "DNA repair, base excision repair, nucleotide excision repair, homologous recombination, mismatch repair", note: "Added specific repair processes" },
            { field: "cellularComponent", from: "nucleus", to: "nucleus, chromatin, replication fork, DNA repair complex", note: "Added cellular locations" },
            { field: "synonyms", from: "DNA damage response", to: "DNA damage response, DNA repair pathway, Genomic maintenance, DNA integrity checkpoint", note: "Added alternative names" },
            { field: "crossReferences", from: "GO:0006281", to: "GO, Reactome, KEGG, UniProt", note: "Added multiple database references" },
            { field: "publications", from: "1 publication", to: "3 key publications", note: "Added landmark papers" },
            { field: "pathways", from: "Base Excision Repair", to: "Base Excision Repair, Nucleotide Excision Repair, Homologous Recombination", note: "Added repair pathway details" },
            { field: "expressionData", from: "Liver: high", to: "Liver, Kidney: high; Brain: medium; Muscle: low", note: "Added tissue expression data" },
            { field: "clinicalSignificance", from: "—", to: "2 variants with clinical data", note: "Added clinical variant information" },
          ],
        },
        {
          id: "v4.2",
          label: "v4.2 (pathway integration)",
          date: "2025-06-15",
          authoredBy: "dr.smith@ebi.ac.uk",
          changes: [
            { field: "pathways", from: "Base Excision Repair", to: "Base Excision Repair, Nucleotide Excision Repair", note: "Added nucleotide excision repair pathway" },
            { field: "crossReferences", from: "GO:0006281", to: "GO:0006281, Reactome:R-HSA-73857", note: "Added Reactome pathway reference" },
            { field: "biologicalProcess", from: "DNA repair", to: "DNA repair, base excision repair, nucleotide excision repair", note: "Added specific repair types" },
            { field: "molecularFunction", from: "DNA binding", to: "DNA binding, endonuclease activity", note: "Added endonuclease function" },
          ],
        },
        {
          id: "v4.1",
          label: "v4.1 (homologous recombination)",
          date: "2025-05-20",
          authoredBy: "dr.wilson@ebi.ac.uk",
          changes: [
            { field: "pathways", from: "Base Excision Repair", to: "Base Excision Repair, Homologous Recombination", note: "Added homologous recombination pathway" },
            { field: "tags", from: "biological-process, DNA-repair", to: "biological-process, DNA-repair, genomic-stability", note: "Added genomic stability tag" },
            { field: "biologicalProcess", from: "DNA repair", to: "DNA repair, homologous recombination", note: "Added homologous recombination process" },
            { field: "cellularComponent", from: "nucleus", to: "nucleus, chromatin", note: "Added chromatin localization" },
          ],
        },
        {
          id: "v4.0",
          label: "v4.0 (expression data)",
          date: "2025-04-10",
          authoredBy: "dr.brown@ebi.ac.uk",
          changes: [
            { field: "expressionData", from: "—", to: "Liver: high, Brain: medium", note: "Added initial expression data" },
            { field: "synonyms", from: "DNA damage response", to: "DNA damage response, DNA repair pathway", note: "Added repair pathway synonym" },
            { field: "molecularFunction", from: "DNA binding", to: "DNA binding, helicase activity", note: "Added helicase function" },
          ],
        },
        {
          id: "v3.5",
          label: "v3.5 (publications)",
          date: "2025-03-05",
          authoredBy: "dr.davis@ebi.ac.uk",
          changes: [
            { field: "publications", from: "—", to: "2 key publications", note: "Added landmark research papers" },
            { field: "crossReferences", from: "GO:0006281", to: "GO:0006281, KEGG:hsa03420", note: "Added KEGG pathway reference" },
            { field: "description", from: "Biological process that corrects DNA damage", to: "Biological process that corrects DNA damage and maintains genomic integrity", note: "Enhanced description" },
          ],
        },
        {
          id: "v3.2",
          label: "v3.2 (mechanisms)",
          date: "2025-02-15",
          authoredBy: "dr.jones@ebi.ac.uk",
          changes: [
            { field: "description", from: "Biological process that corrects DNA damage", to: "Biological process that corrects DNA damage and maintains genomic integrity through various repair mechanisms", note: "Added repair mechanisms detail" },
            { field: "tags", from: "biological-process", to: "biological-process, DNA-repair", note: "Added DNA repair tag" },
            { field: "cellularComponent", from: "nucleus", to: "nucleus, replication fork", note: "Added replication fork location" },
          ],
        },
        {
          id: "v3.0",
          label: "v3.0 (initial comprehensive)",
          date: "2025-01-10",
          authoredBy: "go-team",
          changes: [
            { field: "created", note: "Initial comprehensive entry with basic information" },
            { field: "pathways", from: "—", to: "Base Excision Repair", note: "Added base excision repair pathway" },
            { field: "crossReferences", from: "—", to: "GO:0006281", note: "Added Gene Ontology reference" },
            { field: "synonyms", from: "—", to: "DNA damage response", note: "Added primary synonym" },
          ],
        },
      ],
    },
  },
  {
    id: "3",
    title: "Breast Cancer",
    description: "Malignant neoplasm of the breast tissue, characterized by uncontrolled cell growth and potential metastasis.",
    tags: ["disease", "cancer", "neoplasm"],
    rating: 4.7,
    date: "2025-05-22",
    href: "https://www.disease-ontology.org/term/DOID:1612",
    relatedIds: ["1", "2", "6"],
    ontologyType: "Disease Ontology",
    ontologyId: "DOID:1612",
    provenance: {
      sourceUrl: "https://www.disease-ontology.org",
      sourceLabel: "Disease Ontology",
      owner: "disease-ontology@jax.org",
      updated: "2025-08-01",
      method: "curated",
      currentVersionId: "v4.1",
      versions: [
        { id: "v4.1", label: "v4.1 (metastasis)", date: "2025-08-01", authoredBy: "dr.wilson@jax.org", changes: [{ field: "description", note: "Added metastasis characteristic" }] },
        { id: "v4.0", label: "v4.0", date: "2025-06-30", changes: [{ field: "tags", from: "disease, cancer", to: "disease, cancer, neoplasm" }] },
      ],
    },
  },
  {
    id: "4",
    title: "Cell Cycle Control",
    description: "Regulatory mechanisms that control progression through the cell cycle phases, ensuring proper cell division.",
    tags: ["biological-process", "cell-cycle", "regulation"],
    rating: 4.6,
    date: "2025-06-03",
    href: "https://www.ebi.ac.uk/QuickGO/term/GO:0051726",
    relatedIds: ["1", "2", "7"],
    ontologyType: "Gene Ontology",
    ontologyId: "GO:0051726",
    provenance: {
      sourceUrl: "https://www.ebi.ac.uk/QuickGO",
      sourceLabel: "QuickGO",
      owner: "go-curators@ebi.ac.uk",
      updated: "2025-06-15",
      method: "auto-import",
      currentVersionId: "v2.3",
      versions: [
        { id: "v2.3", label: "v2.3 (phases)", date: "2025-06-15", changes: [{ field: "description", note: "Added cell cycle phases detail" }] },
        { id: "v2.0", label: "v2.0", date: "2025-06-01", changes: [{ field: "created" }] },
      ],
    },
  },
  {
    id: "5",
    title: "Genomic Instability",
    description: "Condition characterized by increased frequency of genomic alterations, often associated with cancer predisposition.",
    tags: ["phenotype", "genomic-stability", "cancer-predisposition"],
    rating: 4.4,
    date: "2025-06-28",
    href: "https://www.ebi.ac.uk/ols/ontologies/hp/terms?iri=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2FHP_0004429",
    relatedIds: ["2", "3", "8"],
    ontologyType: "Human Phenotype Ontology",
    ontologyId: "HP:0004429",
    provenance: {
      sourceUrl: "https://www.ebi.ac.uk/ols",
      sourceLabel: "OLS",
      owner: "hpo-team@charite.de",
      updated: "2025-06-30",
      method: "synced",
      currentVersionId: "v1.8",
      versions: [
        { id: "v1.8", label: "v1.8 (predisposition)", date: "2025-06-30", changes: [{ field: "description", note: "Added cancer predisposition link" }] },
        { id: "v1.5", label: "v1.5", date: "2025-06-15", changes: [{ field: "href", to: "https://www.ebi.ac.uk/ols/ontologies/hp/terms?iri=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2FHP_0004429" }] },
      ],
    },
  },
  {
    id: "6",
    title: "Hereditary Breast Cancer",
    description: "Inherited form of breast cancer caused by germline mutations in cancer susceptibility genes.",
    tags: ["disease", "hereditary", "genetic"],
    rating: 4.5,
    date: "2025-07-10",
    href: "https://www.disease-ontology.org/term/DOID:10534",
    relatedIds: ["1", "3", "9"],
    ontologyType: "Disease Ontology",
    ontologyId: "DOID:10534",
    provenance: {
      sourceUrl: "https://www.disease-ontology.org",
      sourceLabel: "Disease Ontology",
      owner: "disease-ontology@jax.org",
      updated: "2025-07-10",
      method: "curated",
      currentVersionId: "v2.1",
      versions: [
        { id: "v2.1", label: "v2.1 (germline)", date: "2025-07-10", authoredBy: "dr.brown@jax.org", changes: [{ field: "description", note: "Added germline mutation detail" }] },
        { id: "v2.0", label: "v2.0", date: "2025-06-20", changes: [{ field: "created" }] },
      ],
    },
  },
  {
    id: "7",
    title: "G1/S Transition",
    description: "Cell cycle checkpoint transition from G1 phase to S phase, regulated by various cyclins and CDKs.",
    tags: ["biological-process", "cell-cycle", "checkpoint"],
    rating: 4.3,
    date: "2025-06-15",
    href: "https://www.ebi.ac.uk/QuickGO/term/GO:0000082",
    relatedIds: ["4", "10"],
    ontologyType: "Gene Ontology",
    ontologyId: "GO:0000082",
    provenance: {
      sourceUrl: "https://www.ebi.ac.uk/QuickGO",
      sourceLabel: "QuickGO",
      owner: "go-curators@ebi.ac.uk",
      updated: "2025-06-15",
      method: "reviewed",
      currentVersionId: "v1.5",
      versions: [
        { id: "v1.5", label: "v1.5 (CDKs)", date: "2025-06-15", authoredBy: "dr.davis@ebi.ac.uk", changes: [{ field: "description", note: "Added cyclins and CDKs regulation" }] },
        { id: "v1.0", label: "v1.0", date: "2025-05-01", changes: [{ field: "created" }] },
      ],
    },
  },
  {
    id: "8",
    title: "Chromosomal Instability",
    description: "Increased rate of chromosomal aberrations including aneuploidy, translocations, and deletions.",
    tags: ["phenotype", "chromosomal", "aneuploidy"],
    rating: 4.2,
    date: "2025-07-05",
    href: "https://www.ebi.ac.uk/ols/ontologies/hp/terms?iri=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2FHP_0004429",
    relatedIds: ["5", "11"],
    ontologyType: "Human Phenotype Ontology",
    ontologyId: "HP:0004429",
    provenance: {
      sourceUrl: "https://www.ebi.ac.uk/ols",
      sourceLabel: "OLS",
      owner: "hpo-team@charite.de",
      updated: "2025-07-05",
      method: "synced",
      currentVersionId: "v1.3",
      versions: [
        { id: "v1.3", label: "v1.3 (aberrations)", date: "2025-07-05", changes: [{ field: "description", note: "Added specific aberration types" }] },
        { id: "v1.0", label: "v1.0", date: "2025-06-01", changes: [{ field: "created" }] },
      ],
    },
  },
  {
    id: "9",
    title: "BRCA2 Gene",
    description: "Breast cancer type 2 susceptibility protein. Involved in homologous recombination repair of DNA double-strand breaks.",
    tags: ["gene", "cancer", "DNA-repair"],
    rating: 4.8,
    date: "2025-07-20",
    href: "https://www.genecards.org/cgi-bin/carddisp.pl?gene=BRCA2",
    relatedIds: ["1", "6", "12"],
    ontologyType: "Gene Ontology",
    ontologyId: "GO:0003677",
    provenance: {
      sourceUrl: "https://www.genecards.org",
      sourceLabel: "GeneCards",
      owner: "bioinformatics@university.edu",
      updated: "2025-07-20",
      method: "curated",
      currentVersionId: "v2.0",
      versions: [
        { id: "v2.0", label: "v2.0 (homologous recombination)", date: "2025-07-20", authoredBy: "dr.smith@university.edu", changes: [{ field: "description", note: "Added homologous recombination detail" }] },
        { id: "v1.0", label: "v1.0 (initial)", date: "2025-06-15", authoredBy: "bioinformatics-team", changes: [{ field: "created" }] },
      ],
    },
  },
  {
    id: "10",
    title: "Cyclin-Dependent Kinase",
    description: "Protein kinase that regulates cell cycle progression through phosphorylation of target proteins.",
    tags: ["protein", "kinase", "cell-cycle"],
    rating: 4.6,
    date: "2025-06-25",
    href: "https://www.ebi.ac.uk/QuickGO/term/GO:0004693",
    relatedIds: ["4", "7"],
    ontologyType: "Gene Ontology",
    ontologyId: "GO:0004693",
    provenance: {
      sourceUrl: "https://www.ebi.ac.uk/QuickGO",
      sourceLabel: "QuickGO",
      owner: "go-curators@ebi.ac.uk",
      updated: "2025-06-25",
      method: "reviewed",
      currentVersionId: "v1.8",
      versions: [
        { id: "v1.8", label: "v1.8 (phosphorylation)", date: "2025-06-25", authoredBy: "dr.miller@ebi.ac.uk", changes: [{ field: "description", note: "Added phosphorylation mechanism" }] },
        { id: "v1.0", label: "v1.0", date: "2025-05-10", changes: [{ field: "created" }] },
      ],
    },
  },
];

/* ========== Enhanced Details Component ========== */
function EnhancedDetailsSection({ item, originalItem }: { item: CardItem; originalItem: CardItem | null }) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Helper function to check if a field has changed
  const hasChanged = (field: keyof CardItem) => {
    if (!originalItem) return false;
    return JSON.stringify(item[field]) !== JSON.stringify(originalItem[field]);
  };

  // Helper function to get highlighting classes
  const getHighlightClasses = (field: keyof CardItem) => {
    return hasChanged(field)
      ? "bg-green-50 border-green-300 border-2"
      : "bg-muted/30";
  };

  // Helper function to render consistent card with no data state
  const renderCard = (title: string, icon: any, field: keyof CardItem, content: React.ReactNode) => {
    const Icon = icon;
    const hasData = content !== null;

    return (
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </h3>
        <div className={`rounded-lg p-4 ${getHighlightClasses(field)}`}>
          {hasData ? content : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No information available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Network },
    { id: "references", label: "References", icon: Database },
    { id: "research", label: "Research", icon: BookOpen },
    { id: "clinical", label: "Clinical", icon: Activity },
  ];

  return (
    <div className="rounded-2xl border">
      {/* Tab Navigation */}
      <div className="flex border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-primary text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-6" style={{ zIndex: 9999999 }}>
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Gene Ontology Information - Always show */}
            {renderCard(
              "Gene Ontology",
              Network,
              'molecularFunction',
              (item.molecularFunction || item.biologicalProcess || item.cellularComponent) ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {item.molecularFunction ? (
                    <div className="bg-background rounded-lg p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Molecular Function</div>
                      <div className="text-sm">{item.molecularFunction}</div>
                    </div>
                  ) : (
                    <div className="bg-background rounded-lg p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Molecular Function</div>
                      <div className="text-sm text-muted-foreground">No information available</div>
                    </div>
                  )}
                  {item.biologicalProcess ? (
                    <div className="bg-background rounded-lg p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Biological Process</div>
                      <div className="text-sm">{item.biologicalProcess}</div>
                    </div>
                  ) : (
                    <div className="bg-background rounded-lg p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Biological Process</div>
                      <div className="text-sm text-muted-foreground">No information available</div>
                    </div>
                  )}
                  {item.cellularComponent ? (
                    <div className="bg-background rounded-lg p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Cellular Component</div>
                      <div className="text-sm">{item.cellularComponent}</div>
                    </div>
                  ) : (
                    <div className="bg-background rounded-lg p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Cellular Component</div>
                      <div className="text-sm text-muted-foreground">No information available</div>
                    </div>
                  )}
                </div>
              ) : null
            )}

            {/* Synonyms - Always show */}
            {renderCard(
              "Synonyms",
              TagIcon,
              'synonyms',
              item.synonyms?.length ? (
                <div className="flex flex-wrap gap-2">
                  {item.synonyms.map((synonym, index) => (
                    <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                      {synonym}
                    </Badge>
                  ))}
                </div>
              ) : null
            )}

            {/* Expression Data - Always show */}
            {renderCard(
              "Expression Data",
              Activity,
              'expressionData',
              item.expressionData?.length ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {item.expressionData.map((expr, index) => (
                    <div key={index} className="flex items-center justify-between bg-background rounded-lg p-3">
                      <span className="text-sm font-medium">{expr.tissue}</span>
                      <Badge
                        variant={expr.level === 'high' ? 'default' : expr.level === 'medium' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {expr.level}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : null
            )}
          </div>
        )}

        {activeTab === "references" && (
          <div className="space-y-6">
            {/* Cross References - Always show */}
            {renderCard(
              "Cross References",
              Database,
              'crossReferences',
              item.crossReferences?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {item.crossReferences.map((ref, index) => (
                    <div key={index} className="flex items-center gap-3 bg-background rounded-lg p-4">
                      <Database className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{ref.database}</div>
                        {ref.url ? (
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {ref.id}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">{ref.id}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null
            )}

            {/* Pathways - Always show */}
            {renderCard(
              "Pathways",
              Network,
              'pathways',
              item.pathways?.length ? (
                <div className="space-y-3">
                  {item.pathways.map((pathway, index) => (
                    <div key={index} className="bg-background rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm mb-1">{pathway.name}</div>
                          <div className="text-muted-foreground text-sm">{pathway.description}</div>
                        </div>
                        {pathway.url && (
                          <a
                            href={pathway.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm flex items-center gap-1 ml-4"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null
            )}
          </div>
        )}

        {activeTab === "research" && (
          <div className="space-y-6">
            {/* Publications - Always show */}
            {renderCard(
              "Key Publications",
              BookOpen,
              'publications',
              item.publications?.length ? (
                <div className="space-y-4">
                  {item.publications.map((pub, index) => (
                    <div key={index} className="bg-background rounded-lg p-4">
                      <div className="font-medium text-sm mb-2">{pub.title}</div>
                      <div className="text-muted-foreground text-sm mb-2">{pub.authors}</div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{pub.journal} ({pub.year})</span>
                        {pub.pmid && (
                          <a
                            href={`https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Link className="h-3 w-3" />
                            PMID: {pub.pmid}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null
            )}
          </div>
        )}

        {activeTab === "clinical" && (
          <div className="space-y-6">
            {/* Clinical Significance - Always show */}
            {renderCard(
              "Clinical Significance",
              Activity,
              'clinicalSignificance',
              item.clinicalSignificance?.length ? (
                <div className="space-y-3">
                  {item.clinicalSignificance.map((clinical, index) => (
                    <div key={index} className="bg-background rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm bg-muted px-3 py-1 rounded border">
                          {clinical.variant}
                        </span>
                        <Badge
                          variant={clinical.significance === 'Pathogenic' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {clinical.significance}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-sm">{clinical.description}</div>
                    </div>
                  ))}
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== Page ========== */
export default function Page() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, boolean>>({});
  const [compareSelections, setCompareSelections] = useState<(string | null)[]>([null, null, null]);
  const [comparisonResults, setComparisonResults] = useState<any[]>([]);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackItem, setFeedbackItem] = useState<CardItem | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [loadedVersion, setLoadedVersion] = useState<Record<string, string>>({});

  const byId = useMemo(() => Object.fromEntries(ITEMS.map((i) => [i.id, i] as const)), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = ITEMS.filter((i) => {
      const matchesQ =
        !q ||
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q));
      const inFocus = !focusId || focusId === i.id || i.relatedIds?.includes(focusId);
      return matchesQ && inFocus;
    });

    arr.sort((a, b) => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title);
        case "rating":
          return b.rating - a.rating;
        case "recent":
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return arr;
  }, [query, sortKey, focusId]);

  const selectedItem = openId ? byId[openId] : null;

  // Get the current data based on loaded version
  const getCurrentItemData = (item: CardItem): CardItem => {
    if (!item.provenance?.versions || !loadedVersion[item.id]) {
      return item;
    }

    const versionId = loadedVersion[item.id];
    const version = item.provenance.versions.find(v => v.id === versionId);

    if (!version) return item;

    // Simulate loading data for the selected version by applying changes
    let updatedItem = { ...item };

    // Apply changes from the selected version
    version.changes.forEach(change => {
      switch (change.field) {
        case 'description':
          if (change.to) {
            updatedItem.description = change.to;
          }
          break;
        case 'tags':
          if (change.to) {
            updatedItem.tags = change.to.split(', ').map(tag => tag.trim());
          }
          break;
        case 'molecularFunction':
          if (change.to) {
            updatedItem.molecularFunction = change.to;
          }
          break;
        case 'biologicalProcess':
          if (change.to) {
            updatedItem.biologicalProcess = change.to;
          }
          break;
        case 'cellularComponent':
          if (change.to) {
            updatedItem.cellularComponent = change.to;
          }
          break;
        case 'ontologyId':
          if (change.to) {
            updatedItem.ontologyId = change.to;
          }
          break;
        case 'pathways':
          if (change.to) {
            // Parse pathway information from the change
            const pathwayNames = change.to.split(', ');
            updatedItem.pathways = pathwayNames.map(name => ({
              name: name.trim(),
              description: `Pathway information for ${name.trim()}`,
              url: `https://example.com/pathway/${name.toLowerCase().replace(/\s+/g, '-')}`
            }));
          }
          break;
        case 'clinicalSignificance':
          if (change.to && change.to.includes('variants added')) {
            // Add some example clinical variants for demonstration
            updatedItem.clinicalSignificance = [
              { variant: "c.5266dupC", significance: "Pathogenic", description: "Frameshift mutation leading to protein truncation" },
              { variant: "c.68_69delAG", significance: "Pathogenic", description: "Frameshift mutation in exon 2" },
              { variant: "c.3113G>A", significance: "Benign", description: "Synonymous variant with no functional impact" }
            ];
          }
          break;
        case 'crossReferences':
          if (change.to) {
            // Parse cross-references from the change
            const refs = change.to.split(', ');
            updatedItem.crossReferences = refs.map(ref => ({
              database: ref.trim(),
              id: ref.trim() === 'HGNC' ? '1100' : ref.trim() === 'OMIM' ? '113705' : ref.trim() === 'UniProt' ? 'P38398' : 'Unknown',
              url: `https://example.com/${ref.trim().toLowerCase()}`
            }));
          }
          break;
      }
    });

    // Update provenance to reflect the loaded version
    updatedItem.provenance = {
      ...item.provenance,
      currentVersionId: versionId,
      updated: version.date,
    };

    return updatedItem;
  };

  const currentItemData = selectedItem ? getCurrentItemData(selectedItem) : null;

  function handleSubmitFeedback(itemId: string, message: string, contact?: string) {
    if (!message.trim()) return;
    setFeedbackMap((prev) => ({ ...prev, [itemId]: true }));
    setFeedbackDialogOpen(false);
    setFeedbackMessage("");
    setFeedbackContact("");
    setFeedbackItem(null);
  }

  function handleOpenFeedback(item: CardItem) {
    setFeedbackItem(item);
    setFeedbackDialogOpen(true);
  }

  function handleCompareSelectionChange(index: number, versionId: string | null) {
    setCompareSelections((prev) => {
      const newSelections = [...prev];
      newSelections[index] = versionId;
      return newSelections;
    });
  }

  function handleClearComparisonResults() {
    setComparisonResults([]);
  }

  function handleCompare() {
    const selectedVersions = compareSelections
      .map((id, index) => {
        if (!id || !selectedItem?.provenance?.versions) return null;
        const version = selectedItem.provenance.versions.find(v => v.id === id);
        return version ? { ...version, index } : null;
      })
      .filter(Boolean);

    if (selectedVersions.length >= 2) {
      setComparisonResults(selectedVersions);
    }
  }

  function handleLoadVersion(itemId: string, version: ProvenanceVersion) {
    setLoadedVersion(prev => ({
      ...prev,
      [itemId]: version.id
    }));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 overflow-x-hidden">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ontology Browser</h1>
          <p className="text-sm text-muted-foreground">
            Explore biological ontologies with provenance tracking. Click <strong>Open</strong> to view details and compare versions.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search genes, diseases, biological processes…"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowUpDown className="h-4 w-4" /> Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortKey("recent")}>Recent</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortKey("title")}>Title A–Z</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortKey("rating")}>Rating</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {focusId ? (
        <div className="mb-4 text-sm">
          <Badge variant="secondary" className="mr-2">
            <Network className="mr-1 h-3.5 w-3.5" /> Focus: {byId[focusId]?.title || focusId}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => setFocusId(null)}>
            Clear
          </Button>
        </div>
      ) : (
        <div className="mb-4 text-sm text-muted-foreground">
          Tip: Click <strong>View related</strong> on a card to explore connected ontological concepts.
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <ResourceCard
                item={item}
                onFocus={setFocusId}
                focused={focusId === item.id}
                onOpen={() => setOpenId(item.id)}
                onCorrection={() => handleOpenFeedback(item)}
                hasFeedback={!!feedbackMap[item.id]}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Dialog with the requested layout */}
      <Dialog open={!!openId} onOpenChange={(v) => {
        if (!v) {
          setOpenId(null);
          setComparisonResults([]);
          setCompareSelections([null, null, null]);
        }
      }}>
        <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-y-auto">
          {currentItemData && (
            <>
              <DialogHeader>
                <DialogTitle>{currentItemData.title}</DialogTitle>
                <DialogDescription className={`p-3 rounded-lg ${currentItemData.description !== selectedItem?.description ? 'bg-green-50 border-green-300 border-2' : ''}`}>
                  {currentItemData.description}
                </DialogDescription>
              </DialogHeader>

              {/* Layout: Enhanced with better width utilization */}
              <div className="space-y-6">
                {/* Top row: Tabbed details and related concepts */}
                <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                  {/* Tabbed Details Section */}
                  <EnhancedDetailsSection item={currentItemData} originalItem={selectedItem} />

                  {/* Related Ontological Concepts */}
                  <aside className="rounded-2xl border p-4">
                    <div className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      Related Concepts
                    </div>
                    {!currentItemData.relatedIds?.length ? (
                      <div className="text-sm text-muted-foreground">No related concepts</div>
                    ) : (
                      <div className="space-y-3">
                        {currentItemData.relatedIds.map((rid) => {
                          const relatedItem = byId[rid];
                          if (!relatedItem) return null;

                          return (
                            <div key={rid} className="rounded-lg border bg-muted/30 p-3">
                              <Button
                                variant="ghost"
                                className="h-auto justify-start p-0 text-left w-full"
                                onClick={() => setOpenId(rid)}
                              >
                                <div className="w-full space-y-2">
                                  <div className="text-sm font-medium leading-tight">
                                    {relatedItem.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground leading-relaxed">
                                    {relatedItem.description.length > 50
                                      ? relatedItem.description.substring(0, 50) + "..."
                                      : relatedItem.description}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {relatedItem.ontologyType && (
                                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                                        {relatedItem.ontologyType}
                                      </Badge>
                                    )}
                                    {relatedItem.ontologyId && (
                                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                        {relatedItem.ontologyId}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </aside>
                </div>


                {/* Provenance section - Full Width */}
                {selectedItem?.provenance && (
                  <div className="space-y-4">
                    <ProvenanceTimeline p={selectedItem.provenance} />
                    <ProvenancePanel
                      p={selectedItem.provenance}
                      onLoadVersion={(v) => handleLoadVersion(selectedItem.id, v)}
                    />
                  </div>
                )}

                {/* Full-width Compare section */}
                {currentItemData.provenance && (
                  <CompareSection
                    provenance={currentItemData.provenance}
                    selections={compareSelections}
                    onSelectionChange={handleCompareSelectionChange}
                    onCompare={handleCompare}
                    comparisonResults={comparisonResults}
                    onClearResults={handleClearComparisonResults}
                  />
                )}
              </div>

              <DialogFooter className="mt-2 flex w-full items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {/* left empty intentionally; provenance is above */}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-1"
                    onClick={() => currentItemData && handleOpenFeedback(currentItemData)}
                  >
                    <Flag className="h-4 w-4" /> Suggest correction
                  </Button>
                  {currentItemData.href ? (
                    <Button asChild>
                      <a href={currentItemData.href} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 h-4 w-4" /> Open link
                      </a>
                    </Button>
                  ) : null}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suggest Correction</DialogTitle>
            <DialogDescription>
              Help us improve the information for "{feedbackItem?.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">What needs to be corrected?</label>
              <Textarea
                placeholder="Describe the issue or provide the correct information..."
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Your contact</label>
              <Input
                placeholder="email@example.com"
                value={feedbackContact}
                required
                onChange={(e) => setFeedbackContact(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFeedbackDialogOpen(false);
                setFeedbackMessage("");
                setFeedbackContact("");
                setFeedbackItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (feedbackItem && feedbackMessage.trim()) {
                  handleSubmitFeedback(feedbackItem.id, feedbackMessage, feedbackContact);
                }
              }}
              disabled={!feedbackMessage.trim()}
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========== Cards ========== */
function ResourceCard({
  item,
  onFocus,
  focused,
  onOpen,
  onCorrection,
  hasFeedback,
}: {
  item?: CardItem; // keep optional for safety
  onFocus: (id: string) => void;
  focused: boolean;
  onOpen: () => void;
  onCorrection: () => void;
  hasFeedback?: boolean;
}) {
  if (!item) {
    return (
      <Card className="flex h-full flex-col overflow-hidden rounded-2xl shadow-sm w-full">
        <div className="relative p-3 border-b">
          <Skeleton className="h-4 w-1/3" />
        </div>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-2 h-3 w-full" />
        </CardHeader>
        <CardContent className="pb-2">
          <Skeleton className="h-3 w-24" />
        </CardContent>
        <CardFooter className="mt-auto flex flex-col gap-3">
          <div className="flex gap-2 w-full">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
          <Skeleton className="h-9 w-full" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card
      className={`flex h-full flex-col overflow-hidden rounded-2xl shadow-sm transition-[transform,box-shadow,opacity] w-full ${
        focused ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="relative p-3 border-b">
        <div className="absolute right-2 top-2 flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCorrection} className="gap-2">
                <Flag className="h-4 w-4" /> Suggest correction
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => item.href && window.open(item.href, "_blank")}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" /> Open link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {item.ontologyType && (
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Network className="h-3.5 w-3.5" /> {item.ontologyType}
            {item.ontologyId && (
              <Badge variant="outline" className="text-[10px]">
                {item.ontologyId}
              </Badge>
            )}
          </div>
        )}
      </div>

      <CardHeader className="flex-1 space-y-2 pb-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-tight line-clamp-2">
            {item.title || "Untitled"}
          </h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
            <Star className="h-4 w-4 fill-current" />
            <span>{(item.rating ?? 0).toFixed(1)}</span>
          </div>
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {item.description || "No description"}
        </p>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="mb-3 flex flex-wrap gap-2">
          {(item.tags ?? []).map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              <TagIcon className="h-3.5 w-3.5" /> {t}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" /> {formatDate(item.date)}
        </div>
        {hasFeedback ? (
          <div className="mt-2 text-xs text-green-700">
            Thanks! A correction was submitted for this item.
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="mt-auto flex flex-col gap-3">
        <div className="flex gap-2 w-full">
          <Button className="gap-1 flex-1" onClick={onOpen}>
            <ExternalLink className="h-4 w-4" /> Open
          </Button>
          <Button
            variant="outline"
            className="gap-1 flex-1"
            onClick={() => onFocus(item.id)}
          >
            <Network className="h-4 w-4" /> View related
          </Button>
        </div>
        <Button variant="outline" onClick={onCorrection} className="gap-1 w-full">
          <Flag className="h-4 w-4" /> Suggest correction
        </Button>
      </CardFooter>

      {item.relatedIds?.length ? (
        <div className="border-t p-3">
          <div className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Share2 className="h-3.5 w-3.5" /> Related
          </div>
          <div className="flex flex-wrap gap-2">
            {item.relatedIds.map((rid) => (
              <Button
                key={rid}
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={() => onFocus(rid)}
              >
                {rid}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border p-12 text-center">
      <div className="mb-3 text-xl font-medium">No results</div>
      <p className="max-w-md text-sm text-muted-foreground">
        Try clearing filters or changing your search.
      </p>
    </div>
  );
}
