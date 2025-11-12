'use client';

import { useState, useCallback, useEffect } from 'react';
import FileUpload from '@/src/app/components/playground/FileUpload';
import GraphVisualization from '@/src/app/components/playground/GraphVisualization';
import { parseTriplesFile, triplesToGraphData, getSampleTriples, extractTriplesFromPDF } from './utils/pdfProcessor';
import { Triple, GraphData, Node as GraphNode } from './types/index';
import {color} from "d3";

// Helper function to attempt to fix missing subject errors in Turtle files
const attemptToFixMissingSubject = (content: string, problematicStatement: string): {
  fixedContent: string;
  addedSubject: string;
  usedPreviousSubject: boolean;
  fixDescription: string;
} => {
  // Split content into lines for processing
  const lines = content.split('\n');

  // Find the line with the problematic statement
  const lineIndex = lines.findIndex(line => line.includes(problematicStatement));
  if (lineIndex === -1) {
    // Can't find the problematic line, use default placeholder
    const placeholderSubject = '<http://example.org/Subject>';
    return {
      fixedContent: content,
      addedSubject: placeholderSubject,
      usedPreviousSubject: false,
      fixDescription: "Added a placeholder subject"
    };
  }

  // Check if this is a continuation of a previous statement (indented line without a subject)
  const problematicLine = lines[lineIndex];
  const isIndented = /^\s+/.test(problematicLine);

  // Special case 1: If the statement starts with a predicate that's being used as a subject
  // For example: "terms:creator a owl:AnnotationProperty"
  const predicateAsSubjectMatch = problematicLine.match(/^(\w+:\w+)\s+a\s+/);
  if (predicateAsSubjectMatch) {
    // The predicate is being defined as a resource itself
    const predicateAsSubject = predicateAsSubjectMatch[1];

    // This is a valid RDF pattern - the predicate is being defined as a resource
    // We don't need to modify the content, just return it as is
    return {
      fixedContent: content,
      addedSubject: predicateAsSubject,
      usedPreviousSubject: false,
      fixDescription: `Recognized "${predicateAsSubject}" as a valid subject (it's a predicate being defined as a resource)`
    };
  }

  // Special case 2: If the statement starts with a prefixed name followed by a predicate
  // Example: "NIMP:BC-WLMLEL862267 rdfs:label "P0023_4" ..."
  const prefixedNameMatch = problematicLine.match(/^(\w+:[^\s]+)\s+(\w+:[^\s]+)/);
  if (prefixedNameMatch) {
    // This is a valid statement with a prefixed name as subject
    // We don't need to modify the content, just return it as is
    return {
      fixedContent: content,
      addedSubject: prefixedNameMatch[1],
      usedPreviousSubject: false,
      fixDescription: `Recognized "${prefixedNameMatch[1]}" as a valid subject with prefixed name`
    };
  }

  // If it's indented, try to find the previous subject
  if (isIndented) {
    // Look for the last non-empty line before this one that isn't indented
    let previousSubject = '';
    for (let i = lineIndex - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;

      // If this line isn't indented and doesn't start with a comment
      if (!/^\s+/.test(lines[i]) && !line.startsWith('#')) {
        // Extract the subject (first part before any whitespace)
        const match = line.match(/^([^\s]+)/);
        if (match) {
          previousSubject = match[1];
          break;
        }
      }
    }

    // If we found a previous subject, add it to the problematic line
    if (previousSubject) {
      lines[lineIndex] = previousSubject + ' ' + problematicLine.trim();
      return {
        fixedContent: lines.join('\n'),
        addedSubject: previousSubject,
        usedPreviousSubject: true,
        fixDescription: `Used previous subject "${previousSubject}" for this statement`
      };
    }
  }

  // Extract the predicate from the problematic line
  const predicateMatch = problematicLine.trim().match(/^(\S+)/);
  const predicateName = predicateMatch ? predicateMatch[1] : 'predicate';

  // Create a subject name based on the predicate if possible
  let placeholderSubject = '<http://example.org/Subject>';
  if (predicateMatch) {
    // If the predicate has a namespace prefix, use it to create a better subject
    if (predicateMatch[1].includes(':')) {
      const [prefix, name] = predicateMatch[1].split(':');
      placeholderSubject = `<http://example.org/${name.charAt(0).toUpperCase() + name.slice(1)}>`;
    }
  }

  // Add a new triple to define the subject before using it
  // Find the position to insert the new triple (before the problematic line)
  let insertPosition = lineIndex;
  // Go back to find a good insertion point (after any comments)
  while (insertPosition > 0 && (lines[insertPosition-1].trim().startsWith('#') || lines[insertPosition-1].trim() === '')) {
    insertPosition--;
  }

  // Insert a new triple defining the subject
  lines.splice(insertPosition, 0, `# Added subject definition for missing subject in line ${lineIndex + 1}`);
  lines.splice(insertPosition + 1, 0, `${placeholderSubject} rdf:type rdfs:Resource .`);

  // Fix the problematic line
  lines[lineIndex + 2] = placeholderSubject + ' ' + problematicLine.trim();

  return {
    fixedContent: lines.join('\n'),
    addedSubject: placeholderSubject,
    usedPreviousSubject: false,
    fixDescription: `Added a new subject "${placeholderSubject}" and created a triple to define it`
  };
};

