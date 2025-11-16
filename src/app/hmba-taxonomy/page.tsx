'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const Tree = dynamic(() => import('react-d3-tree').then(m => m.Tree), { ssr: false });

type NodeMeta = Record<string, string | number | boolean | null | undefined>;

export default function HMBATaxonomyPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  // Fullscreen container + size
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const textPanelRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [textPanelHeight, setTextPanelHeight] = useState<number>(0);

  // Camera
  const [translate, setTranslate] = useState<{ x: number; y: number }>({ x: 160, y: 300 });
  const [zoom, setZoom] = useState<number>(1);

  // Tooltip - HOVER STATE MANAGEMENT
  const [hoverNode, setHoverNode] = useState<any | null>(null);  // Stores which node is currently being hovered
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });  // Tracks mouse position for tooltip placement

  // Load data
  useEffect(() => {
    // Try to fetch from API route first (which handles server-side caching)
    // Fallback to static file if API is not available
    fetch('/api/hmba-taxonomy-data')
      .then(r => {
        if (!r.ok) {
          throw new Error(`Failed to fetch tree data: ${r.statusText}`);
        }
        return r.json();
      })
      .then(result => {
        if (result.success && result.data) {
          // Just set the data without modification - we'll use initialDepth instead
          console.log('Loaded data from API:', result.data); // Debug: see what the data looks like
          setData(result.data);
        } else {
          throw new Error(result.error || 'Failed to load tree data');
        }
      })
      .catch(e => {
        console.error('Error loading tree data from API:', e);
        // Fallback to static file if API fails
        fetch('/treeData.json')
          .then(r => {
            if (!r.ok) {
              throw new Error(`Failed to fetch tree data: ${r.statusText}`);
            }
            return r.json();
          })
          .then(data => {
            console.log('Loaded data from fallback:', data);
            setData(data);
          })
          .catch(fallbackError => console.error('Error loading tree data from fallback:', fallbackError));
      });
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

  // Measure text panel height
  useEffect(() => {
    const updateTextPanelHeight = () => {
      if (textPanelRef.current) {
        const height = textPanelRef.current.offsetHeight;
        setTextPanelHeight(height);
        console.log('Text panel height updated:', height);
      }
    };

    // Initial measurement
    updateTextPanelHeight();

    // Re-measure on resize
    window.addEventListener('resize', updateTextPanelHeight);

    // Use ResizeObserver for more accurate measurements
    const resizeObserver = new ResizeObserver(() => {
      updateTextPanelHeight();
    });

    if (textPanelRef.current) {
      resizeObserver.observe(textPanelRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateTextPanelHeight);
      resizeObserver.disconnect();
    };
  }, [data]);

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

  // Zoom controls - simple zoom in/out like double-click
   const handleZoomIn = useCallback(() => {
    setZoom(prevZoom => Math.min(prevZoom * 1.5, 3)); // Max zoom 3x
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prevZoom => Math.max(prevZoom / 1.5, 0.05)); // Min zoom 0.05x (allows zooming out more)
  }, []);


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


  if (!data) return (
    <div className="p-4">
      <div className="bg-blue-600 text-white px-5 py-5 text-xl font-semibold">
        LOADING - DATA NOT READY
      </div>
    </div>
  );

// Custom node renderer - HOVER INTERACTIONS
const renderCustomNode = ({ nodeDatum, toggleNode }: any) => {
  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the node toggle
    console.log('Name clicked:', nodeDatum.name);

    const identifier = nodeDatum.id;

    // Navigate to the detail page from the  knowledge-base section
    router.push(`/knowledge-base/celltaxon/${encodeURIComponent(identifier)}`);
  };

  return (
    <g
      onClick={toggleNode}
      // COMMENTED OUT: Hover on node itself
      // onMouseEnter={() => setHoverNode(nodeDatum)}  // HOVER: Show tooltip when mouse enters node
      // onMouseLeave={() => setHoverNode(null)}       // HOVER: Hide tooltip when mouse leaves node
      // onMouseMove={updateMouse}                     // HOVER: Track mouse position for tooltip placement
      cursor="pointer"
    >
    {/* Circle */}
    <circle
      r={90}
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

        // Don't show text for root node
        if (name === 'root') {
          return null;
        }

        if (name.length <= maxLength) {
          // Single line for short names
          // Position text below circle: circle radius (90) + spacing (20)
          // Using absolute y position - zoom transform scales everything proportionally
          const circleRadius = 90;
          const textSpacing = 20;
          return (
            <text
              x={0}
              y={circleRadius + textSpacing}
              textAnchor="middle"
              dominantBaseline="hanging"
              onClick={handleNameClick}
              onMouseEnter={() => setHoverNode(nodeDatum)}  // HOVER: Show tooltip when mouse enters text
              onMouseLeave={() => setHoverNode(null)}       // HOVER: Hide tooltip when mouse leaves text
              onMouseMove={updateMouse}                     // HOVER: Track mouse position for tooltip placement
              style={{
                fontSize: '60px',
                fill: 'black',
                paintOrder: 'stroke',
                stroke: 'white',
                strokeWidth: 3,
                cursor: 'pointer',
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

          // Position text below circle: circle radius (90) + spacing
          // Using absolute y positions - zoom transform scales everything proportionally
          const circleRadius = 90;
          const textSpacing = 20;
          const lineSpacing = 12;
          const fontSize = 60; // Approximate font size for line spacing
          return (
            <>
              <text
                x={0}
                y={circleRadius + textSpacing}
                textAnchor="middle"
                dominantBaseline="hanging"
                onClick={handleNameClick}
                onMouseEnter={() => setHoverNode(nodeDatum)}  // HOVER: Show tooltip when mouse enters text
                onMouseLeave={() => setHoverNode(null)}       // HOVER: Hide tooltip when mouse leaves text
                onMouseMove={updateMouse}                     // HOVER: Track mouse position for tooltip placement
                style={{
                  fontSize: '60px',
                  fill: 'black',
                  paintOrder: 'stroke',
                  stroke: 'white',
                  strokeWidth: 3,
                  cursor: 'pointer',
                }}
              >
                {line1}
              </text>
              <text
                x={0}
                y={circleRadius + textSpacing + fontSize + lineSpacing}
                textAnchor="middle"
                dominantBaseline="hanging"
                onClick={handleNameClick}
                onMouseEnter={() => setHoverNode(nodeDatum)}  // HOVER: Show tooltip when mouse enters text
                onMouseLeave={() => setHoverNode(null)}       // HOVER: Hide tooltip when mouse leaves text
                onMouseMove={updateMouse}                     // HOVER: Track mouse position for tooltip placement
                style={{
                  fontSize: '60px',
                  fill: 'black',
                  paintOrder: 'stroke',
                  stroke: 'white',
                  strokeWidth: 3,
                  cursor: 'pointer',
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
};

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

        {/* Display taxonomic level prominently if available */}
        {hoverNode.level && (
          <div className="mb-2 p-2 bg-blue-50 rounded border-l-2 border-blue-400">
            <div className="flex gap-2">
              <span className="opacity-70 text-xs font-medium uppercase tracking-wide">Taxonomic Level:</span>
              <span className="font-mono text-xs font-semibold text-blue-700">{hoverNode.level}</span>
            </div>
          </div>
        )}
        {hoverNode.cell_ontology_id && Array.isArray(hoverNode.cell_ontology_id) && hoverNode.cell_ontology_id.length > 0 && (
          <div className="mb-2 p-2 bg-orange-50 rounded border-l-2 border-orange-400">
            <div className="flex gap-2">
              <span className="opacity-70 text-xs font-medium uppercase tracking-wide">Cell Ontology ID:</span>
              <span className="text-xs font-semibold text-orange-700">
                {hoverNode.cell_ontology_id.join(', ')}
              </span>
            </div>
          </div>
        )}        
        {/* Display abbreviations if available */}
        {hoverNode.abbreviations && Array.isArray(hoverNode.abbreviations) && hoverNode.abbreviations.length > 0 && (
          <div className="mb-2 p-2 bg-green-50 rounded border-l-2 border-green-400">
            <div className="flex gap-2">
              <span className="opacity-70 text-xs font-medium uppercase tracking-wide">Abbreviations:</span>
              <span className="text-xs font-semibold text-green-700">
                {hoverNode.abbreviations.map((abbr: any) => abbr.term).join(', ')}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div 
        ref={textPanelRef} 
        className="fixed top-0 left-0 right-0 z-30 bg-white"
        style={{ paddingTop: '120px' }} // Move blue box lower
      >
        <div className="container mx-auto px-2 py-2">
          <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-blue-500 to-emerald-500 rounded-2xl shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-sky-600/20 to-transparent"></div>
            <div className="relative px-6 py-4">
              <p className="text-sky-100 text-sm leading-relaxed mb-2">
              The Human and Mammalian Brain Atlas (HMBA) aims to build a highly granular, cross-mammalian cell atlas that links brain structure, function, and cellular architecture across humans, macaques, and marmosets. A central component is the consensus basal ganglia taxonomy, generated through iterative clustering and cross-species integration of single-nucleus multiomic data. You can find more about the taxonomy{' '}
              <a 
                href="https://alleninstitute.github.io/HMBA_BasalGanglia_Consensus_Taxonomy/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-sky-50"
              >
                here
              </a>.
              </p>
              <p className="text-sky-100 text-xs italic">
              You can click on any node to expand the taxonomy and explore deeper hierarchical levels.
Hover over a node's name to view metadata associated with that specific cell-type node.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div 
        ref={containerRef} 
        className="fixed left-0 right-0 bottom-0 m-0 p-0 overflow-hidden border-2 border-gray-300 bg-white shadow-lg z-20"
        style={{ 
          top: textPanelHeight > 0 ? `${textPanelHeight + 5}px` : '200px', // Start 5px below text panel or fallback to 200px
          height: textPanelHeight > 0 
            ? `calc(100vh - ${textPanelHeight + 5}px)` 
            : 'calc(100vh - 200px)'
        }}
      >
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
            height: textPanelHeight > 0 
              ? (size.height || (typeof window !== 'undefined' ? window.innerHeight : 800)) - (textPanelHeight + 5)
              : size.height || (typeof window !== 'undefined' ? window.innerHeight : 800),
          }}
          translate={translate}
          zoom={zoom}
          renderCustomNodeElement={renderCustomNode}
          separation={{ siblings: 2.5, nonSiblings: 3.0 }}
          nodeSize={{ x: 220, y: 700 }}
          pathFunc={"curveStep" as any}
        />
        {/* Zoom Control Panel */}
        <div className="absolute top-4 right-4 z-50">
          <div className="flex flex-col gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-gray-300">
            <button
              onClick={handleZoomIn}
              className="w-7 h-7 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors font-bold text-lg"
              title="Zoom In"
              aria-label="Zoom In"
            >
              +
            </button>
            <button
              onClick={handleZoomOut}
              className="w-7 h-7 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors font-bold text-lg"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              −
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
