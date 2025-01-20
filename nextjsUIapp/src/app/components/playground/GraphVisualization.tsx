'use client';

import { useEffect, useRef } from 'react';
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

    // Create force simulation with improved forces
    const simulation = d3.forceSimulation<SimulationNode>(data.nodes)
      .force("link", d3.forceLink<SimulationNode, SimulationLink>(links)
        .id(d => d.id)
        .distance(250))
      .force("charge", d3.forceManyBody<SimulationNode>()
        .strength(-1000)
        .distanceMax(width * 0.5))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<SimulationNode>()
        .radius(100)
        .strength(1))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .alphaDecay(0.01)
      .alphaMin(0.001);

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

    // Create links with transitions
    const link = linkGroup
      .selectAll<SVGGElement, SimulationLink>("g")
      .data(links)
      .join(
        enter => {
          const linkGroup = enter.append("g")
            .style("opacity", 1)
            .style("pointer-events", "all");

          linkGroup.append("line")
            .attr("stroke", "#999")
            .attr("stroke-width", 2)
            .attr("marker-end", "url(#arrow)");

          const label = linkGroup.append("g")
            .attr("class", "link-label");

          const text = label.append("text")
            .attr("dy", -5)
            .attr("text-anchor", "middle")
            .attr("fill", "#666")
            .attr("font-size", "12px")
            .text(d => d.label);

          text.each(function() {
            const bbox = (this as SVGTextElement).getBBox();
            d3.select(this.parentNode as SVGGElement)
              .insert("rect", "text")
              .attr("fill", "white")
              .attr("rx", 4)
              .attr("ry", 4)
              .attr("x", bbox.x - 4)
              .attr("y", bbox.y - 2)
              .attr("width", bbox.width + 8)
              .attr("height", bbox.height + 4);
          });

          return linkGroup;
        }
      );

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
            });

          nodeGroup.append("circle")
            .attr("r", 30)
            .attr("fill", d => d.type === 'subject' ? '#4299e1' : '#48bb78')
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

          const labelGroup = nodeGroup.append("g")
            .attr("class", "label-group");

          const text = labelGroup.append("text")
            .attr("dy", 45)
            .attr("text-anchor", "middle")
            .attr("fill", "#4a5568")
            .attr("font-size", "12px")
            .attr("font-weight", "500")
            .text(d => d.label);

          text.each(function() {
            const bbox = (this as SVGTextElement).getBBox();
            d3.select(this.parentNode as SVGGElement)
              .insert("rect", "text")
              .attr("fill", "white")
              .attr("rx", 4)
              .attr("ry", 4)
              .attr("x", bbox.x - 4)
              .attr("y", bbox.y - 2)
              .attr("width", bbox.width + 8)
              .attr("height", bbox.height + 4);
          });

          return nodeGroup;
        }
      );

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

    node.call(drag);

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link.selectAll<SVGLineElement, SimulationLink>("line")
        .attr("x1", d => d.source.x ?? 0)
        .attr("y1", d => d.source.y ?? 0)
        .attr("x2", d => d.target.x ?? 0)
        .attr("y2", d => d.target.y ?? 0);

      link.selectAll<SVGGElement, SimulationLink>(".link-label")
        .attr("transform", d => {
          const x = ((d.source.x ?? 0) + (d.target.x ?? 0)) / 2;
          const y = ((d.source.y ?? 0) + (d.target.y ?? 0)) / 2;
          return `translate(${x},${y})`;
        });

      node.attr("transform", d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [data, onNodeClick]);

  return (
    <div className="relative flex gap-4">
      <div ref={containerRef} className="flex-1 border rounded-lg overflow-hidden bg-white" style={{ minHeight: '80vh' }}>
        <svg ref={svgRef} className="w-full h-full" />
      </div>
      <div className="w-64 flex flex-col bg-white rounded-lg shadow-lg sticky top-4 h-[calc(100vh-2rem)] overflow-hidden">
        <div className="p-3 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-3">Zoom Controls</div>
          <div className="flex space-x-2 items-center mb-3">
          <button
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
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
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
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
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            onClick={() => {
              if (!svgRef.current || !zoomRef.current) return;
              const svg = d3.select(svgRef.current);
              svg.transition()
                .duration(750)
                .call(zoomRef.current.transform, d3.zoomIdentity);
            }}
          >
            Reset
          </button>
        </div>
          <div className="text-sm font-medium text-gray-700 mb-3">Export Options</div>
          <div className="flex space-x-2 items-center">
          <button
            className="px-3 py-1 bg-green-100 hover:bg-green-200 rounded text-sm"
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
            className="px-3 py-1 bg-green-100 hover:bg-green-200 rounded text-sm"
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
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-sm font-medium text-gray-700 mb-3">Graph Statistics</div>
          <div className="text-xs text-gray-600 space-y-2">
            <div>Total Nodes: {data.nodes.length}</div>
            <div>• Subject Nodes: {data.nodes.filter(n => n.type === 'subject').length}</div>
            <div>• Object Nodes: {data.nodes.filter(n => n.type === 'object').length}</div>
            <div>Total Relationships: {data.links.length}</div>
            <div>Unique Relationship Types: {new Set(data.links.map(l => l.label)).size}</div>
          </div>
          <div className="text-xs text-gray-600 mt-4">
            <div className="font-medium mb-2">Relationship Distribution:</div>
            <div className="space-y-1.5">
              {Object.entries(data.links.reduce((acc, link) => {
                acc[link.label] = (acc[link.label] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)).map(([label, count]) => (
                <div key={label} className="pl-2">• {label}: {count}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
