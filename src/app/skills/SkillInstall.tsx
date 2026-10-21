"use client";

// Install panel: pick a tool by what you want to do, then your agent; shows one
// recommended route, prerequisites, a check that it worked and an example of
// the installer's output, with the other routes folded away.
// Commands and output are taken from the installers themselves, not invented:
// SynthScholar ships on npm (npx synthscholar: install / status / doctor);
// StructSense installs from sensein/agent_skills scripts/install_skills.py.
// `#install-structsense` / `#install-synthscholar` preselect a tool.

import { useEffect, useState } from "react";

type ToolId = "structsense" | "synthscholar";
type AgentId = "claude" | "codex" | "other";

const TOOLS: { id: ToolId; goal: string; name: string }[] = [
  { id: "structsense", goal: "Extract information from papers", name: "StructSense" },
  { id: "synthscholar", goal: "Run a literature review", name: "SynthScholar" },
];

const AGENTS: { id: AgentId; name: string }[] = [
  { id: "claude", name: "Claude Code" },
  { id: "codex", name: "Codex" },
  { id: "other", name: "Other agent" },
];

/** Skills directory per agent (user scope), as both installers use. */
const SKILLS_DIR: Record<AgentId, string> = {
  claude: "~/.claude/skills",
  codex: "~/.agents/skills",
  other: "/path/to/skills",
};

type Cmd = { label: string; cmd: string };
type Plan = {
  route: string;
  prereqs: string[];
  install: Cmd[];
  verify: Cmd[];
  verifyNote: string;
  example: string;
  others: (Cmd & { note: string })[];
};

function plan(tool: ToolId, agent: AgentId, repo: string): Plan {
  const dir = SKILLS_DIR[agent];
  const shown = agent === "other" ? dir : dir.replace("~", "/Users/you");
  const agentFlag = agent === "other" ? `--dest ${dir}` : `--agent ${agent}`;
  const clone = `git clone ${repo}\ncd agent_skills`;
  const describe = `Describe the ${tool} skill and what it needs`;
  const agentNeed =
    agent === "other" ? "An agent that loads SKILL.md directories" : `${AGENTS.find((a) => a.id === agent)!.name}, installed`;

  if (tool === "synthscholar") {
    const npxFlag = agent === "claude" ? "" : agent === "codex" ? " --agent codex" : ` --dest ${dir}`;
    const statusFlag = agent === "other" ? ` --dest ${dir}` : "";
    return {
      route: "from npm",
      prereqs: [
        "Node.js 18.17 or newer, for the installer",
        "Python 3.9 or newer, for the skill's scripts",
        agentNeed,
      ],
      install: [{ label: "terminal", cmd: `npx synthscholar install${npxFlag}` }],
      verify: [
        { label: "terminal", cmd: `npx synthscholar status${statusFlag}\nnpx synthscholar doctor   # which Python packages, pandoc and TeX are present` },
        { label: "then ask your agent", cmd: describe },
      ],
      verifyNote:
        "Restart the agent (or start a new session) first. status shows the installed version and where; doctor reports what is missing and installs nothing.",
      example: [
        `  skill install ${shown}/synthscholar`,
        "",
        "Done. Restart the agent (or start a new session) to load the skill.",
        "Next: `npx synthscholar doctor` shows which of the skill's tools (Python packages,",
        "pandoc, TeX for the PDF) are present. The skill asks before installing any of them.",
      ].join("\n"),
      others: [
        {
          label: "From the repository",
          note: "Same skill, copied by the repository's install script.",
          cmd: `${clone}\npython scripts/install_skills.py ${agentFlag} --skills synthscholar`,
        },
        ...(agent === "other"
          ? []
          : [{
              label: "This project only",
              note: "Installs into ./.claude/skills or ./.agents/skills of the current directory.",
              cmd: `npx synthscholar install${npxFlag} --scope project`,
            }]),
      ],
    };
  }

  return {
    route: "from the repository",
    prereqs: [
      "Git and Python 3",
      agentNeed,
      "A model: the agent's own, a hosted API key, or a local model (see the privacy note below)",
    ],
    install: [
      { label: "terminal", cmd: `${clone}\npython scripts/install_skills.py ${agentFlag} --skills structsense` },
      { label: "then its Python dependencies", cmd: `pip install -r ${dir}/structsense/requirements.txt` },
    ],
    verify:
      agent === "claude"
        ? [
            { label: "in Claude Code", cmd: "/skills" },
            { label: "or ask", cmd: describe },
          ]
        : [
            { label: "terminal", cmd: `ls ${dir}/structsense/SKILL.md` },
            { label: "then ask your agent", cmd: describe },
          ],
    verifyNote:
      agent === "claude"
        ? "Start a new session first. structsense should be listed with its one-line description."
        : "Start a new session first. The agent should describe StructSense from its SKILL.md.",
    example: `installing: structsense -> ${shown}/structsense`,
    others: [
      ...(agent === "other"
        ? []
        : [{
            label: "This project only",
            note: "Run from your project's root, using the clone from above.",
            cmd: `python /path/to/agent_skills/scripts/install_skills.py --agent ${agent} --scope project --skills structsense`,
          }]),
      {
        label: "Copy the folder by hand",
        note: "From the clone above; the skill is a plain directory with a SKILL.md.",
        cmd: `cp -r skills/structsense ${dir}/structsense`,
      },
    ],
  };
}

