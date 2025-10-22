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

  // Tooltip - HOVER STATE MANAGEMENT
  const [hoverNode, setHoverNode] = useState<any | null>(null);  // Stores which node is currently being hovered
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });  // Tracks mouse position for tooltip placement

  // Load data
  useEffect(() => {
    fetch('/treeData.json')
      .then(r => r.json())
      .then(data => {
        // Just set the data without modification - we'll use initialDepth instead
        console.log('Loaded data:', data); // Debug: see what the data looks like
        setData(data);
      })
      .catch(e => console.error('Error loading tree data:', e));
  }, []);

  // Observe viewport size
  useEffect(() => {
    console.log('Setting up viewport size detection');

    // Function to update size
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      console.log('Viewport size updated:', { width, height });
      setSize({ width, height });
    };

    // Set initial size
    updateSize();

    // Listen for window resize
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Tooltip helpers - HOVER POSITIONING
  const getClampedPos = (rawX: number, rawY: number) => {  // Calculates tooltip position based on mouse coordinates
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

  const updateMouse = (evt: React.MouseEvent<SVGGElement, MouseEvent>) => {  // HOVER: Updates mouse position for tooltip tracking
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: evt.clientX - rect.left, y: evt.clientY - rect.top });  // Convert to relative coordinates
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
    const pad = 80;

    const scaleX = cw / (bbox.width + pad * 2);
    const scaleY = ch / (bbox.height + pad * 2);

    console.log('Fit debug:', {
      bbox: { width: bbox.width, height: bbox.height },
      container: { width: cw, height: ch },
      scales: { scaleX, scaleY },
      pad
    });

    // Use the actual calculated scale to fit the wide tree
    const scale = Math.min(1.0, Math.min(scaleX, scaleY));

    const contentW = bbox.width * scale;
    const contentH = bbox.height * scale;

    const left = (cw - contentW) / 2;
    const top = (ch - contentH) / 2;

    const tx = left - bbox.x * scale;
    const ty = top - bbox.y * scale;

    console.log('Final fit:', { scale, translate: { x: tx, y: ty } });

    setTranslate({ x: tx, y: ty });
    setZoom(scale);
  }, []);

  useEffect(() => {
    console.log('Auto-fit effect triggered:', {
      data: !!data,
      dataType: typeof data,
      size,
      width: size.width,
      height: size.height,
      containerRef: !!containerRef.current
    });
    if (!data || size.width === 0 || size.height === 0) {
      console.log('Auto-fit skipped - missing data or size', {
        hasData: !!data,
        width: size.width,
        height: size.height
      });
      return;
    }
    // Auto-fit when data loads and viewport is ready
    const timeoutId = setTimeout(() => {
      console.log('Auto-fit executing...');
      fitToContent();
    }, 500); // Increased delay to ensure tree is fully rendered
    return () => clearTimeout(timeoutId);
  }, [data, size.width, size.height, fitToContent]);

  // Fitting to content is disabled for now, not sure if we need it
  // But it's pretty annoying since the search doesn't work well with it
  // useEffect(() => {
  //   const onKey = (e: KeyboardEvent) => {
  //     if (e.key.toLowerCase() === 'f') {
  //       e.preventDefault();
  //       fitToContent();
  //     }
  //   };
  //   window.addEventListener('keydown', onKey);
  //   return () => window.removeEventListener('keydown', onKey);
  // }, [fitToContent]);

  if (!data) return (
    <div>
      <div style={{ backgroundColor: 'red', color: 'white', padding: '20px', fontSize: '20px' }}>
        LOADING - DATA NOT READY
      </div>
    </div>
  );

