'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Loader2, AlertCircle } from 'lucide-react';

const Tree = dynamic(() => import('react-d3-tree').then(m => m.Tree), { ssr: false });

type NodeMeta = Record<string, string | number | boolean | null | undefined>;

export default function HMBATaxonomyPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fullscreen container + size
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isTablet, setIsTablet] = useState<boolean>(false);

  // Camera with smooth transitions
  const [translate, setTranslate] = useState<{ x: number; y: number }>({ x: 160, y: 300 });
  const [zoom, setZoom] = useState<number>(1);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [hasAutoFitted, setHasAutoFitted] = useState<boolean>(false);

  // Tooltip - HOVER STATE MANAGEMENT
  const [hoverNode, setHoverNode] = useState<any | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Smooth transition helper
  const smoothTransition = useCallback((newTranslate: { x: number; y: number }, newZoom: number, duration: number = 500) => {
    setIsTransitioning(true);
    const startTranslate = { ...translate };
    const startZoom = zoom;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-in-out)
      const ease = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      setTranslate({
        x: startTranslate.x + (newTranslate.x - startTranslate.x) * ease,
        y: startTranslate.y + (newTranslate.y - startTranslate.y) * ease,
      });
      setZoom(startZoom + (newZoom - startZoom) * ease);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsTransitioning(false);
      }
    };

    requestAnimationFrame(animate);
  }, [translate, zoom]);

  // Load data
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/treeData.json')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load tree data');
        return r.json();
      })
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(e => {
        console.error('Error loading tree data:', e);
        setError(e.message || 'Failed to load taxonomy data');
        setLoading(false);
      });
  }, []);

  // Observe viewport size and detect mobile/tablet
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width < 640); // sm breakpoint
      setIsTablet(width >= 640 && width < 1024); // md breakpoint
      setSize({ width, height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Tooltip helpers - HOVER POSITIONING
  const getClampedPos = (rawX: number, rawY: number) => {
    const pad = 10;
    const offset = isMobile ? 8 : 12;
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
  const fitToContent = useCallback((useTransition: boolean = true) => {
    const cont = containerRef.current;
    if (!cont) return;
    const g = cont.querySelector<SVGGElement>('.rd3t-g');
    if (!g) return;

    const bbox = g.getBBox();
    if (!bbox || bbox.width === 0 || bbox.height === 0) return;

    const cw = cont.clientWidth;
    const ch = cont.clientHeight;
    // More padding on mobile to ensure readability and fit on screen
    const pad = isMobile ? 40 : isTablet ? 50 : 60;

    const scaleX = cw / (bbox.width + pad * 2);
    const scaleY = ch / (bbox.height + pad * 2);
    // Ensure minimum readable zoom level - allow smaller zoom to fit everything
    const minZoom = isMobile ? 0.2 : isTablet ? 0.25 : 0.2;
    const maxZoom = 1.0;
    const scale = Math.max(minZoom, Math.min(maxZoom, Math.min(scaleX, scaleY)));

    const contentW = bbox.width * scale;
    const contentH = bbox.height * scale;

    const left = (cw - contentW) / 2;
    const top = (ch - contentH) / 2;

    const tx = left - bbox.x * scale;
    const ty = top - bbox.y * scale;

    if (useTransition) {
      smoothTransition({ x: tx, y: ty }, scale);
    } else {
      // Instant set for initial load
      setTranslate({ x: tx, y: ty });
      setZoom(scale);
    }
  }, [isMobile, isTablet, smoothTransition]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom * 1.5, 3);
    smoothTransition(translate, newZoom, 300);
  }, [zoom, translate, smoothTransition]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom / 1.5, 0.1);
    smoothTransition(translate, newZoom, 300);
  }, [zoom, translate, smoothTransition]);

  const handleReset = useCallback(() => {
    fitToContent();
  }, [fitToContent]);

  // Auto-fit when data loads - only once, ensure it happens by default
  useEffect(() => {
    if (!data || size.width === 0 || size.height === 0 || hasAutoFitted) return;
    
    const attemptFit = () => {
      const cont = containerRef.current;
      if (!cont) return false;
      const g = cont.querySelector<SVGGElement>('.rd3t-g');
      if (!g) return false;
      const bbox = g.getBBox();
      return bbox.width > 0 && bbox.height > 0;
    };

    // Single attempt with a reasonable delay to ensure tree is rendered
    const timeoutId = setTimeout(() => {
      if (attemptFit() && !hasAutoFitted) {
        // Use instant fit (no transition) for initial load
        fitToContent(false);
        setHasAutoFitted(true);
      }
    }, 600);
    
    return () => clearTimeout(timeoutId);
  }, [data, size.width, size.height, hasAutoFitted, fitToContent]);

  // Reset auto-fit flag when data changes
  useEffect(() => {
    setHasAutoFitted(false);
  }, [data]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleZoomIn, handleZoomOut, handleReset]);

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">Loading taxonomy data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-900 mb-2">Error Loading Data</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Custom node renderer - Responsive and smooth
  const renderCustomNode = ({ nodeDatum, toggleNode }: any) => {
    const handleNameClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      const identifier = nodeDatum.id;
      router.push(`/knowledge-base/celltaxon/${encodeURIComponent(identifier)}`);
    };

    // Responsive sizing - text inside rectangle with larger fonts
    const name = nodeDatum.name || ''; 
    const baseFontSize = isMobile ? 28 : isTablet ? 30 : 45; // Much larger font sizes
    const basePadding = isMobile ? 16 : isTablet ? 20 : 24; // More padding
    const charWidth = baseFontSize * 0.55; // More accurate character width for larger fonts
    const lineHeight = baseFontSize * 1.3; // Tighter line height for larger fonts
    
    // No multiline - always single line, make boxes wider
    let rectWidth: number;
    let rectHeight: number;
    let fontSize: string;
    let strokeWidth: number;
    const textLines = [name]; // Always single line
    
    // Wider boxes - no need to accommodate text exactly
    const minWidth = isMobile ? 250 : isTablet ? 300 : 400;
    const minHeight = isMobile ? 70 : isTablet ? 85 : 100;
    
    rectWidth = Math.max(name.length * charWidth + basePadding * 2, minWidth);
    rectHeight = Math.max(lineHeight + basePadding * 2, minHeight);
    fontSize = `${baseFontSize}px`;
    
    // Thicker strokes for larger rectangles
    strokeWidth = isMobile ? 3 : isTablet ? 3.5 : 4;

    // Calculate text color based on background color for maximum readability
    const getTextColor = (bgColor: string): string => {
      if (!bgColor) return '#000000';
      
      // Normalize color string
      let normalizedColor = bgColor.toLowerCase().trim();
      normalizedColor = normalizedColor.replace(/\s+/g, '');
      
      // Convert hex to RGB helper
      const hexToRgb = (hex: string) => {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
          const r = parseInt(hex[0] + hex[0], 16);
          const g = parseInt(hex[1] + hex[1], 16);
          const b = parseInt(hex[2] + hex[2], 16);
          return { r, g, b };
        }
        if (hex.length === 6) {
          const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
        }
        return null;
      };

      // Check for specific color patterns first
      
      // 🟨 Yellow / Gold Boxes - Dark text
      const yellowColors = ['yellow', 'gold', '#ffd700', '#ffeb3b', '#fdd835', '#fbc02d', '#f9a825'];
      if (yellowColors.includes(normalizedColor) || normalizedColor.includes('yellow') || normalizedColor.includes('gold')) {
        return '#1A1A1A'; // Near-black
      }
      
      // 🩶 Gray Boxes - Black text
      const grayColors = ['gray', 'grey', '#808080', '#9e9e9e', '#757575', '#616161', '#424242', '#9e9e9e'];
      if (grayColors.includes(normalizedColor) || (normalizedColor.includes('gray') && !normalizedColor.includes('dark'))) {
        return '#000000'; // Black
      }
      
      // 🟩 Dark Background Boxes (dark green) - White text
      const darkGreenColors = ['darkgreen', 'dark green', '#006400', '#004d00', '#003d00'];
      if (darkGreenColors.includes(normalizedColor) || (normalizedColor.includes('green') && normalizedColor.includes('dark'))) {
        return '#FFFFFF'; // White
      }
      
      // 🟥 Red Boxes - White text
      const redColors = ['red', '#f44336', '#e53935', '#d32f2f', '#c62828', '#b71c1c', '#ff0000'];
      if (redColors.includes(normalizedColor) || normalizedColor.includes('red')) {
        return '#FFFFFF'; // White
      }
      
      // 🩸 Dark Red / Maroon Boxes - White text
      const darkRedColors = ['maroon', 'darkred', 'dark red', '#800000', '#8b0000', '#a52a2a'];
      if (darkRedColors.includes(normalizedColor) || normalizedColor.includes('maroon')) {
        return '#FFFFFF'; // White
      }
      
      // 🟦 Blue Boxes - White text
      const blueColors = ['blue', '#2196f3', '#1976d2', '#1565c0', '#0d47a1', '#0000ff'];
      if (blueColors.includes(normalizedColor) || normalizedColor.includes('blue')) {
        return '#FFFFFF'; // White
      }
      
      // 🟣 Purple Boxes - White text
      const purpleColors = ['purple', '#9c27b0', '#7b1fa2', '#6a1b9a', '#4a148c', '#800080'];
      if (purpleColors.includes(normalizedColor) || normalizedColor.includes('purple')) {
        return '#FFFFFF'; // White
      }
      
      // 🟫 Brown / Olive Boxes - Light beige-white
      const brownColors = ['brown', 'olive', '#795548', '#6d4c41', '#5d4037', '#4e342e', '#8b4513', '#a0522d'];
      if (brownColors.includes(normalizedColor) || normalizedColor.includes('brown') || normalizedColor.includes('olive')) {
        return '#F7F7F7'; // Light beige-white
      }
      
      // For hex colors, calculate luminance
      const rgb = hexToRgb(normalizedColor);
      if (rgb) {
        // Calculate relative luminance (WCAG formula)
        const getLuminance = (val: number) => {
          val = val / 255;
          return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        };
        const luminance = 0.2126 * getLuminance(rgb.r) + 
                          0.7152 * getLuminance(rgb.g) + 
                          0.0722 * getLuminance(rgb.b);
        
        // For very light colors (yellow, light gray), use dark text
        if (luminance > 0.7) {
          return '#1A1A1A'; // Near-black for very light backgrounds
        }
        // For medium-light colors, use dark text
        if (luminance > 0.5) {
          return '#222222'; // Dark gray for light backgrounds
        }
        // For dark colors, use white text
        return '#FFFFFF'; // White for dark backgrounds
      }

      // Default to white text for unknown colors (safer for dark backgrounds)
      return '#FFFFFF';
    };

    const textColor = getTextColor(nodeDatum.nodeColor || 'lightgray');

    return (
      <g
        onClick={toggleNode}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        className="transition-opacity duration-200 hover:opacity-90"
      >
        {/* Rectangle */}
        <rect
          x={-rectWidth / 2}
          y={-rectHeight / 2}
          width={rectWidth}
          height={rectHeight}
          fill={nodeDatum.nodeColor || 'lightgray'}
          stroke="#1f2937"
          strokeWidth={strokeWidth}
          rx={isMobile ? 8 : isTablet ? 10 : 12}
          ry={isMobile ? 8 : isTablet ? 10 : 12}
          vectorEffect="non-scaling-stroke"
          shapeRendering="geometricPrecision"
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
        />

        {/* Text - centered inside rectangle, single line */}
        <g>
          {(() => {
            if (name === 'root') return null;

            // Single line text - centered in rectangle
            return (
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="middle"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNameClick(e);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseEnter={() => setHoverNode(nodeDatum)}
                onMouseLeave={() => setHoverNode(null)}
                onMouseMove={updateMouse}
                onTouchStart={() => setHoverNode(nodeDatum)}
                onTouchEnd={() => setHoverNode(null)}
                style={{
                  fontSize,
                  fill: textColor,
                  stroke: 'none', // Explicitly remove any stroke
                  strokeWidth: 0, // Ensure no stroke width
                  paintOrder: 'fill', // Only paint the fill, no stroke
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: '700', // Bolder for better readability
                  userSelect: 'none',
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                }}
              >
                {name}
              </text>
            );
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

  // Tooltip component with smooth animations
  const Tooltip = () => {
    if (!hoverNode) return null;
    const { left, top } = getClampedPos(mousePos.x, mousePos.y);

    return (
      <div
        ref={tooltipRef}
        className={`
          absolute z-50 rounded-lg border border-gray-200 bg-white/98 backdrop-blur-md
          px-4 py-3 shadow-xl
          max-w-[90vw] sm:max-w-[420px]
          whitespace-pre-wrap break-words
          pointer-events-none
          transition-all duration-200 ease-out
          ${isMobile ? 'text-sm px-3 py-2' : isTablet ? 'text-sm' : 'text-sm'}
        `}
        style={{ 
          left, 
          top,
          transform: 'translateZ(0)',
        }}
      >
        <div className={`mb-2 font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>
          {hoverNode.name || '(root)'}
        </div>

        {hoverNode.level && (
          <div className="mb-2 p-2 bg-blue-50 rounded border-l-2 border-blue-400">
            <div className="flex flex-col sm:flex-row sm:gap-2">
              <span className="opacity-70 text-xs font-medium uppercase tracking-wide">Taxonomic Level:</span>
              <span className="font-mono text-xs font-semibold text-blue-700">{hoverNode.level}</span>
            </div>
          </div>
        )}
        
        {hoverNode.cell_ontology_id && Array.isArray(hoverNode.cell_ontology_id) && hoverNode.cell_ontology_id.length > 0 && (
          <div className="mb-2 p-2 bg-orange-50 rounded border-l-2 border-orange-400">
            <div className="flex flex-col sm:flex-row sm:gap-2">
              <span className="opacity-70 text-xs font-medium uppercase tracking-wide">Cell Ontology ID:</span>
              <span className="text-xs font-semibold text-orange-700 break-all">
                {hoverNode.cell_ontology_id.join(', ')}
              </span>
            </div>
          </div>
        )}
        
        {hoverNode.abbreviations && Array.isArray(hoverNode.abbreviations) && hoverNode.abbreviations.length > 0 && (
          <div className="mb-2 p-2 bg-green-50 rounded border-l-2 border-green-400">
            <div className="flex flex-col sm:flex-row sm:gap-2">
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

  // Control button component
  const ControlButton = ({ 
    onClick, 
    icon: Icon, 
    label, 
    disabled = false 
  }: { 
    onClick: () => void; 
    icon: React.ElementType; 
    label: string; 
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || isTransitioning}
      className={`
        flex items-center justify-center
        w-10 h-10 sm:w-12 sm:h-12
        bg-white/90 hover:bg-white
        border border-gray-300 rounded-lg
        shadow-md hover:shadow-lg
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95
        ${isMobile ? 'text-lg' : ''}
      `}
      title={label}
      aria-label={label}
    >
      <Icon className={`w-5 h-5 ${isMobile ? 'sm:w-6 sm:h-6' : 'w-6 h-6'} text-gray-700`} />
    </button>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      <div ref={containerRef} className="fixed inset-0 m-0 p-0 overflow-hidden pointer-events-auto">
        {/* Global SVG crispness tweaks */}
        <style jsx global>{`
          .rd3t-svg {
            shape-rendering: geometricPrecision;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            transition: transform 0.3s ease-out;
            pointer-events: auto;
          }
          .rd3t-link path {
            vector-effect: non-scaling-stroke;
            shape-rendering: auto;
            stroke-width: ${isMobile ? '10px' : isTablet ? '12px' : '15px'};
            stroke: #374151;
            fill: none;
            transition: stroke-width 0.2s ease;
            pointer-events: none;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
          .rd3t-node {
            pointer-events: auto;
          }
          .rd3t-node circle,
          .rd3t-node text {
            pointer-events: auto;
            cursor: pointer;
          }
        `}</style>

        {/* Tooltip */}
        <Tooltip />

        {/* Tree */}
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
          separation={{ 
            siblings: isMobile ? 1.2 : isTablet ? 1.4 : 1.6, 
            nonSiblings: isMobile ? 1.6 : isTablet ? 1.8 : 2.0 
          }}
          nodeSize={{ 
            x: isMobile ? 180 : isTablet ? 220 : 260, 
            y: isMobile ? 200 : isTablet ? 250 : 300 
          }}
          pathFunc={"curve" as any}
        />
      </div>

      {/* Control Panel - Responsive positioning */}
      <div 
        className="fixed z-50 pointer-events-none"
        style={{
          ...(isMobile 
            ? { bottom: '1rem', right: '1rem' }
            : { top: '7rem', right: '1rem' }
          )
        }}
      >
        <div className={`
          flex flex-col gap-2
          bg-white/80 backdrop-blur-sm
          rounded-xl p-2
          shadow-xl border border-gray-200
          pointer-events-auto
          ${isMobile ? 'p-1.5 gap-1.5' : 'p-2 gap-2'}
        `}>
          <ControlButton
            onClick={handleZoomIn}
            icon={ZoomIn}
            label="Zoom In (+)"
          />
          <ControlButton
            onClick={handleZoomOut}
            icon={ZoomOut}
            label="Zoom Out (-)"
          />
          <ControlButton
            onClick={handleReset}
            icon={isMobile ? Maximize2 : RotateCcw}
            label="Reset View (0)"
          />
          <ControlButton
            onClick={fitToContent}
            icon={Maximize2}
            label="Fit to Content"
          />
        </div>
      </div>

      {/* Help text for mobile */}
      {isMobile && (
        <div className="fixed bottom-4 left-4 right-24 z-40 pointer-events-none">
          <div className="bg-black/70 text-white text-sm px-4 py-3 rounded-lg backdrop-blur-sm shadow-lg">
            <p className="font-medium">Tap nodes to expand/collapse</p>
            <p className="text-xs mt-1 opacity-90">Tap labels to view details</p>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint for desktop/tablet */}
      {!isMobile && (
        <div className="fixed bottom-4 left-4 z-40 pointer-events-none">
          <div className="bg-black/70 text-white text-sm px-4 py-3 rounded-lg backdrop-blur-sm shadow-lg">
            <p className="font-medium">
              Keyboard: <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono">+</kbd> Zoom In • 
              <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono ml-1">-</kbd> Zoom Out • 
              <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono ml-1">0</kbd> Reset
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
