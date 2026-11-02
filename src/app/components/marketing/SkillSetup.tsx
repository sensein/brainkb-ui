"use client";

// "Set up and verify": one setup interface with two options, the BrainKB skill
// (recommended; on Claude Code its installer also registers the MCP server) and
// MCP only (the client configuration in the hero). Each skill path is split into
// prerequisite, install (with exactly what gets installed), sign in and verify.
// Advanced flags and troubleshooting are folded away. `code` in text renders as
// inline code. Must render inside an `.lp` root (landing.css).

import { Fragment, useEffect, useState } from "react";
import { MCP_ENDPOINT, MCP_FLAG } from "./tokens";

type Box = { label: string; cmd: string };
type Installs = { what: "Skill" | "MCP server"; where: string }[];
type StepDef = { kind: "Prerequisite" | "Install" | "Sign in" | "Verify"; title: string; text?: string; box?: Box; installs?: Installs; link?: { href: string; text: string } };

const SIGN_IN: StepDef = {
  kind: "Sign in",
  title: "Sign in when you need private data",
  text: "Ask your agent to “log me in to BrainKB”. It opens a browser sign-in with Globus, ORCID or GitHub. Public spaces can be read without signing in.",
  box: { label: "prompt", cmd: "log me in to BrainKB" },
};
const VERIFY: StepDef = {
  kind: "Verify",
  title: "Check the connection",
  text: "Ask the agent to list its BrainKB tools. If they appear, the agent can reach BrainKB; a successful install alone doesn't prove that.",
  box: { label: "prompt", cmd: "list the BrainKB tools you can use" },
};

const AGENTS: { name: string; steps: StepDef[] }[] = [
  {
    name: "Claude Code",
    steps: [
      { kind: "Prerequisite", title: "Claude Code installed", box: { label: "terminal", cmd: "npm install -g @anthropic-ai/claude-code" }, link: { href: "https://docs.claude.com/en/docs/claude-code/overview", text: "Get Claude Code ↗" } },
      {
        kind: "Install", title: "Install the skill and the server",
        box: { label: "terminal", cmd: `npx brainkb install${MCP_FLAG}` },
        installs: [{ what: "Skill", where: "`~/.claude/skills/brainkb`" }, { what: "MCP server", where: "`brainkb`, registered with Claude Code" }],
      },
      SIGN_IN,
      VERIFY,
    ],
  },
  {
    name: "Codex",
    steps: [
      { kind: "Prerequisite", title: "Codex installed", box: { label: "terminal", cmd: "npm install -g @openai/codex" }, link: { href: "https://github.com/openai/codex", text: "Get Codex ↗" } },
      {
        kind: "Install", title: "Install the skill, then add the server",
        box: { label: "terminal", cmd: `npx brainkb install${MCP_FLAG} --agent codex` },
        installs: [{ what: "Skill", where: "`~/.agents/skills/brainkb`" }, { what: "MCP server", where: `not added for you: put \`[mcp_servers.brainkb]\` with \`url = "${MCP_ENDPOINT}"\` in \`~/.codex/config.toml\`` }],
      },
      SIGN_IN,
      VERIFY,
    ],
  },
  {
    name: "Any SKILL.md agent",
    steps: [
      { kind: "Prerequisite", title: "An agent that reads SKILL.md skills", text: "and can connect to an MCP server over streamable HTTP." },
      {
        kind: "Install", title: "Install the skill, then add the server",
        box: { label: "terminal", cmd: "npx brainkb install --dest ~/my-agent/skills --mcp none" },
        installs: [{ what: "Skill", where: "the folder your agent reads skills from" }, { what: "MCP server", where: `add \`${MCP_ENDPOINT}\` in the agent's MCP settings` }],
      },
      SIGN_IN,
      VERIFY,
    ],
  },
];

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, n) =>
        n % 2 ? <code key={n}>{part}</code> : <Fragment key={n}>{part}</Fragment>,
      )}
    </>
  );
}

export function CodeBox({ label, cmd }: Box) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };
  return (
    <div className="codebox">
      <div className="connect-head">
        <span>{label}</span>
        <button type="button" className="copy" onClick={copy} aria-label={`Copy ${label}`}>{copied ? "Copied ✓" : "Copy"}</button>
        <span className="sr-only" aria-live="polite">{copied ? "Copied to clipboard" : ""}</span>
      </div>
      <pre>{cmd}</pre>
    </div>
  );
}

