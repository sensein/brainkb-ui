'use client';

import { useState, useCallback, useEffect } from 'react';
import FileUpload from '../components/playground/FileUpload';
import GraphVisualization from '../components/playground/GraphVisualization';
import { parseTriplesFile, triplesToGraphData, getSampleTriples, extractTriplesFromPDF } from './utils/pdfProcessor';
import { Triple, GraphData, Node as GraphNode } from './types/index';
import {color} from "d3";

export default function PlaygroundPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const sampleTriples = await getSampleTriples();
        const nodesMap = new Map<string, GraphNode>();
        const rootNode = sampleTriples[0].subject;

        sampleTriples.forEach(triple => {
          if (!nodesMap.has(triple.subject)) {
            nodesMap.set(triple.subject, {
              id: triple.subject,
              label: triple.subject,
              type: 'subject',
              expanded: triple.subject === rootNode,
              visible: triple.subject === rootNode
            });
          }
          if (!nodesMap.has(triple.object)) {
            nodesMap.set(triple.object, {
              id: triple.object,
              label: triple.object,
              type: 'object',
              expanded: false,
              visible: false
            });
          }
        });

        sampleTriples.forEach(triple => {
          if (triple.subject === rootNode) {
            const node = nodesMap.get(triple.object);
            if (node) {
              node.visible = true;
            }
          }
        });

        const links = sampleTriples.map(triple => ({
          source: triple.subject,
          target: triple.object,
          label: triple.predicate,
          visible: triple.subject === rootNode
        }));

        const uniqueNodes = Array.from(nodesMap.values());

        setGraphData({
          nodes: uniqueNodes,
          links,
          metadata: {
            totalNodes: uniqueNodes.length,
            totalLinks: links.length,
            visibleNodes: uniqueNodes.length,
            maxVisibleNodes: 50,
            hasMore: false,
            processedTriples: sampleTriples.length
          }
        });
      } catch (error) {
        console.error('Error loading sample data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleFileUpload = useCallback(async (files: File[]) => {
    try {
      const file = files[0];
      if (!file) return;

      setIsLoading(true);
      const ext = file.name.toLowerCase().split('.').pop();

      if (ext === 'pdf') {
        try {
          const triples = await extractTriplesFromPDF(file);
          if (triples.length === 0) {
            throw new Error('No valid triples found in the PDF file');
          }
          const result = await triplesToGraphData(triples);
          setGraphData(result);
          return;
        } catch (error) {
          console.error('Error processing PDF:', error);
          throw error;
        }
      }

      const content = await file.text();
      const triples = await parseTriplesFile(content);
      if (triples.length === 0) {
        throw new Error('No valid triples found in the file');
      }

      const result = await triplesToGraphData(triples);
      setGraphData(result);
    } catch (error) {
      console.error('Error processing file:', error);
      alert(error instanceof Error ? error.message : 'Failed to process file. Please check the file format.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    setGraphData(prevData => {
       if (!prevData) return null;
      const node = prevData.nodes.find(n => n.id === nodeId);
      if (!node) return prevData;

      const updatedNodes = [...prevData.nodes];
      const updatedLinks = [...prevData.links];

      node.expanded = !node.expanded;

      const getNodeId = (sourceOrTarget: string | { id: string }) => 
        typeof sourceOrTarget === 'string' ? sourceOrTarget : sourceOrTarget.id;

      const getOutgoingConnections = (nodeId: string, visited = new Set<string>()): { nodes: Set<string>, links: Set<string> } => {
        const result = { nodes: new Set<string>(), links: new Set<string>() };
        if (visited.has(nodeId)) return result;
        visited.add(nodeId);

        prevData.links.forEach((link, index) => {
          const sourceId = getNodeId(link.source);
          const targetId = getNodeId(link.target);

          if (sourceId === nodeId) {
            result.nodes.add(targetId);
            result.links.add(index.toString());
          }
        });

        return result;
      };

      if (node.expanded) {
        const connections = getOutgoingConnections(nodeId);
        connections.nodes.forEach(id => {
          const node = updatedNodes.find(n => n.id === id);
          if (node) node.visible = true;
        });
        connections.links.forEach(index => {
          updatedLinks[parseInt(index)].visible = true;
        });
      } else {
        const collapsedConnections = new Set<string>();
        const expandedNodes = new Set(updatedNodes.filter(n => n.expanded && n.id !== nodeId).map(n => n.id));
        
        const visibleNodes = new Set<string>();
        expandedNodes.forEach(expandedId => {
          const connections = getOutgoingConnections(expandedId);
          connections.nodes.forEach(n => visibleNodes.add(n));
        });

        updatedNodes.forEach(n => {
          if (collapsedConnections.has(n.id) && !visibleNodes.has(n.id)) {
            n.visible = false;
            n.expanded = false;
          }
        });

        updatedLinks.forEach(link => {
          const sourceId = getNodeId(link.source);
          link.visible = expandedNodes.has(sourceId);
        });
      }

      return {
        nodes: updatedNodes,
        links: updatedLinks
      };
    });
  }, []);

  return (
    <div className="set-margin-hundred">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex justify-center">
          <h2 className="mb-4 text-3xl font-extrabold leading-none text-sky-900 animate-slide-up">
            Playground
          </h2>
        </div>

        <p className="mb-3 font-normal text-justify font-light text-sky-900 animate-slide-up">
          This is a Knowledge Graphs Playground. It allows you to visualize your knowledge graphs and provides
          insightful statistics, such as the number of nodes and relationships. While some features are still under
          development, future updates will enable you to upload PDFs, extract knowledge graphs, visualize them, and
          export the results seamlessly.
          <br/>
          <i>
            Note: Currently, we restrict the visualization to
            <span style={{color: "red"}}> 50,000</span> nodes.
          </i>
        </p>
        <div className="mx-auto">
          <div className="flex justify-center mb-8">
            <FileUpload
                title="Upload Knowledge Graph/PDF file to extract knowledge graphs"
                acceptedFileTypes={{
                  // 'application/pdf': ['.pdf'], to be enabled later.
                  'application/json': ['.jsonld'],
                  'application/rdf+xml': ['.rdf'],
                  'text/turtle': ['.ttl', '.n3'],
                  'text/csv': ['.csv']
                }}
                onFileUpload={handleFileUpload}
            />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 relative h-screen min-h-[600px] w-full">

            {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
                  <div className="flex flex-col items-center space-y-2">
                    <div
                        className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600">Processing...</p>
                  </div>
                </div>
            )}
           {graphData && (
              <GraphVisualization
                data={graphData}
                onNodeClick={handleNodeClick}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
