'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, Node as GraphNode, Link } from '../../playground/types';

interface SimulationLink extends d3.SimulationLinkDatum<GraphNode> {
  source: GraphNode;
  target: GraphNode;
  label: string;
  visible: boolean;
}

interface SimulationNode extends d3.SimulationNodeDatum, GraphNode {}

interface GraphVisualizationProps {
  data: GraphData;
  onNodeClick: (nodeId: string) => void;
}

export default function GraphVisualization({ data, onNodeClick }: GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<SimulationNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<SimulationLink | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length || !containerRef.current) return;

    // Calculate graph statistics
    const totalNodes = data.nodes.length;
    const subjectNodes = data.nodes.filter(n => n.type === 'subject').length;
    const objectNodes = data.nodes.filter(n => n.type === 'object').length;
    const totalEdges = data.links.length;
    const uniqueRelationships = new Set(data.links.map(l => l.label)).size;
    const relationshipCounts = data.links.reduce((acc, link) => {
      acc[link.label] = (acc[link.label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    // Get container dimensions
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height].join(' '))
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("style", "background-color: white;");

    // Create zoom behavior
    zoomRef.current = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoomRef.current);

    // Create main group for zoom
    const g = svg.append("g")
      .attr("class", "zoom-group");

    // Convert string IDs to node references
    const links = data.links.map(link => {
      const source = typeof link.source === 'string'
        ? data.nodes.find(n => n.id === link.source)!
        : link.source;
      const target = typeof link.target === 'string'
        ? data.nodes.find(n => n.id === link.target)!
        : link.target;
      return { ...link, source, target };
    }) as SimulationLink[];

    // Calculate node sizes based on degree (number of connections)
    const nodeDegrees = new Map<string, number>();
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      nodeDegrees.set(sourceId, (nodeDegrees.get(sourceId) || 0) + 1);
      nodeDegrees.set(targetId, (nodeDegrees.get(targetId) || 0) + 1);
    });

    // Create force simulation with optimized forces for better readability
    const simulation = d3.forceSimulation<SimulationNode>(data.nodes)
      .force("link", d3.forceLink<SimulationNode, SimulationLink>(links)
        .id(d => d.id)
        .distance((d) => {
          // Increase distance for nodes with more connections
          const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
          const targetId = typeof d.target === 'string' ? d.target : d.target.id;
          const sourceDegree = nodeDegrees.get(sourceId) || 1;
          const targetDegree = nodeDegrees.get(targetId) || 1;
          return 150 + Math.min(sourceDegree + targetDegree, 10) * 10;
        }))
      .force("charge", d3.forceManyBody<SimulationNode>()
        .strength((d) => {
          // Stronger repulsion for highly connected nodes
          const degree = nodeDegrees.get(d.id) || 1;
          return -600 - (degree * 20);
        })
        .distanceMax(width * 0.4)
        .theta(0.9))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<SimulationNode>()
        .radius((d) => {
          // Larger nodes for highly connected nodes
          const degree = nodeDegrees.get(d.id) || 1;
          return 40 + Math.min(degree, 5) * 5;
        })
        .strength(0.9))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .alphaDecay(0.05)
      .alphaMin(0.01)
      .velocityDecay(0.6);

    // Stop the simulation after 3 seconds to prevent continuous movement
    setTimeout(() => {
      simulation.stop();
      console.log("Force simulation stopped after timeout");
    }, 3000);

    simulationRef.current = simulation;

    // Create arrow marker for links
    g.append("defs").selectAll("marker")
      .data(["arrow"])
      .join("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 35)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#999")
      .attr("d", "M0,-5L10,0L0,5");

    // Create links group
    const linkGroup = g.append("g")
      .attr("class", "links");

    // Create nodes group
    const nodeGroup = g.append("g")
      .attr("class", "nodes");

    // Store references for hover effects
    let allNodes: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>;
    let allLinks: d3.Selection<SVGGElement, SimulationLink, SVGGElement, unknown>;

    // Create links with transitions
    const link = linkGroup
      .selectAll<SVGGElement, SimulationLink>("g")
      .data(links)
      .join(
        enter => {
          const linkGroup = enter.append("g")
            .style("opacity", 1)
            .style("pointer-events", "all");

          const line = linkGroup.append("line")
            .attr("stroke", "#64748b")
            .attr("stroke-width", 2)
            .attr("opacity", 0.4)
            .attr("marker-end", "url(#arrow)")
            .style("cursor", "pointer")
            .on("mouseenter", function(event, d) {
              setHoveredLink(d);
              d3.select(this)
                .attr("stroke-width", 4)
                .attr("opacity", 0.8)
                .attr("stroke", "#0ea5e9");
            })
            .on("mouseleave", function(event, d) {
              setHoveredLink(null);
              d3.select(this)
                .attr("stroke-width", 2)
                .attr("opacity", 0.4)
                .attr("stroke", "#64748b");
            })
            .on("mousemove", function(event) {
              setMousePos({ x: event.clientX, y: event.clientY });
            });

          const label = linkGroup.append("g")
            .attr("class", "link-label");

          const text = label.append("text")
            .attr("dy", -5)
            .attr("text-anchor", "middle")
            .attr("fill", "#475569")
            .attr("font-size", "11px")
            .attr("font-weight", "500")
            .text(d => {
              // Clean and extract meaningful label text for edges
              let label = d.label;
              
              // Remove RDF typed literal syntax: "value"^^<http://...
              const typedLiteralMatch = label.match(/^"([^"]+)"\^\^<[^>]*/);
              if (typedLiteralMatch) {
                label = typedLiteralMatch[1]; // Extract just the value inside quotes
              }
              
              // Remove surrounding quotes if still present
              label = label.replace(/^["']|["']$/g, '');
              
              // If it's a URL, extract meaningful part
              if (label.startsWith('http://') || label.startsWith('https://')) {
                const parts = label.split('/');
                const lastPart = parts[parts.length - 1];
                if (lastPart && lastPart.length > 0 && lastPart.length < 40) {
                  return lastPart;
                }
                // Try to get namespace prefix (after #)
                const hashIndex = label.indexOf('#');
                if (hashIndex > 0) {
                  const afterHash = label.substring(hashIndex + 1);
                  if (afterHash.length < 40) return afterHash;
                }
                // Fallback to domain + last part
                const domain = parts[2]?.split('.')[0] || '';
                const meaningful = lastPart || parts[parts.length - 2] || '';
                const combined = domain ? `${domain}/${meaningful}` : meaningful;
                return combined.length > 25 ? combined.substring(0, 22) + '...' : combined;
              }
              
              // Truncate if too long
              if (label.length > 25) {
                return label.substring(0, 22) + '...';
              }
              return label;
            });

          text.each(function() {
            const bbox = (this as SVGTextElement).getBBox();
            d3.select(this.parentNode as SVGGElement)
              .insert("rect", "text")
              .attr("fill", "white")
              .attr("fill-opacity", 0.95)
              .attr("rx", 4)
              .attr("ry", 4)
              .attr("x", bbox.x - 6)
              .attr("y", bbox.y - 3)
              .attr("width", bbox.width + 12)
              .attr("height", bbox.height + 6)
              .attr("stroke", "#d1d5db")
              .attr("stroke-width", 1);
          });

          return linkGroup;
        }
      );
    
    allLinks = link;

    // Create nodes with transitions
    const node = nodeGroup
      .selectAll<SVGGElement, SimulationNode>("g")
      .data(data.nodes)
      .join(
        enter => {
          const nodeGroup = enter.append("g")
            .attr("cursor", "pointer")
            .style("opacity", 1)
            .style("pointer-events", "all")
            .on("click", (event, d) => {
              event.stopPropagation();
              onNodeClick(d.id);
            })
            .on("mouseenter", function(event, d) {
              setHoveredNode(d);
              const nodeId = d.id;
              
              // Find all connected node IDs
              const connectedNodeIds = new Set<string>();
              connectedNodeIds.add(nodeId);
              
              links.forEach((l: SimulationLink) => {
                const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
                const targetId = typeof l.target === 'string' ? l.target : l.target.id;
                if (sourceId === nodeId) {
                  connectedNodeIds.add(targetId);
                } else if (targetId === nodeId) {
                  connectedNodeIds.add(sourceId);
                }
              });
              
              // Dim unconnected nodes significantly, highlight connected ones
              allNodes.style("opacity", function(n: any) {
                if (n.id === nodeId) return 1; // Hovered node fully visible
                return connectedNodeIds.has(n.id) ? 1 : 0.15; // Connected nodes visible, others very dim
              });
              
              // Highlight connected links and their labels, dim others
              allLinks.each(function(l: SimulationLink) {
                const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
                const targetId = typeof l.target === 'string' ? l.target : l.target.id;
                const isConnected = sourceId === nodeId || targetId === nodeId;
                
                const linkGroup = d3.select(this);
                
                // Update line opacity
                linkGroup.selectAll<SVGLineElement, SimulationLink>("line")
                  .style("opacity", isConnected ? 1 : 0.05)
                  .style("stroke-width", isConnected ? 3 : 1.5);
                
                // Update link label visibility
                linkGroup.selectAll<SVGGElement, SimulationLink>(".link-label")
                  .style("opacity", isConnected ? 1 : 0.1)
                  .style("display", isConnected ? "block" : "none");
              });
              
              // Highlight the hovered node with orange border
              d3.select(this).select("circle")
                .attr("stroke-width", 6)
                .attr("stroke", "#fbbf24");
              
              // Slightly enlarge connected nodes
              allNodes.each(function(n: any) {
                if (n.id !== nodeId && connectedNodeIds.has(n.id)) {
                  d3.select(this).select("circle")
                    .attr("stroke-width", 4)
                    .attr("stroke", "#60a5fa");
                }
              });
            })
            .on("mouseleave", function(event, d) {
              setHoveredNode(null);
              // Reset all nodes and links to normal state
              allNodes.style("opacity", 1);
              allNodes.selectAll("circle")
                .attr("stroke-width", 3)
                .attr("stroke", "#fff");
              
              allLinks.each(function() {
                const linkGroup = d3.select(this);
                linkGroup.selectAll<SVGLineElement, SimulationLink>("line")
                  .style("opacity", 0.4)
                  .style("stroke-width", 2);
                linkGroup.selectAll<SVGGElement, SimulationLink>(".link-label")
                  .style("opacity", 1)
                  .style("display", "block");
              });
              
              d3.select(this).select("circle")
                .attr("stroke-width", 3)
                .attr("stroke", "#fff");
            })
            .on("mousemove", function(event) {
              setMousePos({ x: event.clientX, y: event.clientY });
            });

          const circle = nodeGroup.append("circle")
            .attr("r", (d) => {
              // Dynamic node size based on connections
              const degree = nodeDegrees.get(d.id) || 1;
              return 30 + Math.min(degree, 5) * 3;
            })
            .attr("fill", d => d.type === 'subject' ? '#0ea5e9' : '#10b981')
            .attr("stroke", "#fff")
            .attr("stroke-width", 3);

          const labelGroup = nodeGroup.append("g")
            .attr("class", "label-group");

          const text = labelGroup.append("text")
            .attr("dy", (d) => {
              const degree = nodeDegrees.get(d.id) || 1;
              return 45 + Math.min(degree, 5) * 3;
            })
            .attr("text-anchor", "middle")
            .attr("fill", "#1f2937")
            .attr("font-size", "12px")
            .attr("font-weight", "600")
            .text(d => {
              // Clean and extract meaningful label text
              let label = d.label;
              
              // Remove RDF typed literal syntax: "value"^^<http://...
              // Matches patterns like: "BC-QXSSQN569230"^^<http://www...
              const typedLiteralMatch = label.match(/^"([^"]+)"\^\^<[^>]*/);
              if (typedLiteralMatch) {
                label = typedLiteralMatch[1]; // Extract just the value inside quotes
              }
              
              // Remove surrounding quotes if still present
              label = label.replace(/^["']|["']$/g, '');
              
              // If it's a URL, try to extract the meaningful part
              if (label.startsWith('http://') || label.startsWith('https://')) {
                // Extract last meaningful segment
                const parts = label.split('/');
                const lastPart = parts[parts.length - 1];
                if (lastPart && lastPart.length > 0 && lastPart.length < 50) {
                  return lastPart;
                }
                // Try to get namespace prefix (after #)
                const hashIndex = label.indexOf('#');
                if (hashIndex > 0) {
                  const afterHash = label.substring(hashIndex + 1);
                  if (afterHash.length < 50) return afterHash;
                }
                // Or extract domain + last part
                const domain = parts[2]?.split('.')[0] || '';
                const meaningful = lastPart || parts[parts.length - 2] || '';
                const combined = domain ? `${domain}/${meaningful}` : meaningful;
                return combined.length > 35 ? combined.substring(0, 32) + '...' : combined;
              }
              
              // Truncate if too long
              if (label.length > 35) {
                return label.substring(0, 32) + '...';
              }
              return label;
            });

          text.each(function() {
            const bbox = (this as SVGTextElement).getBBox();
            d3.select(this.parentNode as SVGGElement)
              .insert("rect", "text")
              .attr("fill", "white")
              .attr("fill-opacity", 0.95)
              .attr("rx", 4)
              .attr("ry", 4)
              .attr("x", bbox.x - 6)
              .attr("y", bbox.y - 3)
              .attr("width", bbox.width + 12)
              .attr("height", bbox.height + 6)
              .attr("stroke", "#d1d5db")
              .attr("stroke-width", 1);
          });

          return nodeGroup;
        }
      );
    
    allNodes = node;

    // Add drag behavior
    const drag = d3.drag<SVGGElement, SimulationNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    allNodes.call(drag);

    // Throttle updates for better performance
    let tickCount = 0;
    const tickThreshold = 3; // Only update DOM every N ticks

    // Filter visible nodes and links for better performance
    const visibleNodes = data.nodes.filter(n => n.visible);
    const visibleLinks = links.filter(l => l.visible);

    // Use requestAnimationFrame for smoother rendering
    let animationFrameId: number | null = null;
    let needsUpdate = false;

    const updatePositions = () => {
      // Only update visible elements
      // Links already have source and target as node objects (converted earlier)
      allLinks.filter((d: SimulationLink) => d.visible)
        .selectAll<SVGLineElement, SimulationLink>("line")
        .attr("x1", (d: SimulationLink) => {
          const source = d.source as SimulationNode;
          return source?.x ?? 0;
        })
        .attr("y1", (d: SimulationLink) => {
          const source = d.source as SimulationNode;
          return source?.y ?? 0;
        })
        .attr("x2", (d: SimulationLink) => {
          const target = d.target as SimulationNode;
          return target?.x ?? 0;
        })
        .attr("y2", (d: SimulationLink) => {
          const target = d.target as SimulationNode;
          return target?.y ?? 0;
        });

      allLinks.filter((d: SimulationLink) => d.visible)
        .selectAll<SVGGElement, SimulationLink>(".link-label")
        .attr("transform", (d: SimulationLink) => {
          const source = d.source as SimulationNode;
          const target = d.target as SimulationNode;
          const x = ((source?.x ?? 0) + (target?.x ?? 0)) / 2;
          const y = ((source?.y ?? 0) + (target?.y ?? 0)) / 2;
          return `translate(${x},${y})`;
        });

      allNodes.filter((d: SimulationNode) => d.visible)
        .attr("transform", (d: SimulationNode) => `translate(${d.x ?? 0},${d.y ?? 0})`);

      needsUpdate = false;
    };

    const scheduleUpdate = () => {
      if (!needsUpdate) {
        needsUpdate = true;
        animationFrameId = requestAnimationFrame(() => {
          updatePositions();
          animationFrameId = null;
        });
      }
    };

    // Update positions on simulation tick with throttling
    simulation.on("tick", () => {
      tickCount++;
      if (tickCount >= tickThreshold) {
        tickCount = 0;
        scheduleUpdate();
      }
    });

    // Cleanup function to properly cancel all animations and simulations
    return () => {
      // Stop the simulation
      simulation.stop();

      // Cancel any pending animation frame
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      // Remove event listeners to prevent memory leaks
      allNodes.on('click', null);
      allNodes.on('mouseenter', null);
      allNodes.on('mouseleave', null);
      allNodes.on('mousemove', null);
      allLinks.selectAll('line').on('mouseenter', null);
      allLinks.selectAll('line').on('mouseleave', null);
      allLinks.selectAll('line').on('mousemove', null);

      // Clear hover state
      setHoveredNode(null);
      setHoveredLink(null);

      // Clear references
      needsUpdate = false;
    };
  }, [data, onNodeClick]);

  return (
    <div className="relative w-full">
      {/* Controls Bar */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Controls:</span>
          <button
            className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 transition-colors"
            onClick={() => {
              if (!svgRef.current || !zoomRef.current) return;
              const svg = d3.select(svgRef.current);
              svg.transition()
                .duration(300)
                .call(zoomRef.current.scaleBy, 1.5);
            }}
          >
            Zoom In
          </button>
          <button
            className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 transition-colors"
            onClick={() => {
              if (!svgRef.current || !zoomRef.current) return;
              const svg = d3.select(svgRef.current);
              svg.transition()
                .duration(300)
                .call(zoomRef.current.scaleBy, 0.67);
            }}
          >
            Zoom Out
          </button>
          <button
            className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 transition-colors"
            onClick={() => {
              if (!svgRef.current || !zoomRef.current) return;
              const svg = d3.select(svgRef.current);
              svg.transition()
                .duration(750)
                .call(zoomRef.current.transform, d3.zoomIdentity);
            }}
          >
            Reset View
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Export:</span>
          <button
            className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
            onClick={() => {
              const svgData = svgRef.current;
              if (!svgData) return;
              const clone = svgData.cloneNode(true) as SVGSVGElement;
              const serializer = new XMLSerializer();
              const svgString = serializer.serializeToString(clone);
              const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
              const url = URL.createObjectURL(svgBlob);
              const link = document.createElement('a');
              link.download = 'knowledge-graph.svg';
              link.href = url;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export SVG
          </button>
          <button
            className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
            onClick={() => {
              const svgData = svgRef.current;
              if (!svgData) return;
              const clone = svgData.cloneNode(true) as SVGSVGElement;
              const serializer = new XMLSerializer();
              const svgString = serializer.serializeToString(clone);
              const canvas = document.createElement("canvas");
              const box = svgData.getBoundingClientRect();
              const scale = window.devicePixelRatio || 1;
              canvas.width = box.width * scale;
              canvas.height = box.height * scale;
              const context = canvas.getContext("2d");
              if (!context) return;
              context.scale(scale, scale);
              const image = new Image();
              const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              image.onload = () => {
                context.fillStyle = "white";
                context.fillRect(0, 0, box.width, box.height);
                context.drawImage(image, 0, 0, box.width, box.height);
                try {
                  const png = canvas.toDataURL("image/png");
                  const link = document.createElement('a');
                  link.download = 'knowledge-graph.png';
                  link.href = png;
                  link.click();
                } catch (error) {
                  console.error('Error exporting PNG:', error);
                } finally {
                  URL.revokeObjectURL(url);
                }
              };
              image.onerror = () => {
                console.error('Error loading SVG image');
                URL.revokeObjectURL(url);
              };
              image.src = url;
            }}
          >
            Export PNG
          </button>
        </div>
      </div>

      {/* Graph Container */}
      <div ref={containerRef} className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-white shadow-inner" style={{ minHeight: '600px', height: '70vh' }}>
        <svg ref={svgRef} className="w-full h-full" style={{ minWidth: '2000px', minHeight: '2000px' }} />
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-sky-500 border-2 border-white"></div>
          <span className="text-sm text-gray-700 font-medium">Subject Nodes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></div>
          <span className="text-sm text-gray-700 font-medium">Object Nodes</span>
        </div>
        <div className="text-xs text-gray-500">
          Hover to highlight connections • Click to expand/collapse • Drag to reposition
        </div>
      </div>

      {/* Tooltip - positioned at bottom to avoid covering active connections */}
      {(hoveredNode || hoveredLink) && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-gray-900 text-white rounded-lg shadow-xl p-3 max-w-md pointer-events-none border border-gray-700"
          style={{
            // Position at bottom center to avoid covering graph connections
            left: '50%',
            bottom: '20px',
            transform: 'translateX(-50%)',
            maxHeight: '200px',
            overflowY: 'auto',
            maxWidth: '90%'
          }}
        >
          {hoveredNode && (
            <div>
              <div className="font-semibold text-sm mb-1 text-sky-300">
                {hoveredNode.type === 'subject' ? 'Subject Node' : 'Object Node'}
              </div>
              <div className="text-xs text-gray-200 break-all">
                {hoveredNode.label}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                ID: {hoveredNode.id}
              </div>
            </div>
          )}
          {hoveredLink && (
            <div>
              <div className="font-semibold text-sm mb-1 text-sky-300">Relationship</div>
              <div className="text-xs text-gray-200 break-all mb-2">
                {hoveredLink.label}
              </div>
              <div className="text-xs text-gray-400">
                <div>From: {typeof hoveredLink.source === 'string' ? hoveredLink.source : hoveredLink.source.label}</div>
                <div>To: {typeof hoveredLink.target === 'string' ? hoveredLink.target : hoveredLink.target.label}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
