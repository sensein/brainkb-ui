// Shapes of the tutorial content in content/*.yaml (see content/README.md).
// Inline markup in any text: `code`, **bold**, *italic*, [text](href).

/** The assistants a reader can pick; commands that differ per assistant are keyed by these. */
export type AgentId = "claude" | "codex" | "other";

/** `agent` (optional, in tryIt only): show this item only when that assistant is chosen. */
export type Code = { label: string; cmd: string; agent?: AgentId };
export type Need = { name: string; why: string; cmd?: string };

export type Block =
  | { p: string }
  | { h: string }
  | { note: string }
  | { features: { title: string; desc: string }[] }
  | { steps: string[] }
  | { tips: string[] }
  | { table: { cols: string[]; rows: string[][] } }
  | { code: Code }
  | { options: Code[] }
  | { ask: string }
  | { step: { title: string; desc?: string; blocks: Block[] } }
  | { example: { input: Code; outputs: Code[] } }
  | { needs: { required: Need[]; optional: Need[] } }
  /** Different blocks per assistant; shown after the reader chooses one. */
  | { agents: Partial<Record<AgentId, Block[]>> }
  /** A collapsed reference section (flags, alternatives, maintenance, limits). */
  | { details: { summary: string; blocks: Block[] } }
  /** A highlighted callout, for something readers must not miss. */
  | { callout: { title: string; text: string } }
  /** End of an exercise: what you should see, and where to look if you don't. */
  | { outcome: { expect: string; trouble?: string } };

export type Section = { title: string; subtitle: string; blocks: Block[] };

export type Topic = {
  id: string;
  icon: string;
  name: string;
  tagline: string;
  summary: string;
  /** Shown as chips under the chapter title, e.g. { "Runs on": "Your machine" }. */
  facts: Record<string, string>;
  prereqs: string[];
  links: { label: string; href: string }[];
  help: string;
  /** Small logo shown before the chapter title (a path under /public). */
  logo?: string;
  /** Horizontal logo (symbol + name) shown instead of the title text (a path under /public). */
  wordmark?: string;
  /** One or more ways to start (e.g. npx and GitHub), shown as tabs. */
  tryIt?: Code[];
  /** Show the "Which assistant do you use?" picker under the chapter title. */
  chooseAgent?: boolean;
  sections: Section[];
};