function Steps({ steps, keyPrefix }: { steps: StepDef[]; keyPrefix: string }) {
  return (
    <div className="skill-steps four">
      {steps.map((s, n) => (
        <div key={`${keyPrefix}-${n}`} className={`skill-step${s.kind === "Install" ? " hl" : ""}${s.kind === "Prerequisite" ? " pre" : ""}`}>
          <div className="skill-step-head">
            <span className="num">{n + 1}</span>
            <div>
              <span className="kind">{s.kind}</span>
              <h3>{s.title}</h3>
            </div>
          </div>
          {s.text && <p><Rich text={s.text} /></p>}
          {s.box && <CodeBox {...s.box} />}
          {s.installs && (
            <ul className="installs">
              {s.installs.map((x) => (
                <li key={x.what}>
                  <span className={`stag ${x.what === "Skill" ? "skill" : "mcp"}`}>{x.what}</span> <Rich text={x.where} />
                </li>
              ))}
            </ul>
          )}
          {s.link && <a className="btn" href={s.link.href} target="_blank" rel="noopener noreferrer">{s.link.text}</a>}
        </div>
      ))}
    </div>
  );
}

// Links to #setup-skill / #setup-mcp anywhere on the page open that option and
// scroll here; handled on click (not only on hashchange) so a second click on the
// same link still works, and a hash already in the URL is honoured on load.
const OPTION_HASH: Record<string, "skill" | "mcp"> = { "#setup-skill": "skill", "#setup-mcp": "mcp" };

export default function SkillSetup() {
  const [mode, setMode] = useState<"skill" | "mcp">("skill");
  const [i, setI] = useState(0);
  const a = AGENTS[i];

  useEffect(() => {
    const open = (hash: string) => {
      const m = OPTION_HASH[hash];
      if (!m) return false;
      setMode(m);
      history.replaceState(null, "", hash);
      requestAnimationFrame(() => document.getElementById("setup")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return true;
    };
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href^='#setup-']");
      if (link && open(link.getAttribute("href") ?? "")) e.preventDefault();
    };
    open(location.hash);
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="skill-setup">
      <div className="seg options" role="tablist" aria-label="Setup option">
        <button type="button" role="tab" aria-selected={mode === "skill"} onClick={() => setMode("skill")}>
          BrainKB skill <span className="rec">recommended</span>
        </button>
        <button type="button" role="tab" aria-selected={mode === "mcp"} onClick={() => setMode("mcp")}>MCP only</button>
      </div>

      {mode === "skill" ? (
        <div role="tabpanel">
          <p className="option-note">
            The skill gives your agent BrainKB&apos;s instructions and workflows: checking who it acts as, ingesting
            large files safely, picking the right space and question, and answering provenance questions. It works
            through the MCP server, which the installer adds for Claude Code.
          </p>
          <div className="seg" role="tablist" aria-label="Agent">
            {AGENTS.map((x, k) => (
              <button key={x.name} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)}>{x.name}</button>
            ))}
          </div>
          <Steps steps={a.steps} keyPrefix={a.name} />
        </div>
      ) : (
        <div role="tabpanel">
          <p className="option-note">
            Connect just the MCP server: your agent gets BrainKB&apos;s tools without the skill&apos;s extra
            instructions. Copy your client&apos;s configuration from the panel at the top of this page, then sign in
            and check the connection.
          </p>
          <Steps
            keyPrefix="mcp"
            steps={[
              { kind: "Install", title: "Add the server to your client", text: `Use the configuration for your client in the panel above. The endpoint is \`${MCP_ENDPOINT}\`.`, link: { href: "#connect", text: "Client configuration ↑" } },
              SIGN_IN,
              VERIFY,
            ]}
          />
        </div>
      )}

      <details className="advanced">
        <summary>Advanced options and troubleshooting</summary>
        <ul>
          <li><code>--scope project</code> installs for the current project only (Claude Code).</li>
          <li><code>--agent both</code> installs the skill for Claude Code and Codex.</li>
          <li><code>npx brainkb status</code> shows what is installed; re-running <code>install</code> updates the skill, and a copy you edited is never overwritten silently.</li>
          <li><code>npx brainkb uninstall</code> removes the skill.</li>
          <li>Requires Node.js 18.17 or later.</li>
          <li>
            <a href="https://www.npmjs.com/package/brainkb" target="_blank" rel="noopener noreferrer">brainkb on npm ↗</a> ·{" "}
            <a href="https://github.com/sensein/agent_skills/tree/main/skills/brainkb" target="_blank" rel="noopener noreferrer">Skill on GitHub ↗</a>
          </li>
        </ul>
      </details>
    </div>
  );
}
