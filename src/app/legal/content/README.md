# Legal content

Each legal page at `/legal/<id>` (privacy, fair use, data sharing, terms, …) is
one YAML file in this folder. Add, edit, reorder or remove them here. No code
change is needed: `/legal` lists each one with its sections, and its search box covers them all.

- **Order** comes from the file name: `01-…`, `02-…`. That order also numbers them
  (Policy 01, 02, …).
- **`_page.yaml`** holds the text of the `/legal` page itself (heading, intro,
  search placeholder) and the contact line at the end of each policy. It is not a
  policy; files starting with `_` are skipped.
- The page reads these files when it is built, so changes appear after a rebuild,
  or immediately with `npm run dev`.
- **Changing a policy?** Add an entry at the top of its `history` with a new
  version, today's date, your name and what changed. The page shows the history
  as a table at the bottom, and its newest date as "Updated". Add `commit` once
  the change is committed, to link it.
- `/privacy-policy` redirects to `/legal/privacy-policy` (next.config.mjs), so
  keep that `id`.

## A policy

```yaml
id: data-sharing                # URL: /legal/data-sharing
name: Data Sharing Policy       # title, also used on /legal and the browser tab
tagline: One line under its name, at /legal and on its page.
summary: The opening paragraph, above the first section.
history:                        # newest first; the newest date is shown as "Updated"
  - version: "1.1"
    date: "2026-11-20"            # ISO date
    author: Your Name
    commit: abc1234               # optional; links to the commit on GitHub
    changes: What changed in this version.
  - version: "1.0"
    date: "2026-10-20"
    author: Your Name
    changes: First version.
contact:                        # optional; "Questions about this policy?" at the end
  label: Questions
  email: someone@example.org
sections:                       # numbered 01.1, 01.2, …; linked from /legal and "On this page"; searchable
  - title: Scope
    blocks:
      - p: A paragraph.
```

## Blocks

| Block | Example |
|---|---|
| Paragraph | `- p: Text` |
| Sub-heading | `- h: Heading` |
| Bulleted list | `- list: [First, Second]` |
| Table | `- table: {cols: [Role, Can], rows: [[Viewer, Read], [Editor, Read and ingest]]}` |
| Info note | `- note: Text` |
| Highlighted callout | `- callout: {title: Don't miss this, text: Why it matters}` |

Inline formatting in any text: `` `code` ``, `**bold**`, `*italic*`,
`[text](https://…)`, `[text](/legal/fair-use)`, `[name@example.org](mailto:name@example.org)`.
Use `>-` for long paragraphs; line breaks inside are joined with spaces.
