"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

// Without / with BrainKB: one stage, the same four sources in two states.
const KEYS = ["papers", "datasets", "onto", "notes"] as const;
type Key = (typeof KEYS)[number];

const SRC: Record<Key, { name: string; icon: string; area: string; alias: string; why: string; adds: string; rel: string; loss: string }> = {
  papers: { name: "Papers", icon: "▤", area: "a", alias: "PV+ basket cell", why: "Named in prose, buried in PDFs", adds: "evidence from 27 papers", rel: "mentioned in", loss: "the evidence from 27 papers" },
  datasets: { name: "Datasets", icon: "▦", area: "b", alias: "Pvalb_FS_01", why: "A lab-specific ID in a spreadsheet column", adds: "region · neocortex L4", rel: "located in", loss: "the neocortex L4 region" },
  onto: { name: "Ontologies", icon: "◇", area: "c", alias: "parvalbumin interneuron", why: "A standard term nobody links to", adds: "Cell Ontology mapping", rel: "mapped to", loss: "the Cell Ontology mapping" },
  notes: { name: "Lab notes", icon: "✎", area: "d", alias: "FS interneuron", why: "A finding stuck in a review draft", adds: "expresses PVALB", rel: "expresses", loss: "the PVALB finding" },
};

const list = (a: string[]) => (a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);
const quote = (s: string) => `“${s}”`;

type Geo = { w: number; h: number; paths: Record<string, string>; labels: Record<string, { x: number; y: number }> };

