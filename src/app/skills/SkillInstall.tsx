"use client";

// Install commands per agent. The BrainKB skill ships on npm (`brainkb`, which
// also registers the MCP server); StructSense and SynthScholar install from
// sensein/agent_skills with scripts/install_skills.py.

import { useState } from "react";
import { MCP_ENDPOINT } from "../components/marketing/tokens";

// On a sandbox deployment, register the sandbox MCP server instead of production.
const MCP_FLAG = /\/\/mcp\.sandbox\./.test(MCP_ENDPOINT) ? " --mcp sandbox" : "";

const AGENTS = [
  { name: "Claude Code", npm: "", git: "--agent claude", hint: "~/.claude/skills · MCP server registered for you" },
  { name: "Codex", npm: " --agent codex", git: "--agent codex", hint: "~/.agents/skills · prints the MCP URL to add" },
  { name: "Other agent", npm: " --dest /path/to/skills", git: "--dest /path/to/skills", hint: `any SKILL.md agent · add ${MCP_ENDPOINT} in its MCP settings` },
];

function Command({ label, cmd }: { label: string; cmd: string }) {
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
    <>
      <div className="hint">{label}</div>
      <div className="copybar">
        <pre>{cmd}</pre>
        <button type="button" className="btn" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </>
  );
}

export default function SkillInstall({ repo }: { repo: string }) {
  const [i, setI] = useState(0);
  const a = AGENTS[i];

  return (
    <div className="demo">
      <div className="demo-tabs" role="tablist" aria-label="Agent">
        {AGENTS.map((x, k) => (
          <button key={x.name} role="tab" aria-selected={k === i} onClick={() => setI(k)}>
            <i>›_</i>
            {x.name}
          </button>
        ))}
      </div>
      <div className="demo-head">
        <span className="dots">●●●</span>
        <span className="ctx">{a.hint}</span>
      </div>
      <Command label="# BrainKB skill + MCP server, from npm" cmd={`npx brainkb install${a.npm}${MCP_FLAG}`} />
      <Command
        label="# StructSense and SynthScholar, from GitHub"
        cmd={`git clone ${repo}\ncd agent_skills\npython scripts/install_skills.py ${a.git} --skills structsense synthscholar`}
      />
    </div>
  );
}
