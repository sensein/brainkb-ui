"use client";

// Tutorial topics: pick a tool, then open the section you need. Content is
// taken from each tool's own docs (StructSense and SynthScholar SKILL.md /
// README / EXTENDED-GUIDE, the MCP server's site); keep it in step with them.
// Inline markup: `code`, **bold**, [text](href).

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { CodeBox } from "../components/marketing/SkillSetup";
import { MCP_SITE } from "../components/marketing/tokens";

const SKILLS_REPO = "https://github.com/sensein/agent_skills";

type Need = { item: string; why: string };
type Block =
  | { p: string }
  | { list: string[] }
  | { code: { label: string; cmd: string } }
  | { needs: { required: Need[]; optional: Need[] } };
type Section = { title: string; blocks: Block[] };
type Topic = { id: string; icon: string; name: string; tag: string; summary: string; sections: Section[] };

const TOPICS: Topic[] = [
  {
    id: "search",
    icon: "⌕",
    name: "Search & explore",
    tag: "NO LOGIN",
    summary: "Find what's already in BrainKB and check where each fact came from.",
    sections: [
      {
        title: "What it is",
        blocks: [
          { p: "Public spaces in BrainKB are open to everyone: you can search them, browse them and download them as RDF without an account." },
        ],
      },
      {
        title: "What you need",
        blocks: [
          {
            needs: {
              required: [{ item: "A web browser", why: "Nothing to install." }],
              optional: [{ item: "A Globus, ORCID or GitHub account", why: "Read your own and shared private spaces." }],
            },
          },
        ],
      },
      {
        title: "How to use it",
        blocks: [
          {
            list: [
              "Search from the [home page](/), or open a search directly at `/search?q=hippocampus`.",
              "Open a result to see its sources: the paper, and the sentence it was extracted from.",
              "Browse by data type on [Explore the graph](/explore).",
              "Sign in when you need private spaces. Public data never needs it.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "structsense",
    icon: "◆",
    name: "StructSense",
    tag: "EXTRACT",
    summary: "Extract entities and relations from papers and text, mapped to ontologies, as validated Turtle.",
    sections: [
      {
        title: "What it is",
        blocks: [
          { p: "StructSense pulls named entities and the relations a source states out of papers, notes and web pages. It resolves aliases to stable entities, keeps the evidence sentence for each one, maps them to ontology terms, and writes validated Turtle plus entity JSON." },
          {
            list: [
              "**Named entities** (general, neuroscience or CNS cell types)",
              "**Research resources** (tools, datasets) in the BrainKB Resource Ontology",
              "**Your own JSON schema** (results stay JSON)",
              "**ABCD/HBCD study results**, with the data dictionaries bundled (no network or R needed)",
              "**Allen Institute (AIT) cell-type taxonomies**: a paper's cell types mapped to AIT with evidence",
            ],
          },
        ],
      },
      {
        title: "What you need",
        blocks: [
          {
            needs: {
              required: [
                { item: "Python 3 and the core packages", why: "`pip install -r requirements.txt`: PDF reading, RDF, validation. No GPU, no API key, no R." },
                { item: "A model", why: "By default the assistant running the skill is the model, so no LLM key is needed." },
                { item: "The ontology index (one time)", why: "`python -m scripts.concept_mapping index`: about 2 minutes, offline. Used by the concept mapper." },
              ],
              optional: [
                { item: "`BIOPORTAL_API_KEY` (free)", why: "Lets the concept mapper fall back to BioPortal. Get one at bioportal.bioontology.org/account." },
                { item: "Docling (`pip install docling`)", why: "Scanned PDFs (OCR), DOCX, PPTX, XLSX, HTML and images." },
                { item: "spaCy + `en_core_web_sm`", why: "Sentence-aligned chunking; without it a regex splitter is used." },
                { item: "`requirements-ner.txt`", why: "HuggingFace NER ensemble for higher recall. Heavy: torch plus several GB of weights; use the `minimal` profile on a laptop." },
                { item: "`requirements-llm.txt` + an API key", why: "Run headless with a model you choose (OpenRouter, OpenAI, Anthropic, Gemini, or local Ollama/vLLM)." },
                { item: "`SEMANTIC_SCHOLAR_API_KEY`, `NCBI_API_KEY`", why: "Higher rate limits when fetching open-access full text." },
              ],
            },
          },
        ],
      },
      {
        title: "Install",
        blocks: [
          { p: "Install the skill from the skills repository, then its Python packages and the ontology index:" },
          { code: { label: "terminal", cmd: `git clone ${SKILLS_REPO}\ncd agent_skills\npython scripts/install_skills.py --agent claude --skills structsense` } },
          { code: { label: "terminal · in the installed skill folder (e.g. ~/.claude/skills/structsense)", cmd: "pip install -r requirements.txt\npython -m scripts.concept_mapping index" } },
          { p: "Use `--agent codex` or `--dest /path/to/skills` for other tools. Add the optional packages from **What you need** only when you want what they unlock." },
        ],
      },
      {
        title: "Run it",
        blocks: [
          { p: "**In your AI assistant**, start the request with the skill's name, then say what you want. For example, in Claude Code:" },
          { code: { label: "prompt", cmd: "Use /structsense to extract the cell types from paper.pdf and map them to ontologies" } },
          { list: [
            "**Claude Code**: type `/structsense` at the start of your request.",
            "**Codex**: type `$structsense` instead, e.g. `Use $structsense to …`.",
            "**Other assistants**: name the skill in words, e.g. \"Use the structsense skill to …\".",
          ] },
          { p: "**A folder of papers** (PDF, JATS XML, DOCX, HTML, TXT):" },
          { code: { label: "terminal", cmd: "python -m scripts.batch init --input ~/papers --variants neuroscience,cns-cells --out ~/out --model <id>\npython -m scripts.batch run --manifest ~/out/.structsense/batch.json\npython -m scripts.batch status --manifest ~/out/.structsense/batch.json" } },
          { p: "**Headless, with your own model** (needs `requirements-llm.txt` and a key):" },
          { code: { label: "terminal", cmd: "export OPENROUTER_API_KEY=sk-or-v1-...\npython -m scripts.pipeline --task ner --input paper.txt \\\n  --extractor openrouter/anthropic/claude-sonnet-4-6 --ner-domain neuroscience" } },
          { p: "**Turn results into Turtle and validate** (validation must report 0 violations):" },
          { code: { label: "terminal", cmd: "python -m scripts.json_to_ttl result.json --source paper.pdf\npython -m scripts.validate_ttl result.ttl" } },
        ],
      },
      {
        title: "What you get",
        blocks: [
          {
            list: [
              "`<stem>.ttl`: one validated Turtle file per paper; a file that fails validation is renamed `.invalid.ttl`",
              "`<stem>.entities.json` / `.entities.ttl`: entity-focused views (opt-in)",
              "`corpus_synthesis.json` / `.md`: a summary across a folder of papers",
              "ABCD/HBCD: `abcd_results/<stem>_abcd.{json,md,ttl}`; AIT mapping: 7 CSV tables plus `run_report.md`",
            ],
          },
        ],
      },
      {
        title: "Tips and troubleshooting",
        blocks: [
          {
            list: [
              "\"All PDF extractors failed\" means no PDF backend is installed: run `pip install -r requirements.txt`.",
              "Scanned PDFs give no text without Docling.",
              "Long inputs are chunked; very small local models often produce malformed JSON.",
              "Mappings never invent ontology IDs. Unmapped entities stay unmapped and are reported.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "concept-mapper",
    icon: "⌖",
    name: "Concept mapper",
    tag: "ONTOLOGIES",
    summary: "StructSense's ontology mapping tool: links entities to ontology terms, from trusted sources only.",
    sections: [
      {
        title: "What it is",
        blocks: [
          { p: "The concept mapper is the part of StructSense that maps extracted entities to ontology terms (for example a cell type to the Cell Ontology). It only uses lookups from real sources and never invents an ID. It tries sources in this order:" },
          {
            list: [
              "**Trusted ontologies**: 115 ontology files shipped with the skill, searched offline once indexed",
              "**Local hybrid search**: a self-hosted search service at `http://localhost:8000`, if you run one",
              "**OLS** (EMBL-EBI Ontology Lookup Service): no key; exact label matches",
              "**BioPortal**: needs a free `BIOPORTAL_API_KEY`",
              "If none match, it asks you for another mapper URL, or stops with an error",
            ],
          },
        ],
      },
      {
        title: "What you need",
        blocks: [
          {
            needs: {
              required: [
                { item: "StructSense installed", why: "The mapper ships with it." },
                { item: "The one-time index", why: "`python -m scripts.concept_mapping index` builds the offline index of the trusted ontologies." },
              ],
              optional: [
                { item: "Network access", why: "Only for OLS and BioPortal. The trusted ontologies work offline." },
                { item: "`BIOPORTAL_API_KEY`", why: "Adds BioPortal as a fallback source." },
                { item: "A local search service on :8000", why: "Your own hybrid ontology search, tried before the public services." },
              ],
            },
          },
        ],
      },
      {
        title: "Commands",
        blocks: [
          { code: { label: "terminal · build the index (once)", cmd: "python -m scripts.concept_mapping index" } },
          { code: { label: "terminal · map every entity in a result", cmd: "python -m scripts.concept_mapping map result.json" } },
          { code: { label: "terminal · look up one term", cmd: "python -m scripts.concept_mapping lookup \"SST interneuron\" --label CellType" } },
          { code: { label: "terminal · see the configured sources", cmd: "python -m scripts.concept_mapping show" } },
          { p: "`map --only-unmapped` re-tries just the entities that are still unmapped." },
        ],
      },
      {
        title: "Tips",
        blocks: [
          {
            list: [
              "Check a local search service with `curl -s -o /dev/null -w '%{http_code}\\n' http://localhost:8000/docs`.",
              "Claude Desktop and other hosted apps can't reach your `localhost`; use the trusted ontologies or the public services there.",
              "Close matches are kept as close matches, not exact ones, so you can review them.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "synthscholar",
    icon: "▤",
    name: "SynthScholar",
    tag: "REVIEW",
    summary: "PRISMA 2020 systematic and scoping reviews, from protocol to a verified, citable manuscript.",
    sections: [
      {
        title: "What it is",
        blocks: [
          { p: "SynthScholar runs a systematic or scoping review following PRISMA 2020. Every inclusion, exclusion and charted answer keeps its reason and source, and whether it rests on the full text or only the abstract." },
          {
            list: [
              "**Protocol intake**: research question, PICO, eligibility, databases, appraisal tool, validated before anything runs",
              "**Bring your own corpus**: PDFs you supply, or DOIs fetched open access first, then through your library",
              "**Screening, charting, appraisal** (RoB 2, ROBINS-I, Newcastle-Ottawa, QUADAS-2, JBI) and synthesis",
              "**Verified citations**: every DOI and PMID checked against Crossref, DataCite and PubMed, retractions included",
              "**A manuscript** with a PRISMA flow diagram, typeset in the ACM journals layout",
            ],
          },
        ],
      },
      {
        title: "What you need",
        blocks: [
          {
            needs: {
              required: [
                { item: "Node.js 18.17+", why: "For the installer only. It installs nothing else and asks for no key." },
                { item: "Python 3.9+", why: "For the skill's scripts." },
                { item: "`SYNTHSCHOLAR_EMAIL`", why: "Unpaywall requires a contact email (it's skipped without one); Crossref and NCBI ask for it too." },
              ],
              optional: [
                { item: "`pymupdf` (+ `docling` for scans)", why: "Read your PDFs. Scanned PDFs need Docling or they yield no text." },
                { item: "`httpx`", why: "Citation verification and library access." },
                { item: "`playwright` + Chrome, Edge or Chromium", why: "Library (EZproxy) sign-in for paywalled papers." },
                { item: "`pandoc`, a TeX engine, `rsvg-convert`", why: "The typeset PDF manuscript. Without TeX it falls back to a plain layout." },
                { item: "`rdflib` / `psycopg` / `pydantic`", why: "SPARQL over the review, SQL over the article store, and export." },
                { item: "`NCBI_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`", why: "Higher rate limits for PubMed and Semantic Scholar." },
              ],
            },
          },
          { p: "Not sure what's missing? `npx synthscholar doctor` lists what each tool needs and what isn't installed." },
        ],
      },
      {
        title: "Install",
        blocks: [
          { code: { label: "terminal", cmd: "npx synthscholar install                 # Claude Code\nnpx synthscholar install --agent codex   # Codex\nnpx synthscholar install --dest ~/my-agent/skills   # any other" } },
          { code: { label: "terminal · check and maintain", cmd: "npx synthscholar doctor      # what's needed and what's missing\nnpx synthscholar status      # what's installed, which version\nnpx synthscholar uninstall" } },
          { p: "Prefer git? `python scripts/install_skills.py --skills synthscholar` from the [skills repository](" + SKILLS_REPO + ") does the same. Start a new session after installing." },
        ],
      },
      {
        title: "Run a review",
        blocks: [
          { p: "In your AI assistant, start the request with the skill's name, then give it a question, a folder of PDFs, or a list of DOIs. For example, in Claude Code:" },
          { code: { label: "prompt", cmd: "Use /synthscholar to scope a systematic review on knowledge graphs in neuroscience" } },
          { code: { label: "prompt", cmd: "Use /synthscholar to run a review over the PDFs in ./papers" } },
          { list: [
            "**Claude Code**: type `/synthscholar` at the start of your request.",
            "**Codex**: type `$synthscholar` instead, e.g. `Use $synthscholar to …`.",
            "**Other assistants**: name the skill in words, e.g. \"Use the synthscholar skill to …\".",
          ] },
          { p: "**Get full text for DOIs** (open access first, then your library):" },
          { code: { label: "terminal", cmd: "python scripts/fetch_ezproxy.py --doi-file dois.txt --pdf-dir ./pdfs" } },
          { p: "For paywalled papers a browser opens your university's library login at the start of the run (MFA included). Only the proxy's cookies are saved, never your password. OpenAthens and Shibboleth libraries aren't supported." },
          { p: "**Check what the PDF build needs, and draw the PRISMA diagram on its own:**" },
          { code: { label: "terminal", cmd: "python scripts/generate_review_pdf.py --check-deps\npython scripts/prisma_flow.py out/review.json --pdf" } },
        ],
      },
      {
        title: "What you get",
        blocks: [
          {
            list: [
              "`review.md`: the PRISMA 2020 review; `review.manuscript.md`: the paper itself",
              "`review.ttl` / `review.jsonld`: the review as SLR-ontology linked data, ready for BrainKB",
              "`review.json`: the source of truth; keep it",
              "`review.bib`, charting and appraisal tables, figures, and a citation report (`review.citations.md`)",
              "A typeset PDF with its `.tex`, including the PRISMA flow diagram",
            ],
          },
        ],
      },
      {
        title: "Tips and limits",
        blocks: [
          {
            list: [
              "Papers it can't reach stay abstract-only and are reported as such, never quietly included.",
              "Library requests go one at a time, delayed and capped; staying within your library's terms is up to you.",
              "The PDF isn't built while citation errors remain.",
              "Duplicate PDFs aren't removed for you, and the charting form is shaped for biomedical topics.",
              "Every paper is read in full, so long reviews use many model calls.",
              "Read the prose and check flagged items yourself; the report says what a human still needs to verify.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "ingest",
    icon: "⇪",
    name: "Ingest & provenance",
    tag: "ACCOUNT",
    summary: "Put your Turtle into your own space, share it when ready, and trace every change.",
    sections: [
      {
        title: "What it is",
        blocks: [
          { p: "Each ingest loads RDF (Turtle, N-Triples, JSON-LD) into a space as a background job, attributed to your account and recorded as W3C PROV-O with the exact triples it added. Spaces start private; you can share them with a team or publish them." },
        ],
      },
      {
        title: "What you need",
        blocks: [
          {
            needs: {
              required: [
                { item: "A BrainKB account", why: "Sign in with Globus, ORCID or GitHub." },
                { item: "A space", why: "Your workspace; create one private, for yourself or a team." },
                { item: "RDF to load", why: "For example StructSense's `.ttl` or SynthScholar's `review.ttl`." },
              ],
              optional: [
                { item: "A personal access token", why: "To upload from a script; it's revocable and expires on inactivity." },
                { item: "An AI assistant over MCP", why: "Ingest, share and trace in plain language: see [Use with AI](/mcp)." },
              ],
            },
          },
        ],
      },
      {
        title: "Upload a file",
        blocks: [
          { p: "Large files (up to 5 GB) are streamed to the upload endpoint. The server answers `202` with an `upload_id` and ingests in the background:" },
          { code: { label: "python", cmd: `import requests\nrequests.post("${MCP_SITE}/upload",\n              params={"filename": "review.ttl", "graph": "<graph_iri>"},\n              headers={"Authorization": f"Bearer {TOKEN}"},\n              data=open("review.ttl", "rb"))   # streamed off disk` } },
          { p: "Count the triples first, so you can check nothing was lost:" },
          { code: { label: "terminal", cmd: "python -c \"import rdflib; g=rdflib.Graph(); g.parse('review.ttl'); print(len(g), 'triples')\"" } },
        ],
      },
      {
        title: "SynthScholar reviews",
        blocks: [
          {
            list: [
              "Each review goes in its own graph: `https://brainkb.org/synthscholar/reviews/<review_id>/`.",
              "Ingest a review **once**. Ingest is append-only, so a second upload duplicates its content.",
            ],
          },
        ],
      },
      {
        title: "Share and trace",
        blocks: [
          {
            list: [
              "Give members read or edit access, or make a space public. Your name stays on what you added.",
              "Each graph keeps a change history: who ran each ingest, when, and the exact triples it added.",
              "Private spaces are visible to their members only; public spaces are readable by anyone.",
            ],
          },
        ],
      },
    ],
  },
];

/** `code`, **bold** and [text](href) in tutorial copy. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/);
  return (
    <>
      {parts.map((p, n) => {
        if (p.startsWith("`") && p.endsWith("`") && p.length > 1) return <code key={n}>{p.slice(1, -1)}</code>;
        if (p.startsWith("**")) return <b key={n}>{p.slice(2, -2)}</b>;
        const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          return link[2].startsWith("http") ? (
            <a key={n} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>
          ) : (
            <Link key={n} href={link[2]}>{link[1]}</Link>
          );
        }
        return <Fragment key={n}>{p}</Fragment>;
      })}
    </>
  );
}

function Needs({ required, optional }: { required: Need[]; optional: Need[] }) {
  return (
    <div className="tut-needs">
      {[["Required", required, "req"], ["Optional: add it for", optional, "opt"]].map(([label, rows, kind]) => (
        <div key={label as string}>
          <span className={`tut-needs-lbl ${kind}`}>{label as string}</span>
          <dl>
            {(rows as Need[]).map((r) => (
              <Fragment key={r.item}>
                <dt><Rich text={r.item} /></dt>
                <dd><Rich text={r.why} /></dd>
              </Fragment>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function renderBlock(b: Block, k: number) {
  if ("p" in b) return <p key={k}><Rich text={b.p} /></p>;
  if ("list" in b) {
    return (
      <ul key={k} className="tut-list">
        {b.list.map((t) => <li key={t}><Rich text={t} /></li>)}
      </ul>
    );
  }
  if ("code" in b) return <CodeBox key={k} {...b.code} />;
  return <Needs key={k} {...b.needs} />;
}

export default function TutorialHub() {
  const [id, setId] = useState(TOPICS[0].id);
  const topic = TOPICS.find((t) => t.id === id) ?? TOPICS[0];

  // Deep links: /tutorial#synthscholar opens that topic.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (TOPICS.some((t) => t.id === h)) setId(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const pick = (next: string) => {
    setId(next);
    history.replaceState(null, "", `#${next}`);
  };

  return (
    <>
      <div className="tut-path" aria-label="Topics">
        {TOPICS.map((t, n) => (
          <button key={t.id} type="button" aria-pressed={t.id === id} onClick={() => pick(t.id)}>
            <span className="n">{String(n + 1).padStart(2, "0")}</span>
            <span className="ico" aria-hidden="true">{t.icon}</span>
            <b>{t.name}</b>
            <span className="sum">{t.summary}</span>
          </button>
        ))}
      </div>

      <section className="tut-topic" key={topic.id} aria-live="polite">
        <div className="tut-topic-head">
          <span className="ico" aria-hidden="true">{topic.icon}</span>
          <div>
            <h2>{topic.name}</h2>
            <p>{topic.summary}</p>
          </div>
          <span className="tag blue">{topic.tag}</span>
        </div>
        {topic.sections.map((s, n) => (
          <details key={s.title} className="tut-sec" open={n < 2}>
            <summary>{s.title}</summary>
            <div className="tut-sec-body">{s.blocks.map(renderBlock)}</div>
          </details>
        ))}
      </section>
    </>
  );
}
