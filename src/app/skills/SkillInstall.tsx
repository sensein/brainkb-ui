"use client";

// Install commands per agent, from sensein/agent_skills scripts/install_skills.py.

import { useState } from "react";

const SKILLS = "structsense synthscholar";

const AGENTS = [
  { name: "Claude Code", hint: "# installs to ~/.claude/skills", flag: "--agent claude" },
  { name: "Codex", hint: "# installs to ~/.agents/skills", flag: "--agent codex" },
  { name: "Other agent", hint: "# any agent that loads SKILL.md directories", flag: "--dest /path/to/skills" },
];

export default function SkillInstall({ repo }: { repo: string }) {
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const a = AGENTS[i];
  const cmd = `git clone ${repo}\ncd agent_skills\npython scripts/install_skills.py ${a.flag} --skills ${SKILLS}`;

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
    <div className="demo">
      <div className="demo-tabs" role="tablist" aria-label="Agent">
        {AGENTS.map((x, k) => (
          <button
            key={x.name}
            role="tab"
            aria-selected={k === i}
            onClick={() => {
              setI(k);
              setCopied(false);
            }}
          >
            <i>›_</i>
            {x.name}
          </button>
        ))}
      </div>
      <div className="hint">{a.hint}</div>
      <div className="copybar">
        <pre>{cmd}</pre>
        <button type="button" className="btn" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
