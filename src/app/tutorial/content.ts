// Loads the tutorial chapters from content/*.yaml (server only). Adding a
// chapter means adding a YAML file; no code change. See content/README.md.

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { MCP_ENDPOINT, MCP_FLAG, MCP_SITE } from "../components/marketing/tokens";
import type { Block, Topic } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "src", "app", "tutorial", "content");

/** `{{NAME}}` placeholders available in any text; the MCP values differ per deployment. */
const VARS: Record<string, string> = {
  MCP_ENDPOINT,
  MCP_FLAG,
  MCP_SITE,
  SKILLS_REPO: "https://github.com/sensein/agent_skills",
};

function fill(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/\{\{(\w+)\}\}/g, (m, name: string) => {
      if (!(name in VARS)) throw new Error(`Unknown placeholder ${m}`);
      return VARS[name];
    });
  }
  if (Array.isArray(value)) return value.map(fill);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v)]));
  }
  return value;
}

/** How to call a skill by name in each assistant. */
const callSkill = (skill: string): Block => ({
  tips: [
    `**Claude Code**: start with \`/${skill}\`.`,
    `**Codex**: start with \`$${skill}\`, e.g. \`Use $${skill} to …\`.`,
    `**Other assistants**: name it in words, e.g. "Use the ${skill} skill to …".`,
  ],
});

/** Expands `include: <name>` (from _shared.yaml) and `callSkill: <skill>` blocks. */
function expand(blocks: unknown[], shared: Record<string, Block>, where: string): Block[] {
  return blocks.map((b) => {
    const block = b as Record<string, unknown>;
    if (typeof block.include === "string") {
      const found = shared[block.include];
      if (!found) throw new Error(`${where}: no shared block "${block.include}" in _shared.yaml`);
      return found;
    }
    if (typeof block.callSkill === "string") return callSkill(block.callSkill);
    if (block.step && typeof block.step === "object") {
      const step = block.step as { blocks?: unknown[] };
      return { step: { ...step, blocks: expand(step.blocks ?? [], shared, where) } } as Block;
    }
    return block as Block;
  });
}

export function loadTutorial(): Topic[] {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => /\.ya?ml$/.test(f)).sort();
  const sharedFile = files.find((f) => f.startsWith("_shared."));
  const shared = sharedFile
    ? (fill(yaml.load(fs.readFileSync(path.join(CONTENT_DIR, sharedFile), "utf8"))) as Record<string, Block>)
    : {};

  return files
    .filter((f) => !f.startsWith("_"))
    .map((file) => {
      const raw = fill(yaml.load(fs.readFileSync(path.join(CONTENT_DIR, file), "utf8"))) as Topic;
      for (const key of ["id", "name", "summary", "sections"] as const) {
        if (!raw?.[key]) throw new Error(`tutorial/content/${file}: missing "${key}"`);
      }
      return {
        ...raw,
        facts: raw.facts ?? {},
        prereqs: raw.prereqs ?? [],
        links: raw.links ?? [],
        sections: raw.sections.map((s) => ({ ...s, blocks: expand(s.blocks ?? [], shared, `${file} › ${s.title}`) })),
      };
    });
}