// Custom node renderer - HOVER INTERACTIONS
const renderCustomNode = ({ nodeDatum, toggleNode }: any) => (
  <g
    onClick={toggleNode}
    onMouseEnter={() => setHoverNode(nodeDatum)}  // HOVER: Show tooltip when mouse enters node
    onMouseLeave={() => setHoverNode(null)}       // HOVER: Hide tooltip when mouse leaves node
    onMouseMove={updateMouse}                     // HOVER: Track mouse position for tooltip placement
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

    {/* Non-scaling text with black fill - positioned below node */}
    <g>
      {(() => {
        const name = nodeDatum.name;
        const maxLength = 12; // Maximum characters per line

        if (name.length <= maxLength) {
          // Single line for short names
          return (
            <text
              x={0}
              dy={25 / zoom}
              textAnchor="middle"
              style={{
                pointerEvents: 'none',
                fontSize: '60px',
                fill: 'black',
                paintOrder: 'stroke',
                stroke: 'white',
                strokeWidth: 3,
              }}
            >
              {name}
            </text>
          );
        } else {
          // Two lines for long names
          const words = name.split(' ');
          let line1 = '';
          let line2 = '';

          // Try to split at word boundaries
          if (words.length > 1) {
            let currentLine = '';
            for (const word of words) {
              if ((currentLine + ' ' + word).trim().length <= maxLength) {
                currentLine = (currentLine + ' ' + word).trim();
              } else {
                if (line1 === '') {
                  line1 = currentLine;
                  currentLine = word;
                } else {
                  line2 = currentLine + ' ' + word;
                  break;
                }
              }
            }
            if (line2 === '') line2 = currentLine;
          } else {
            // Single word - split in the middle
            const mid = Math.ceil(name.length / 2);
            line1 = name.substring(0, mid);
            line2 = name.substring(mid);
          }

          return (
            <>
              <text
                x={0}
                dy={20 / zoom}
                textAnchor="middle"
                style={{
                  pointerEvents: 'none',
                  fontSize: '60px',
                  fill: 'black',
                  paintOrder: 'stroke',
                  stroke: 'white',
                  strokeWidth: 3,
                }}
              >
                {line1}
              </text>
              <text
                x={0}
                dy={32 / zoom}
                textAnchor="middle"
                style={{
                  pointerEvents: 'none',
                  fontSize: '60px',
                  fill: 'black',
                  paintOrder: 'stroke',
                  stroke: 'white',
                  strokeWidth: 3,
                }}
              >
                {line2}
              </text>
            </>
          );
        }
      })()}
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

  const Tooltip = () => {  // HOVER: Tooltip component that appears on hover
    if (!hoverNode) return null;  // HOVER: Only show if a node is being hovered
    const { left, top } = getClampedPos(mousePos.x, mousePos.y);  // HOVER: Position tooltip based on mouse position
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
        style={{ left, top }}  // HOVER: Apply calculated position to tooltip
      >
        <div className="mb-1 font-semibold">{hoverNode.name || '(root)'}</div>  {/* HOVER: Display hovered node's name */}
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
    <div>
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
            stroke-width: 4.25px;
          }
        `}</style>

        {/* Tooltip - HOVER: Renders the tooltip component */}
        <Tooltip />

        <Tree
          data={data}
          orientation="vertical"
          collapsible
          initialDepth={2}
          dimensions={{
            width: size.width || (typeof window !== 'undefined' ? window.innerWidth : 1200),
            height: size.height || (typeof window !== 'undefined' ? window.innerHeight : 800),
          }}
          translate={translate}
          zoom={zoom}
          renderCustomNodeElement={renderCustomNode}
          separation={{ siblings: 2.5, nonSiblings: 3.0 }}
          nodeSize={{ x: 200, y: 500 }}
          pathFunc={"curveStep" as any}
        />
      </div>

      {/* FIT BUTTON - SEPARATE OVERLAY LAYER */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 10000
      }}>
        <button
          onClick={() => {
            console.log('Fit button clicked!');
            fitToContent();
          }}
          style={{
            position: 'absolute',
            top: '120px',
            right: '20px',
            pointerEvents: 'auto',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '8px 16px',
            border: '1px solid #1e40af',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
          title="Fit to content"
        >
          Fit to Content
        </button>
      </div>
    </div>
  );
}
