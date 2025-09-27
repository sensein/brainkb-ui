'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState, useCallback } from 'react';

const Tree = dynamic(() => import('react-d3-tree').then(m => m.Tree), { ssr: false });

type NodeMeta = Record<string, string | number | boolean | null | undefined>;

export default function HMBATaxonomyPage() {
  const [data, setData] = useState<any>(null);

  // Fullscreen container + size
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Camera
  const [translate, setTranslate] = useState<{ x: number; y: number }>({ x: 160, y: 300 });
  const [zoom, setZoom] = useState<number>(1);

  // Tooltip
  const [hoverNode, setHoverNode] = useState<any | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load data
  useEffect(() => {
    fetch('/treeData.json')
      .then(r => r.json())
      .then(setData)
      .catch(e => console.error('Error loading tree data:', e));
  }, []);

  // Observe viewport size
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fetch tree data from API
  // useEffect(() => {
  //   const controller = new AbortController();
    
  //   const fetchTreeData = async () => {
  //     try {
  //       const res = await fetch('/api/hmba-taxonomy-data', {
  //         method: "GET",
  //         signal: controller.signal,
  //       });

  //       if (!res.ok) {
  //         console.error("Failed to fetch tree data:", await res.text());
  //         return;
  //       }

  //       const data = await res.json();
  //       setData(data);
  //     } catch (err: any) {
  //       if (err?.name === "AbortError") return;
  //       console.error("Error loading tree data:", err);
  //     }
  //   };

  //   fetchTreeData();
  //   return () => controller.abort();
  // }, []);

  // Tooltip helpers
  const getClampedPos = (rawX: number, rawY: number) => {
    const pad = 10;
    const offset = 12;
    const cont = containerRef.current;
    const tip = tooltipRef.current;
    if (!cont || !tip) return { left: rawX + offset, top: rawY + offset };

    const cw = cont.clientWidth;
    const ch = cont.clientHeight;
    const tw = tip.offsetWidth ?? 0;
    const th = tip.offsetHeight ?? 0;

    let left = rawX + offset;
    let top = rawY + offset;

    if (left + tw + pad > cw) left = Math.max(pad, cw - tw - pad);
    if (top + th + pad > ch) top = Math.max(pad, ch - th - pad);
    if (left < pad) left = pad;
    if (top < pad) top = pad;

    return { left, top };
  };

  const updateMouse = (evt: React.MouseEvent<SVGGElement, MouseEvent>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: evt.clientX - rect.left, y: evt.clientY - rect.top });
  };

  // --- Fit to content ---
  const fitToContent = useCallback(() => {
    const cont = containerRef.current;
    if (!cont) return;
    const g = cont.querySelector<SVGGElement>('.rd3t-g');
    if (!g) return;

    const bbox = g.getBBox();
    if (!bbox || bbox.width === 0 || bbox.height === 0) return;

    const cw = cont.clientWidth;
    const ch = cont.clientHeight;
    const pad = 60;

    const scaleX = cw / (bbox.width + pad * 2);
    const scaleY = ch / (bbox.height + pad * 2);
    // ⭐ keep scale within a sane range (prevents super-tiny text)
    const scale = Math.min(1.5, Math.max(0.3, Math.min(scaleX, scaleY)));

    const contentW = bbox.width * scale;
    const contentH = bbox.height * scale;

    const left = (cw - contentW) / 2;
    const top = (ch - contentH) / 2;

    const tx = left - bbox.x * scale;
    const ty = top - bbox.y * scale;

    setTranslate({ x: tx, y: ty });
    setZoom(scale);
  }, []);

  useEffect(() => {
    if (!data || size.width === 0 || size.height === 0) return;
    const id = requestAnimationFrame(() => fitToContent());
    return () => cancelAnimationFrame(id);
  }, [data, size.width, size.height, fitToContent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        fitToContent();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fitToContent]);

  if (!data) return <div>Loading...</div>;

// Custom node renderer
const renderCustomNode = ({ nodeDatum, toggleNode }: any) => (
  <g
    onClick={toggleNode}
    onMouseEnter={() => setHoverNode(nodeDatum)}
    onMouseLeave={() => setHoverNode(null)}
    onMouseMove={updateMouse}
    cursor="pointer"
  >
    {/* Circle */}
    <circle
      r={15}
      fill={nodeDatum.nodeColor || 'lightgray'}
      stroke="#1f2937"
      strokeWidth={1.25}
      vectorEffect="non-scaling-stroke"
      shapeRendering="geometricPrecision"
    />

    {/* Non-scaling text with black fill */}
    <g transform={`scale(${1 / zoom})`}>
      <text
        x={20}
        dy={5}
        style={{
          pointerEvents: 'none',
          fontSize: '14px',
          fill: 'black',            // 👈 force text fill to black
          paintOrder: 'stroke',
          stroke: 'white',          // halo only
          strokeWidth: 3,
        }}
      >
        {nodeDatum.name}
      </text>
    </g>

    <title>
      {nodeDatum.name}
      {nodeDatum.meta
        ? Object.entries(nodeDatum.meta as NodeMeta)
            .map(([k, v]) => `\n${k}: ${v}`)
            .join('')
        : ''}
    </title>
  </g>
);


  const Tooltip = () => {
    if (!hoverNode) return null;
    const { left, top } = getClampedPos(mousePos.x, mousePos.y);
    const meta: NodeMeta | undefined = hoverNode.meta;

    return (
      <div
        ref={tooltipRef}
        className="
          absolute z-10 rounded-md border border-gray-300 bg-white/95 backdrop-blur
          px-3 py-2 text-sm shadow-md
          max-w-[420px]
          whitespace-pre-wrap break-words break-all
          pointer-events-none
        "
        style={{ left, top }}
      >
        <div className="mb-1 font-semibold">{hoverNode.name || '(root)'}</div>
        {meta ? (
          <div className="space-y-0.5">
            {Object.entries(meta).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="opacity-70">{k}:</span>
                <span className="font-medium">{String(v)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="opacity-70">No metadata</div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="fixed inset-0 m-0 p-0 overflow-hidden">
      {/* ⭐ global SVG crispness tweaks */}
      <style jsx global>{`
        .rd3t-svg {
          shape-rendering: geometricPrecision;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .rd3t-link path {
          vector-effect: non-scaling-stroke;      /* crisp links */
          shape-rendering: geometricPrecision;
          stroke-width: 1.25px;
        }
      `}</style>

      {/* Tooltip */}
      <Tooltip />

      {/* Fit button */}
      <button
        onClick={fitToContent}
        className="absolute right-4 top-4 z-20 rounded-md border border-gray-300 bg-white/90 px-3 py-1 text-sm shadow hover:bg-white"
        title="Fit to content (F)"
      >
        Fit to content
      </button>

      <Tree
        data={data}
        orientation="vertical"
        collapsible
        dimensions={{
          width: size.width || (typeof window !== 'undefined' ? window.innerWidth : 1200),
          height: size.height || (typeof window !== 'undefined' ? window.innerHeight : 800),
        }}
        translate={translate}
        zoom={zoom}
        renderCustomNodeElement={renderCustomNode}
        separation={{ siblings: 1.2, nonSiblings: 1.5 }}
        pathFunc="curveStep"
      />
    </div>
  );
}
