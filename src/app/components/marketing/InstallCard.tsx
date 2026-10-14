"use client";

// MCP install snippets per client. Styled with the Home page's `.demo` frame,
// so it must render inside an `.lp` root (components/marketing/landing/landing.css).

import { useState } from "react";
import { MCP_CLIENTS } from "./tokens";

interface InstallCardProps {
  /** Shows a "then ask" example prompt below the code box. */
  showThenAsk?: boolean;
  /** Shows a short authentication note below the card. */
  authNote?: boolean;
}

export default function InstallCard({ showThenAsk = false, authNote = false }: InstallCardProps) {
  const [clientName, setClientName] = useState<string>(MCP_CLIENTS[0].name);
  const [copied, setCopied] = useState(false);
  const client = MCP_CLIENTS.find((c) => c.name === clientName) ?? MCP_CLIENTS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(client.cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <div>
      <div className="demo">
        <div className="demo-tabs" role="tablist" aria-label="MCP client">
          {MCP_CLIENTS.map((c) => (
            <button
              key={c.name}
              role="tab"
              aria-selected={c.name === client.name}
              onClick={() => {
                setClientName(c.name);
                setCopied(false);
              }}
            >
              <i>✳</i>
              {c.name}
            </button>
          ))}
        </div>
        <div className="demo-head">
          <span className="dots">●●●</span>
          <span className="ctx">Add BrainKB to {client.name}</span>
          <span className="pill pub">NO LOGIN TO READ</span>
        </div>
        <div className="hint">{client.hint}</div>
        <div className="copybar">
          <pre>{client.cmd}</pre>
          <button type="button" className="btn" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {showThenAsk && (
          <div className="demo-body" style={{ minHeight: 0, paddingTop: 0 }}>
            <div className="ln out">› then ask</div>
            <div className="ln ask">Which datasets profile L5 extratelencephalic neurons in human motor cortex?</div>
          </div>
        )}
      </div>
      {authNote && (
        <p className="muted-p">
          Sign in once, mint a Personal Access Token (<code>brainkb_create_token()</code> after a one-time Globus
          login), and send it with each request as <code>Authorization: Bearer brainkb_pat_…</code>. Tokens are
          revocable and expire on inactivity.
        </p>
      )}
    </div>
  );
}