export default function CompareSources() {
  const [mode, setMode] = useState<"without" | "with">("without");
  const [on, setOn] = useState<Record<Key, boolean>>({ papers: true, datasets: true, onto: true, notes: true });
  const [seen, setSeen] = useState(false);
  const [hl, setHl] = useState<Key | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const cards = useRef<Partial<Record<Key, HTMLElement | null>>>({});
  const touched = useRef(false);

  // Links run from the entity in the middle to each source card, in real pixels.
  const draw = useCallback(() => {
    const st = stage.current, h = hub.current;
    if (!st || !h) return;
    const R = st.getBoundingClientRect(), H = h.getBoundingClientRect();
    // The hub may be scaled down while hidden; use its untransformed width.
    const hw = h.offsetWidth, hx = H.left - R.left + H.width / 2, hy = H.top - R.top + H.height / 2;
    const paths: Geo["paths"] = {}, labels: Geo["labels"] = {};
    for (const k of KEYS) {
      const el = cards.current[k];
      if (!el) continue;
      const c = el.getBoundingClientRect();
      const left = c.left < H.left;
      const x = (left ? c.right : c.left) - R.left, y = c.top - R.top + c.height / 2;
      const sx = hx + (left ? -hw / 2 : hw / 2), sy = hy, mx = (sx + x) / 2;
      paths[k] = `M${sx} ${sy} C${mx} ${sy} ${mx} ${y} ${x} ${y}`;
      labels[k] = { x: mx, y: (sy + y) / 2 };
    }
    setGeo({ w: R.width, h: R.height, paths, labels });
  }, []);

  useLayoutEffect(() => {
    draw();
    addEventListener("resize", draw);
    document.fonts?.ready.then(draw);
    return () => removeEventListener("resize", draw);
  }, [draw]);

  // On first view: show the problem, then the fix, and stay on the fix.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        io.disconnect();
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        timer = setTimeout(() => {
          if (touched.current) return;
          setMode("with");
          setSeen(true);
        }, 2600);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const stop = () => {
    touched.current = true;
    setSeen(true);
  };

  const toggle = (k: Key) => {
    stop();
    setOn((o) => ({ ...o, [k]: !o[k] }));
    const el = cards.current[k];
    if (el) {
      el.classList.remove("flash");
      void el.offsetWidth;
      el.classList.add("flash");
    }
  };

  const live = KEYS.filter((k) => on[k]), off = KEYS.filter((k) => !on[k]), n = live.length;
  let say: ReactNode;
  if (mode === "without") {
    say = n ? (
      <><b>Without BrainKB:</b> {n} source{n === 1 ? "" : "s"} call this cell {list(live.map((k) => quote(SRC[k].alias)))}. Nothing connects them, so a search for one name misses the others.</>
    ) : (
      <><b>Without BrainKB:</b> no sources selected.</>
    );
  } else if (!off.length) {
    say = <><b>With BrainKB:</b> all four names resolve to one entity, PV interneuron, and each source adds a linked fact. One search finds all of it.</>;
  } else if (!n) {
    say = <><b>With BrainKB:</b> no sources on, so there is nothing to link.</>;
  } else {
    say = (
      <><b>With BrainKB, {list(off.map((k) => SRC[k].name))} off:</b> the graph loses {list(off.map((k) => SRC[k].loss))}, and {list(off.map((k) => quote(SRC[k].alias)))} {off.length === 1 ? "is" : "are"} no longer matched.</>
    );
  }

  const hover = (k: Key) => ({ onMouseEnter: () => setHl(k), onMouseLeave: () => setHl(null) });
  const card = (k: Key) => (
    <article
      key={k}
      ref={(el) => {
        cards.current[k] = el;
      }}
      className={`c-src${on[k] ? "" : " off"}${hl === k ? " hl" : ""}`}
      style={{ gridArea: SRC[k].area }}
      {...hover(k)}
    >
      <div className="c-sh">
        <i>{SRC[k].icon}</i>
        <b>{SRC[k].name}</b>
        <span className="c-st" />
      </div>
      <p className="c-nm">{quote(SRC[k].alias)}</p>
      <p className="c-why">{SRC[k].why}</p>
      <p className="c-adds">
        Adds: <b>{SRC[k].adds}</b>
      </p>
    </article>
  );

  return (
    <div ref={root} className={`cmp${seen ? " seen" : ""}`} data-mode={mode}>
      <div className="cmp-bar">
        <div className="mode" role="group" aria-label="Compare">
          {(["without", "with"] as const).map((m) => (
            <button
              key={m}
              type="button"
              data-m={m}
              aria-pressed={mode === m}
              onClick={() => {
                stop();
                setMode(m);
              }}
            >
              {m === "without" ? "Without BrainKB" : "With BrainKB"}
            </button>
          ))}
        </div>
        <div className="srcs" role="group" aria-label="Turn sources on or off">
          <span>Switch a source off to see what BrainKB would lose:</span>
          {KEYS.map((k) => (
            <button key={k} type="button" aria-pressed={on[k]} className={hl === k ? "hl" : undefined} onClick={() => toggle(k)} {...hover(k)}>
              <i />
              {SRC[k].name}
            </button>
          ))}
        </div>
      </div>
      <div className="c-stage" ref={stage}>
        <svg className="c-links" aria-hidden="true" viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : undefined}>
          {geo &&
            KEYS.map((k) =>
              geo.paths[k] ? <path key={k} pathLength={1} d={geo.paths[k]} className={on[k] ? "on" : "off"} /> : null,
            )}
        </svg>
        {card("papers")}
        {card("datasets")}
        <div className="c-hub" style={{ gridArea: "h" }}>
          <div className="c-q">
            <b>?</b>
            <span>
              Same cell?
              <br />
              No way to tell.
            </span>
          </div>
          <div className="c-ent" ref={hub}>
            <small>Cell type</small>
            <b>PV interneuron</b>
            <span>{n ? `1 entity · ${n} name${n === 1 ? "" : "s"}` : "no sources"}</span>
          </div>
        </div>
        {card("onto")}
        {card("notes")}
        {geo &&
          KEYS.map((k) =>
            geo.labels[k] ? (
              <span key={k} className={`c-lbl${on[k] ? " on" : ""}`} style={{ left: geo.labels[k].x, top: geo.labels[k].y }}>
                {SRC[k].rel}
              </span>
            ) : null,
          )}
      </div>
      <p className="cmp-say" aria-live="polite">
        {say}
      </p>
    </div>
  );
}
