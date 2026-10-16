"use client";

// Install commands per agent: SynthScholar ships on npm (npx synthscholar);
// StructSense is installed from sensein/agent_skills scripts/install_skills.py.
// Shown as two separate blocks, since they are independent installs.

import { useState } from "react";

const AGENTS = [
  { name: "Claude Code", hint: "# installs to ~/.claude/skills", flag: "--agent claude" },
  { name: "Codex", hint: "# installs to ~/.agents/skills", flag: "--agent codex" },
  { name: "Other agent", hint: "# any agent that loads SKILL.md directories", flag: "--dest /path/to/skills" },
];

export default function SkillInstall({ repo }: { repo: string }) {
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const a = AGENTS[i];
  const fromGit = (skill: string) =>
    `git clone ${repo}\ncd agent_skills\npython scripts/install_skills.py ${a.flag} --skills ${skill}`;
  const blocks = [
    {
      skill: "SynthScholar",
      ways: [
        { via: "from npm", cmd: `npx synthscholar install ${a.flag}` },
        { via: "or from GitHub", cmd: fromGit("synthscholar") },
      ],
    },
    { skill: "StructSense", ways: [{ via: "from GitHub", cmd: fromGit("structsense") }] },
  ];

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
    <div className="demo">
      <div className="demo-tabs" role="tablist" aria-label="Agent">
        {AGENTS.map((x, k) => (
          <button
            key={x.name}
            role="tab"
            aria-selected={k === i}
            onClick={() => {
              setI(k);
              setCopied(null);
            }}
          >
            <i>›_</i>
            {x.name}
          </button>
        ))}
      </div>
      <div className="hint">{a.hint}</div>
      {blocks.map((b) =>
        b.ways.map((w, n) => {
          const id = `${b.skill}-${n}`;
          return (
            <div key={id} className="install-block">
              <div className={`install-label${n ? " alt" : ""}`}>
                {n === 0 && <b>{b.skill}</b>}
                <span>{w.via}</span>
              </div>
              <div className="copybar">
                <pre>{w.cmd}</pre>
                <button type="button" className="btn" onClick={() => copy(id, w.cmd)}>
                  {copied === id ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          );
        }),
      )}
    </div>
  );
}
