# Tutorial content

Each chapter of the tutorial at `/tutorial` is one YAML file in this folder.
Add, edit, reorder or remove chapters here. No code change is needed.

- **Order** comes from the file name: `01-…`, `02-…`. To insert a chapter between
  two others, renumber the files.
- **`_shared.yaml`** holds blocks used in more than one chapter. It is not a chapter.
- The page reads these files when it is built, so changes appear after a rebuild,
  or immediately with `npm run dev`.

## A chapter

```yaml
id: structsense                 # used in links: /tutorial#structsense
icon: ◆                         # one character, shown in places without the logo
name: StructSense               # chapter title
tagline: Extract from papers    # short label
summary: One sentence under the title.
wordmark: /structsense-horizontal.png  # optional; horizontal logo shown as the title (in /public)
logo: /brainkb_logo.png         # optional; small logo before the title text (if no wordmark)
facts:                          # optional chips under the title
  Runs on: Your machine
  Requires: Python 3
  Output: Turtle + JSON
prereqs:                        # right panel: Prerequisites
  - Python 3
links:                          # right panel: Useful links
  - label: StructSense on GitHub
    href: "{{SKILLS_REPO}}/tree/main/skills/structsense"
help: "{{SKILLS_REPO}}/issues"  # right panel: Report an issue
tryIt:                          # optional "Try it yourself" box; several become tabs
  - label: GitHub
    cmd: |-
      git clone {{SKILLS_REPO}}
      cd agent_skills
sections:                       # numbered 1.1, 1.2, … automatically
  - title: Overview
    subtitle: One line under the section title.
    blocks:
      - p: A paragraph.
```

## Blocks

Each item in `blocks:` is one of these:

| Block | Example |
|---|---|
| Paragraph | `- p: Text` |
| Sub-heading | `- h: Heading` |
| Info note | `- note: Text` |
| Tips (amber box) | `- tips: [First tip, Second tip]` |
| Numbered list | `- steps: [First, Second]` |
| Feature cards | `- features: [{title: Search, desc: Find things}]` |
| Table | `- table: {cols: [A, B], rows: [[a1, b1], [a2, b2]]}` |
| Code box | `- code: {label: terminal, cmd: "npm install"}` |
| Code tabs (e.g. npx / GitHub) | `- options: [{label: npx, cmd: …}, {label: GitHub, cmd: …}]` |
| Prompt to copy | `- ask: Use /structsense to extract the cell types from paper.pdf` |
| Numbered step card | `- step: {title: Install, desc: Optional line, blocks: [ …more blocks… ]}` |
| Input → output example | `- example: {input: {label, cmd}, outputs: [{label, cmd}, …]}` |
| Required / optional lists | `- needs: {required: [{name, why, cmd?}], optional: [{name, why, cmd?}]}` |
| How to call a skill | `- callSkill: structsense` (Claude Code `/`, Codex `$`, others) |
| Shared block | `- include: cascade` (a key in `_shared.yaml`) |

## Text

- Inline formatting: `` `code` ``, `**bold**`, `*italic*`, `[text](https://…)`.
- Link to a chapter with `[text](#chapter-id)`, or to a section with
  `[text](#chapter-id--section-title)`. The section part is the title in lower case,
  with anything that isn't a letter or digit turned into `-`
  (e.g. `#synthscholar--full-text-library-access`).
- Placeholders, filled in per deployment: `{{MCP_ENDPOINT}}`, `{{MCP_SITE}}`,
  `{{MCP_FLAG}}` (` --mcp sandbox` on the sandbox, empty on production) and
  `{{SKILLS_REPO}}`. Quote any value that starts with `{{`.
- Use `|-` for multi-line commands, so line breaks are kept.

If a file is malformed, the build fails with an error that names the file. For
example, a missing `id`, or an `include:` of a block that isn't in `_shared.yaml`.
