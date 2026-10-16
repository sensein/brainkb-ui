"use client";

// MCP setup per client, laid out like the MCP server's own Connect section:
// client pills (✓ = tested with BrainKB), then a pane with the config to copy
// and numbered steps. Must render inside an `.lp` root (landing.css).

import { Fragment, useState } from "react";
import { MCP_CLIENTS, MCP_SITE } from "./tokens";

/** Renders `code` spans in a step. */
function Step({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, n) =>
        n % 2 ? <code key={n}>{part}</code> : <Fragment key={n}>{part}</Fragment>,
      )}
    </>
  );
}

export default function InstallCard({ authNote = false }: { authNote?: boolean }) {
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const c = MCP_CLIENTS[i];
  const toCopy = "copy" in c && c.copy ? c.copy : c.cmd;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <div className="connect">
      <div className="connect-tabs" role="tablist" aria-label="MCP client">
        {MCP_CLIENTS.map((x, k) => (
          <button
            key={x.name}
            type="button"
            role="tab"
            aria-selected={k === i}
            onClick={() => {
              setI(k);
              setCopied(false);
            }}
          >
            {x.name.split(" · ").map((part, n) => (
              <Fragment key={part}>
                {n > 0 && <span className="sep"> · </span>}
                {part}
                {x.tested[n] && <span className="ok" aria-label="tested"> ✓</span>}
              </Fragment>
            ))}
          </button>
        ))}
      </div>
      <div className="connect-pane" role="tabpanel">
        <div className="connect-head">
          <span>{c.title}</span>
          <button type="button" className="copy" onClick={handleCopy}>
            {copied ? "Copied" : "copyLabel" in c && c.copyLabel ? c.copyLabel : "Copy"}
          </button>
        </div>
        <pre>{c.cmd}</pre>
        <ol className="connect-steps">
          {c.steps.map((t) => (
            <li key={t}><Step text={t} /></li>
          ))}
        </ol>
      </div>
      {authNote && (
        <p className="muted-p">
          <span className="ok">✓</span> tested with BrainKB. No login is needed to read public spaces; for anything
          else your agent signs you in with Globus, ORCID or GitHub. More detail:{" "}
          <a href={MCP_SITE} target="_blank" rel="noopener noreferrer">setup guide ↗</a>
        </p>
      )}
    </div>
  );
}
