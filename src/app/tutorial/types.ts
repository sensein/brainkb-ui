// Shapes of the tutorial content in content/*.yaml (see content/README.md).
// Inline markup in any text: `code`, **bold**, *italic*, [text](href).

export type Code = { label: string; cmd: string };
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
  | { needs: { required: Need[]; optional: Need[] } };

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
  sections: Section[];
};