function CopyBar({ id, cmd, copied, onCopy }: { id: string; cmd: string; copied: string | null; onCopy: (id: string, cmd: string) => void }) {
  return (
    <div className="copybar">
      <pre>{cmd}</pre>
      <button type="button" className="btn" onClick={() => onCopy(id, cmd)}>
        {copied === id ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function SkillInstall({ repo }: { repo: string }) {
  const [tool, setTool] = useState<ToolId>("structsense");
  const [agent, setAgent] = useState<AgentId>("claude");
  const [copied, setCopied] = useState<string | null>(null);
  const p = plan(tool, agent, repo);
  const toolName = TOOLS.find((t) => t.id === tool)!.name;

  // Links elsewhere on the page (#install-structsense, #install-agent-codex, …)
  // preselect a tool or agent and scroll here. Handled on click, not only on
  // hashchange, so clicking the same link twice still scrolls.
  useEffect(() => {
    const select = (hash: string) => {
      const m = hash.match(/^#install-(?:(structsense|synthscholar)|agent-(claude|codex|other))$/);
      if (!m) return false;
      if (m[1]) setTool(m[1] as ToolId);
      if (m[2]) setAgent(m[2] as AgentId);
      setCopied(null);
      return true;
    };
    const scroll = () => document.getElementById("install")?.scrollIntoView({ behavior: "smooth", block: "start" });
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href^='#install-']");
      const hash = a?.getAttribute("href") ?? "";
      if (!select(hash)) return;
      e.preventDefault();
      history.replaceState(null, "", hash);
      scroll();
    };
    if (select(window.location.hash)) setTimeout(scroll, 60);
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const copy = async (id: string, cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <div className="demo sk-install">
      <div className="sk-pick">
        <span className="sk-k">1 · What do you want to do?</span>
        <div className="sk-choices" role="radiogroup" aria-label="Tool">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === tool}
              onClick={() => { setTool(t.id); setCopied(null); }}
            >
              <span>{t.goal}</span>
              <b>→ {t.name}</b>
            </button>
          ))}
        </div>
      </div>

      <div className="sk-pick">
        <span className="sk-k">2 · Choose your agent</span>
      </div>
      <div className="demo-tabs" role="tablist" aria-label="Agent">
        {AGENTS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === agent}
            onClick={() => { setAgent(a.id); setCopied(null); }}
          >
            <i>›_</i>
            {a.name}
          </button>
        ))}
      </div>

      <div className="sk-sec">
        <span className="sk-k">Before you start</span>
        <ul className="sk-pre">
          {p.prereqs.map((x) => <li key={x}>{x}</li>)}
        </ul>
      </div>

      {tool === "synthscholar" && (
        <div className="sk-callout" role="note">
          <b>Running SynthScholar inside Claude Code or another agent? You don&apos;t need an OpenRouter API key.</b>
          <p>
            Without <code>OPENROUTER_API_KEY</code>, the skill uses the agent itself as the model: the agent screens,
            charts, appraises and synthesises the papers, and the review is exported in the same format. If a key is
            set, the skill prefers SynthScholar&apos;s own pipeline, which uses it; to keep the agent as the model, tell
            it so, e.g. &ldquo;run this SynthScholar review yourself, as the agent, without OpenRouter&rdquo;. You need
            the key only to run SynthScholar&apos;s own pipeline (the <code>synthscholar</code> Python package) instead
            of the agent.
          </p>
        </div>
      )}

      <div className="sk-sec">
        <span className="sk-k">3 · Install {toolName} <em>recommended · {p.route}</em></span>
      </div>
      {p.install.map((c, n) => (
        <div key={c.label} className="install-block">
          {n > 0 && <div className="install-label alt"><span>{c.label}</span></div>}
          <CopyBar id={`i-${n}`} cmd={c.cmd} copied={copied} onCopy={copy} />
        </div>
      ))}

      <div className="sk-sec">
        <span className="sk-k">4 · Check it worked</span>
        <p className="sk-note-s">{p.verifyNote}</p>
      </div>
      {p.verify.map((c, n) => (
        <div key={c.label} className="install-block">
          <div className="install-label alt"><span>{c.label}</span></div>
          <CopyBar id={`v-${n}`} cmd={c.cmd} copied={copied} onCopy={copy} />
        </div>
      ))}

      <div className="sk-sec">
        <span className="sk-k">Example output <em>of the install command; your paths will differ</em></span>
        <pre className="sk-example" aria-label="Example installer output">{p.example}</pre>
      </div>

      <details className="sk-more">
        <summary>Other ways to install {toolName}</summary>
        {p.others.map((c, n) => (
          <div key={c.label} className="install-block">
            <div className="install-label"><b>{c.label}</b><span>{c.note}</span></div>
            <CopyBar id={`o-${n}`} cmd={c.cmd} copied={copied} onCopy={copy} />
          </div>
        ))}
      </details>
    </div>
  );
}
