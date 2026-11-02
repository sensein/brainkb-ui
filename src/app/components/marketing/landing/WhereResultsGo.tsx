"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Dest = "own" | "org" | "both";

const CHOICES: { d: Dest; label: string }[] = [
  { d: "own", label: "Your BrainKB" },
  { d: "org", label: "BrainKB.org" },
  { d: "both", label: "Both" },
];

/** Tools on your machine send results to a self-hosted BrainKB, BrainKB.org, or both. */
export default function WhereResultsGo() {
  const [choice, setChoice] = useState<Dest>("both");
  const [anim, setAnim] = useState(false);
  const [inView, setInView] = useState(false);
  const [paths, setPaths] = useState({ a: "", b: "", w: 100 });
  const topo = useRef<HTMLDivElement>(null);
  const fork = useRef<HTMLDivElement>(null);
  const dests = useRef<Partial<Record<"own" | "org", HTMLDivElement | null>>>({});
  const touched = useRef(false);

  // Draw the fork in real pixels so the dashes and pulses keep their shape at any width.
  useLayoutEffect(() => {
    const draw = () => {
      const W = fork.current?.clientWidth ?? 100, H = 60, mid = W / 2;
      setPaths({ a: `M${mid} 0V26H${W * 0.25}V${H}`, b: `M${mid} 0V26H${W * 0.75}V${H}`, w: W });
    };
    draw();
    addEventListener("resize", draw);
    return () => removeEventListener("resize", draw);
  }, []);

  // On first view: parts arrive in order, then the choice demonstrates itself once.
  useEffect(() => {
    const el = topo.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) setAnim(true);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setInView(true);
        if (reduce) return;
        ([[1200, "own"], [3600, "org"], [6000, "both"]] as const).forEach(([ms, d]) =>
          timers.push(setTimeout(() => !touched.current && setChoice(d), ms)),
        );
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  // A destination pings each time a pulse arrives.
  const ping = (d: "own" | "org") => {
    const c = dests.current[d];
    if (!c || c.classList.contains("off")) return;
    c.classList.remove("ping");
    void c.offsetWidth;
    c.classList.add("ping");
  };

  const destClass = (d: "own" | "org") => {
    const hit = choice === "both" || choice === d;
    return `dest${hit && choice !== "both" ? " on" : ""}${hit ? "" : " off"}`;
  };

  return (
    <div
      ref={topo}
      className={`topo${anim ? " anim" : ""}${inView ? " in" : ""}`}
      aria-label="Diagram: tools on your machine send results either to your own self-hosted BrainKB or directly to BrainKB.org"
    >
      <div className="cap">
        <span>Where your results go</span>
        <span>You choose</span>
      </div>
      <div className="tier">
        <span className="ic" aria-hidden="true">⌂</span>
        <div>
          <h4>Your machine</h4>
          <p>Extract entities and run reviews locally</p>
        </div>
        <span className="state"><i />LOCAL</span>
        <ul>
          <li>StructSense</li>
          <li>SynthScholar</li>
          <li>local MCP</li>
          <li>your model</li>
        </ul>
      </div>
      <div className="fork" aria-hidden="true" ref={fork}>
        <svg viewBox={`0 0 ${paths.w} 60`}>
          <path className={`base${choice === "org" ? " off" : ""}`} d={paths.a} />
          <path className={`base${choice === "own" ? " off" : ""}`} d={paths.b} />
          <path className={`pulse p-a${choice === "org" ? " off" : ""}`} pathLength={100} d={paths.a} onAnimationIteration={() => ping("own")} />
          <path className={`pulse p-b${choice === "own" ? " off" : ""}`} pathLength={100} d={paths.b} onAnimationIteration={() => ping("org")} />
        </svg>
        <span>send RDF + provenance to either, or both</span>
      </div>
      <div className="dests">
        <div className={destClass("own")} data-d="own" ref={(el) => { dests.current.own = el; }}>
          <div className="dh">
            <span className="ic" aria-hidden="true">▣</span>
            <span className="state"><i />SELF-HOSTED</span>
          </div>
          <h4>Your own BrainKB</h4>
          <p>Run the full stack for your lab, a consortium or offline work.</p>
          <ul>
            <li className="cmd">$ docker compose up</li>
            <li>private</li>
            <li>offline</li>
          </ul>
        </div>
        <div className={destClass("org")} data-d="org" ref={(el) => { dests.current.org = el; }}>
          <div className="dh">
            <span className="ic" aria-hidden="true">◎</span>
            <span className="state"><i />HOSTED</span>
          </div>
          <h4>BrainKB.org</h4>
          <p>The shared community graph. Nothing to install or run.</p>
          <ul>
            <li>private space</li>
            <li>team</li>
            <li>public</li>
          </ul>
        </div>
      </div>
      <div className="sendto">
        <span>Send to</span>
        <span className="seg" role="group" aria-label="Choose where results go">
          {CHOICES.map((c) => (
            <button
              key={c.d}
              type="button"
              aria-pressed={choice === c.d}
              onClick={() => {
                touched.current = true;
                setChoice(c.d);
              }}
            >
              {c.label}
            </button>
          ))}
        </span>
      </div>
      <p className="later">Started on your own BrainKB? You can publish to BrainKB.org later. Your name stays on every triple.</p>
    </div>
  );
}