export default function PlaygroundPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const sampleTriples = await getSampleTriples();
        const nodesMap = new Map<string, GraphNode>();
        const rootNode = sampleTriples[0].subject;

        // First pass: Create all nodes
        sampleTriples.forEach(triple => {
          if (!nodesMap.has(triple.subject)) {
            nodesMap.set(triple.subject, {
              id: triple.subject,
              label: triple.subject,
              type: 'subject',
              expanded: triple.subject === rootNode,
              visible: true // Make all subject nodes visible by default
            });
          }
          if (!nodesMap.has(triple.object)) {
            nodesMap.set(triple.object, {
              id: triple.object,
              label: triple.object,
              type: 'object',
              expanded: false,
              visible: true // Make all object nodes visible by default
            });
          }
        });

        // Second pass: Set visibility for connected nodes
        sampleTriples.forEach(triple => {
          const sourceNode = nodesMap.get(triple.subject);
          const targetNode = nodesMap.get(triple.object);

          if (sourceNode && targetNode) {
            // Ensure both ends of the relationship are visible
            sourceNode.visible = true;
            targetNode.visible = true;
          }
        });

        // Create links with all visible by default
        const links = sampleTriples.map(triple => ({
          source: triple.subject,
          target: triple.object,
          label: triple.predicate,
          visible: true // Make all links visible by default
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

  const [errorInfo, setErrorInfo] = useState<{
    message: string;
    details?: string;
    lineNumber?: number;
    statement?: string;
    originalContent?: string;
    fixedContent?: string;
    addedSubject?: string;
    usedPreviousSubject?: boolean;
  } | null>(null);

  const handleFileUpload = useCallback(async (files: File[]) => {
    try {
      // Reset error state when processing a new file
      setErrorInfo(null);

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
      try {
        const triples = await parseTriplesFile(content);
        if (triples.length === 0) {
          throw new Error('No valid triples found in the file');
        }

        const result = await triplesToGraphData(triples);
        setGraphData(result);
      } catch (error) {
        console.error('Error processing file:', error);

        // Extract detailed error information
        let errorMessage = 'Failed to process file. Please check the file format.';
        let errorDetails = '';
        let lineNumber: number | undefined = undefined;
        let statement: string | undefined = undefined;
        let fixedContent: string | undefined = undefined;

        if (error instanceof Error) {
          errorMessage = error.message;

          // Parse error message for statement details
          const statementMatch = errorMessage.match(/Error in statement (\d+): (.*?)\nStatement: "(.*?)"/);
          if (statementMatch) {
            lineNumber = parseInt(statementMatch[1]);
            errorDetails = statementMatch[2];
            statement = statementMatch[3];

            // Try to fix common errors
            if (errorMessage.includes('Missing subject in triple')) {
              errorDetails = 'A triple is missing its subject. Each statement must start with a subject.';

              // Attempt to fix the content by adding a placeholder subject
              const fixResult = attemptToFixMissingSubject(content, statement);
              fixedContent = fixResult.fixedContent;

              // Add the fix description to the error details
              errorDetails += ` ${fixResult.fixDescription}.`;
            }
          }

          // Check for blank node errors
          if (errorMessage.includes('blank node')) {
            errorDetails = 'There was an issue processing a blank node in your file.';
          }
        }

        setErrorInfo({
          message: errorMessage,
          details: errorDetails,
          lineNumber,
          statement,
          originalContent: content,
          fixedContent
        });

        throw error;
      }
    } catch (error) {
      console.error('Error processing file:', error);
      // Error state is already set above
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
    <div className="set-margin-hundred pt-12">
      <div className="container mx-auto px-4 py-6 space-y-6">

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
                  'text/turtle': ['.ttl'],

                }}
                onFileUpload={handleFileUpload}
            />
          </div>

          {errorInfo && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md shadow-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-red-800">Error Processing File</h3>
                  <div className="mt-2">
                    {/* Display the main error message with formatting */}
                    {errorInfo.message.includes('\n') ? (
                      <div className="font-semibold text-red-700 whitespace-pre-line">{errorInfo.message}</div>
                    ) : (
                      <p className="font-semibold text-red-700">{errorInfo.message}</p>
                    )}

                    {/* Display additional details if available */}
                    {errorInfo.details && (
                      <p className="mt-1 text-red-700">{errorInfo.details}</p>
                    )}

                    {/* Display line number information */}
                    {errorInfo.lineNumber && (
                      <p className="mt-1 text-red-700">Problem found in statement {errorInfo.lineNumber}</p>
                    )}

                    {/* Display code context with syntax highlighting */}
                    {errorInfo.message.includes('Problem area:') && (
                      <div className="mt-3 p-3 bg-gray-800 rounded text-white font-mono text-sm overflow-x-auto">
                        <pre className="whitespace-pre">{
                          errorInfo.message.split('Problem area:')[1]
                            .split('Suggestion:')[0]
                            .trim()
                        }</pre>
                      </div>
                    )}

                    {/* Display the problematic statement if available */}
                    {errorInfo.statement && !errorInfo.message.includes('Problem area:') && (
                      <div className="mt-2 p-3 bg-gray-800 rounded text-white font-mono text-sm overflow-x-auto">
                        <code>{errorInfo.statement}</code>
                      </div>
                    )}

                    {/* Display suggestion if available */}
                    {errorInfo.message.includes('Suggestion:') && (
                      <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-700">
                        <p className="font-medium">Suggestion:</p>
                        <p>{
                          errorInfo.message.split('Suggestion:')[1].trim()
                        }</p>
                      </div>
                    )}
                  </div>

                  {errorInfo.fixedContent && (
                    <div className="mt-4">
                      <h4 className="font-medium text-green-800">Automatic Fix Available</h4>
                      <p className="mt-1 text-gray-700">
                        We've detected a possible fix for this error. Would you like to try it?
                      </p>
                      <button
                        className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        onClick={async () => {
                          try {
                            setIsLoading(true);
                            setErrorInfo(null);

                            if (typeof errorInfo.fixedContent !== 'string') {
                              throw new Error('Fixed content is not available');
                            }

                            // Process the fixed content
                            const triples = await parseTriplesFile(errorInfo.fixedContent);
                            if (triples.length === 0) {
                              throw new Error('No valid triples found in the fixed file');
                            }

                            const result = await triplesToGraphData(triples);
                            setGraphData(result);
                          } catch (error) {
                            console.error('Error processing fixed file:', error);

                            if (error instanceof Error) {
                              setErrorInfo({
                                message: 'The automatic fix was not successful',
                                details: error.message,
                                originalContent: errorInfo.originalContent
                              });
                            }
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                      >
                        Try Automatic Fix
                      </button>
                    </div>
                  )}

                  <div className="mt-4">
                    <h4 className="font-medium text-red-800">Common Solutions:</h4>
                    <ul className="list-disc pl-5 mt-1 text-red-700">
                      <li>Ensure each statement starts with a subject</li>
                      <li>Check for proper syntax in your Turtle/RDF file</li>
                      <li>Verify that all URIs are properly formatted</li>
                      <li>Make sure all statements end with a period (.)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

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
            {graphData && !errorInfo && (
              <GraphVisualization
                data={graphData}
                onNodeClick={handleNodeClick}
              />
            )}
            {!graphData && !isLoading && !errorInfo && (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-lg">Upload a file to visualize your knowledge graph</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
