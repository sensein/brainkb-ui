"use client";

// "Connect with the BrainKB skill": three steps per agent, as on the MCP
// server's own site. `code` in text renders as inline code. Must render inside
// an `.lp` root (landing.css).

import { Fragment, useState } from "react";
import { MCP_ENDPOINT, MCP_FLAG } from "./tokens";

type Box = { label: string; cmd: string };
type StepDef = {
  title: string;
  tag?: { text: string; kind: "skill" | "mcp" }[];
  text?: string;
  box?: Box;
  foot?: string;
  link?: { href: string; text: string };
};

const AGENTS: { name: string; steps: StepDef[] }[] = [
  {
    name: "Claude Code",
    steps: [
      {
        title: "Install Claude Code",
        box: { label: "terminal", cmd: "npm install -g @anthropic-ai/claude-code" },
        link: { href: "https://docs.claude.com/en/docs/claude-code/overview", text: "Get Claude Code ↗" },
      },
      {
        title: "Install the skill",
        tag: [{ text: "Skill", kind: "skill" }, { text: "MCP server", kind: "mcp" }],
        text: "Adds the skill to `~/.claude/skills/brainkb` and registers `brainkb` with Claude Code.",
        box: { label: "terminal", cmd: `npx brainkb install${MCP_FLAG}` },
        foot: "`--scope project` for this project only · `npx brainkb status` to check.",
      },
      {
        title: "Sign in and ask",
        text: "Start `claude`, then:",
        box: { label: "prompt", cmd: "log me in to BrainKB" },
        foot: "Opens a browser sign-in (Globus, ORCID or GitHub). Then ask, e.g. “Which papers mention the subthalamic nucleus?”",
      },
    ],
  },
  {
    name: "Codex",
    steps: [
      {
        title: "Install Codex",
        box: { label: "terminal", cmd: "npm install -g @openai/codex" },
        link: { href: "https://github.com/openai/codex", text: "Get Codex ↗" },
      },
      {
        title: "Install the skill",
        tag: [{ text: "Skill", kind: "skill" }],
        box: { label: "terminal", cmd: `npx brainkb install${MCP_FLAG} --agent codex` },
        foot: "Installs to `~/.agents/skills/brainkb`; `--agent both` adds Claude Code too.",
      },
      {
        title: "Add the server",
        tag: [{ text: "MCP server", kind: "mcp" }],
        text: "Codex is not registered automatically. Add to `~/.codex/config.toml`, then start `codex` and say “log me in to BrainKB”.",
        box: { label: "~/.codex/config.toml", cmd: `[mcp_servers.brainkb]\nurl = "${MCP_ENDPOINT}"` },
      },
    ],
  },
  {
    name: "Any SKILL.md agent",
    steps: [
      {
        title: "Install the skill",
        tag: [{ text: "Skill", kind: "skill" }],
        box: { label: "terminal", cmd: "npx brainkb install --dest ~/my-agent/skills --mcp none" },
        foot: "Use the folder your agent reads `SKILL.md` skills from.",
      },
      {
        title: "Add the server",
        tag: [{ text: "MCP server", kind: "mcp" }],
        text: `Add \`${MCP_ENDPOINT}\` (streamable HTTP) in the agent's MCP settings. Per-client steps are above.`,
      },
      {
        title: "Sign in and ask",
        text: "Ask the agent to log you in to BrainKB, then ask your question.",
      },
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

function CodeBox({ label, cmd }: Box) {
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
        <button type="button" className="copy" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre>{cmd}</pre>
    </div>
  );
}

export default function SkillSetup() {
  const [i, setI] = useState(0);
  const a = AGENTS[i];

  return (
    <div className="skill-setup">
      <div className="seg" role="tablist" aria-label="Agent">
        {AGENTS.map((x, k) => (
          <button key={x.name} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)}>
            {x.name}
          </button>
        ))}
      </div>
      <div className="skill-steps" role="tabpanel">
        {a.steps.map((s, n) => (
          <div key={`${i}-${n}`} className={`skill-step${s.tag?.some((t) => t.kind === "skill") ? " hl" : ""}`}>
            <div className="skill-step-head">
              <span className="num">{n + 1}</span>
              <h3>{s.title}</h3>
              {s.tag?.map((t) => (
                <span key={t.text} className={`stag ${t.kind}`}>{t.text}</span>
              ))}
            </div>
            {s.text && <p><Rich text={s.text} /></p>}
            {s.box && <CodeBox {...s.box} />}
            {s.foot && <p className="foot"><Rich text={s.foot} /></p>}
            {s.link && (
              <a className="btn" href={s.link.href} target="_blank" rel="noopener noreferrer">{s.link.text}</a>
            )}
          </div>
        ))}
      </div>
      <p className="skill-foot">
        Re-running <code>install</code> updates the skill; a copy you edited is never overwritten silently.{" "}
        <code>npx brainkb uninstall</code> removes it. Node.js 18.17+.{" "}
        <a href="https://www.npmjs.com/package/brainkb" target="_blank" rel="noopener noreferrer">brainkb on npm ↗</a> ·{" "}
        <a href="https://github.com/sensein/agent_skills/tree/main/skills/brainkb" target="_blank" rel="noopener noreferrer">
          Skill on GitHub ↗
        </a>
      </p>
    </div>
  );
}
