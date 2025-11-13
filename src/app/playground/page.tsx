'use client';

import { useState, useCallback, useEffect } from 'react';
import FileUpload from '@/src/app/components/playground/FileUpload';
import GraphVisualization from '@/src/app/components/playground/GraphVisualization';
import { parseTriplesFile, triplesToGraphData, getSampleTriples, extractTriplesFromPDF } from './utils/pdfProcessor';
import { Triple, GraphData, Node as GraphNode } from './types/index';
import { Network, Table2, Copy, Check, ExternalLink, ChevronDown, ChevronUp, Search, Download, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  const [expandedRelationships, setExpandedRelationships] = useState<Set<string>>(new Set());
  const [selectedStatistic, setSelectedStatistic] = useState<string>('totalNodes');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [graphTableSearchQuery, setGraphTableSearchQuery] = useState<string>('');
  const [graphTablePage, setGraphTablePage] = useState<number>(1);
  const [statsTablePage, setStatsTablePage] = useState<number>(1);
  
  const ITEMS_PER_PAGE = 50;

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

  // Calculate statistics
  const statistics = graphData ? {
    totalNodes: graphData.nodes.length,
    subjectNodes: graphData.nodes.filter(n => n.type === 'subject').length,
    objectNodes: graphData.nodes.filter(n => n.type === 'object').length,
    totalRelationships: graphData.links.length,
    uniqueRelationshipTypes: new Set(graphData.links.map(l => l.label)).size,
    relationshipDistribution: graphData.links.reduce((acc, link) => {
      acc[link.label] = (acc[link.label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  } : null;

  // Clean label text - remove RDF syntax and quotes only, keep full URLs
  const cleanLabel = (label: string): string => {
    if (!label) return '';
    
    let cleaned = label;
    
    // Remove RDF typed literal syntax: "value"^^<http://...
    // Matches patterns like: "BC-QXSSQN569230"^^<http://www...
    const typedLiteralMatch = cleaned.match(/^"([^"]+)"\^\^<[^>]*/);
    if (typedLiteralMatch) {
      cleaned = typedLiteralMatch[1]; // Extract just the value inside quotes
    }
    
    // Remove surrounding quotes if still present
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    // Return the cleaned label as-is - no truncation, no URL extraction
    return cleaned;
  };

  // Prepare table data - show ALL relationships (subject-predicate-object)
  // This includes every link in the graph, regardless of visibility settings
  const tableData = graphData ? graphData.links
    .filter(link => {
      // Only filter out truly invalid links
      if (!link || link === null || link === undefined) return false;
      // Ensure link has required properties
      if (!link.source || !link.target) return false;
      return true;
    })
    .map((link, index) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      const sourceNode = graphData.nodes.find(n => n.id === sourceId);
      const targetNode = graphData.nodes.find(n => n.id === targetId);
      
      // Store both cleaned (for display) and original (for export) labels
      const subjectLabel = sourceNode?.label || sourceId;
      const objectLabel = targetNode?.label || targetId;
      const predicateLabel = link.label || '';
      
      return {
        id: index,
        subject: cleanLabel(subjectLabel), // Cleaned for display
        predicate: cleanLabel(predicateLabel), // Cleaned for display
        object: cleanLabel(objectLabel), // Cleaned for display
        subjectOriginal: subjectLabel, // Original for CSV export
        predicateOriginal: predicateLabel, // Original for CSV export
        objectOriginal: objectLabel, // Original for CSV export
        subjectType: sourceNode?.type || 'unknown',
        objectType: targetNode?.type || 'unknown',
        // Store original IDs for reference
        subjectId: sourceId,
        objectId: targetId
      };
    }) : [];

  // Toggle relationship expansion
  const toggleRelationship = (label: string) => {
    setExpandedRelationships(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  // Copy URL to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(text);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Export data to CSV
  const exportToCSV = () => {
    if (!getStatisticDetails(selectedStatistic) || !graphData) return;

    const filteredItems = filterItems(getStatisticDetails(selectedStatistic)!.items, selectedStatistic);
    const items = filteredItems;
    
    let headers: string[] = [];
    let rows: string[][] = [];

    if (selectedStatistic === 'totalRelationships') {
      headers = ['Subject', 'Predicate', 'Object'];
      // Get original labels directly from graphData for export - always use full original data
      rows = items.map((item: any) => {
        // Find the original link to get original labels
        const linkIndex = item.id;
        if (linkIndex !== undefined && graphData.links[linkIndex]) {
          const link = graphData.links[linkIndex];
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          const sourceNode = graphData.nodes.find(n => n.id === sourceId);
          const targetNode = graphData.nodes.find(n => n.id === targetId);
          // Prefer IDs (full original values) over labels for export
          return [
            sourceId || sourceNode?.id || sourceNode?.label || '',
            link.label || '',
            targetId || targetNode?.id || targetNode?.label || ''
          ];
        }
        // Fallback: try to reconstruct from item data
        return [
          item.subject || '',
          item.predicate || '',
          item.object || ''
        ];
      });
    } else if (selectedStatistic === 'uniqueTypes') {
      headers = ['Relationship Type', 'Count', 'Percentage'];
      // Get original labels from statistics
      rows = items.map((item: any) => {
        // Find original label from statistics relationshipDistribution
        const originalLabel = Object.keys(statistics?.relationshipDistribution || {}).find(
          key => cleanLabel(key) === item.label
        ) || item.label;
        return [
          originalLabel || '',
          item.count?.toString() || '0',
          item.percentage || '0'
        ];
      });
    } else {
      headers = ['Type', 'Node Label'];
      // Get original labels directly from graphData nodes - always use full original data
      rows = items.map((item: any) => {
        const originalNode = graphData.nodes.find(n => n.id === item.id);
        // Prefer node ID (full original value) over label for export
        const originalLabel = item.id || originalNode?.id || originalNode?.label || item.label || '';
        return [
          item.type === 'subject' ? 'Subject' : 'Object',
          originalLabel
        ];
      });
    }

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Escape commas and quotes in cell values
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${getStatisticDetails(selectedStatistic)?.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export graph visualization table to CSV
  const exportGraphTableToCSV = () => {
    if (!graphData || !tableData || tableData.length === 0) return;

    // Export filtered data if search is active
    const dataToExport = filterGraphTableData(tableData);
    if (dataToExport.length === 0) return;

    const headers = ['Subject', 'Predicate', 'Object'];
    // Always get original data directly from graphData to ensure full URLs
    // Use node/link IDs (which are always full) as primary source, labels as fallback
    const rows = dataToExport.map((row: any) => {
      // Get original data directly from graphData using stored IDs
      const sourceNode = graphData.nodes.find(n => n.id === row.subjectId);
      const targetNode = graphData.nodes.find(n => n.id === row.objectId);
      const link = graphData.links[row.id];
      
      // Prefer IDs (full original values) over labels (which might be truncated)
      return [
        row.subjectId || sourceNode?.id || sourceNode?.label || '',
        link?.label || '',
        row.objectId || targetNode?.id || targetNode?.label || ''
      ];
    });

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Escape commas and quotes in cell values
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Knowledge_Graph_Table_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter items based on search query
  const filterItems = (items: any[], statType: string) => {
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter((item: any) => {
      if (statType === 'totalRelationships') {
        return (
          item.subject?.toLowerCase().includes(query) ||
          item.predicate?.toLowerCase().includes(query) ||
          item.object?.toLowerCase().includes(query)
        );
      } else if (statType === 'uniqueTypes') {
        return item.label?.toLowerCase().includes(query);
      } else {
        return (
          item.label?.toLowerCase().includes(query) ||
          item.type?.toLowerCase().includes(query)
        );
      }
    });
  };

  // Filter graph table data based on search query
  const filterGraphTableData = (data: typeof tableData) => {
    if (!graphTableSearchQuery.trim()) return data;
    
    const query = graphTableSearchQuery.toLowerCase();
    return data.filter((row) => {
      return (
        row.subject?.toLowerCase().includes(query) ||
        row.predicate?.toLowerCase().includes(query) ||
        row.object?.toLowerCase().includes(query)
      );
    });
  };

  // Get statistic details
  const getStatisticDetails = (statType: string) => {
    if (!graphData || !statistics) return null;

    switch (statType) {
      case 'totalNodes':
        return {
          title: 'Total Nodes',
          description: 'All nodes in the knowledge graph',
          items: graphData.nodes.map(node => ({
            id: node.id,
            label: cleanLabel(node.label),
            type: node.type
          }))
        };
      case 'subjectNodes':
        return {
          title: 'Subject Nodes',
          description: 'Nodes that appear as subjects in relationships',
          items: graphData.nodes
            .filter(node => node.type === 'subject')
            .map(node => ({
              id: node.id,
              label: cleanLabel(node.label),
              type: node.type
            }))
        };
      case 'objectNodes':
        return {
          title: 'Object Nodes',
          description: 'Nodes that appear as objects in relationships',
          items: graphData.nodes
            .filter(node => node.type === 'object')
            .map(node => ({
              id: node.id,
              label: cleanLabel(node.label),
              type: node.type
            }))
        };
      case 'totalRelationships':
        return {
          title: 'Total Relationships',
          description: 'All relationships in the knowledge graph',
          items: graphData.links.map((link, index) => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            const sourceNode = graphData.nodes.find(n => n.id === sourceId);
            const targetNode = graphData.nodes.find(n => n.id === targetId);
            return {
              id: index,
              subject: cleanLabel(sourceNode?.label || sourceId),
              predicate: cleanLabel(link.label),
              object: cleanLabel(targetNode?.label || targetId),
              subjectType: sourceNode?.type || 'unknown',
              objectType: targetNode?.type || 'unknown'
            };
          })
        };
      case 'uniqueTypes':
        return {
          title: 'Unique Relationship Types',
          description: 'Distinct types of relationships in the graph',
          items: Object.entries(statistics.relationshipDistribution)
            .sort(([, a], [, b]) => b - a)
            .map(([label, count]) => ({
              label: cleanLabel(label),
              count,
              percentage: ((count / statistics.totalRelationships) * 100).toFixed(2)
            }))
        };
      default:
        return null;
    }
  };

  return (
    <div className="pt-12">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-blue-500 to-emerald-500 rounded-2xl shadow-xl mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-600/20 to-transparent"></div>
          <div className="relative px-8 py-12">
            <p className="text-sky-100 text-base leading-relaxed mb-2">
              Visualize your knowledge graphs and uncover meaningful insights about nodes and relationships. Below is an example visualization generated from sample data, illustrating how the structure and connections come together.
            </p>
            <p className="text-sky-100 text-sm italic">
              Note: Currently, we restrict the visualization to <span className="font-semibold text-white">50,000</span> nodes.
            </p>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-center">
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
        </div>

        {/* Error Display */}
        {errorInfo && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg shadow-md">
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

        {/* View Toggle and Main Content */}
        {graphData && !errorInfo && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            {/* View Toggle */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Graph Visualization</h2>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('graph')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                    viewMode === 'graph'
                      ? 'bg-white text-sky-600 shadow-md font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Network className="w-4 h-4" />
                  Graph View
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-sky-600 shadow-md font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Table2 className="w-4 h-4" />
                  Table View
                </button>
              </div>
            </div>

            {/* Graph or Table View */}
            <div className="relative min-h-[600px]">
              {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600">Processing...</p>
                  </div>
                </div>
              )}
              
              {viewMode === 'graph' ? (
                <GraphVisualization
                  data={graphData}
                  onNodeClick={handleNodeClick}
                />
              ) : (
                <div>
                  {/* Table Header with Export Button */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Graph Data Table</h3>
                    <button
                      onClick={exportGraphTableToCSV}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                      title="Export to CSV"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="mb-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search relationships by subject, predicate, or object..."
                        value={graphTableSearchQuery}
                        onChange={(e) => {
                          setGraphTableSearchQuery(e.target.value);
                          setGraphTablePage(1); // Reset to first page when searching
                        }}
                        className="block w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                      />
                      {graphTableSearchQuery && (
                        <button
                          onClick={() => {
                            setGraphTableSearchQuery('');
                            setGraphTablePage(1);
                          }}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        >
                          <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        </button>
                      )}
                    </div>
                    {graphTableSearchQuery.trim() !== "" && (
                      <p className="mt-2 text-sm text-gray-600">
                        Showing {filterGraphTableData(tableData).length} of {tableData.length} results
                      </p>
                    )}
                  </div>
                  
                  <div className="rounded-xl border border-gray-200 shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-700 table-auto">
                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs min-w-[200px]">Subject</th>
                            <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs min-w-[200px]">Predicate</th>
                            <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs min-w-[200px]">Object</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(() => {
                            const filteredData = filterGraphTableData(tableData);
                            const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
                            const startIndex = (graphTablePage - 1) * ITEMS_PER_PAGE;
                            const endIndex = startIndex + ITEMS_PER_PAGE;
                            const paginatedData = filteredData.slice(startIndex, endIndex);
                            
                            // Reset to first page if current page is beyond available pages
                            if (graphTablePage > totalPages && totalPages > 0) {
                              setGraphTablePage(1);
                            }
                            
                            return paginatedData.length > 0 ? (
                              paginatedData.map((row) => (
                              <tr key={row.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                <td className="px-6 py-4 break-words align-top" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                    row.subjectType === 'subject' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-green-100 text-green-800'
                                  }`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>
                                    {row.subject}
                                  </span>
                                </td>
                                <td className="px-6 py-4 break-words align-top" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                  <span className="text-gray-700 font-medium block" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>{row.predicate}</span>
                                </td>
                                <td className="px-6 py-4 break-words align-top" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                    row.objectType === 'subject' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-green-100 text-green-800'
                                  }`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>
                                    {row.object}
                                  </span>
                                </td>
                              </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                  {graphTableSearchQuery.trim() ? 'No results found for your search' : 'No data available'}
                                </td>
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Pagination for Graph Table */}
                  {(() => {
                    const filteredData = filterGraphTableData(tableData);
                    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
                    
                    if (totalPages <= 1) {
                      return (
                        <div className="mt-4 text-sm text-gray-600">
                          {graphTableSearchQuery.trim() ? (
                            <>
                              Showing {filteredData.length} of {tableData.length} relationships
                            </>
                          ) : (
                            <>
                              Showing {tableData.length} relationships
                            </>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <nav className="flex items-center flex-wrap md:flex-row justify-between pt-6 gap-4" aria-label="Table navigation">
                        <div className="text-sm text-gray-600">
                          Showing <span className="font-semibold text-gray-900">{(graphTablePage - 1) * ITEMS_PER_PAGE + 1}</span> to <span
                            className="font-semibold text-gray-900">{Math.min(graphTablePage * ITEMS_PER_PAGE, filteredData.length)}</span> of <span
                            className="font-semibold text-gray-900">{filteredData.length}</span> entries
                          {graphTableSearchQuery.trim() && filteredData.length !== tableData.length && (
                            <span className="text-gray-500"> (filtered from {tableData.length} total)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setGraphTablePage((prev) => Math.max(prev - 1, 1))}
                            disabled={graphTablePage === 1}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({length: Math.min(totalPages, 10)}, (_, index) => {
                              let pageNum;
                              if (totalPages <= 10) {
                                pageNum = index + 1;
                              } else if (graphTablePage <= 5) {
                                pageNum = index + 1;
                              } else if (graphTablePage >= totalPages - 4) {
                                pageNum = totalPages - 9 + index;
                              } else {
                                pageNum = graphTablePage - 5 + index;
                              }
                              return (
                                <button
                                  key={index}
                                  onClick={() => setGraphTablePage(pageNum)}
                                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    graphTablePage === pageNum
                                      ? 'bg-sky-600 text-white shadow-md'
                                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                  }`}
                                  aria-current={graphTablePage === pageNum ? 'page' : undefined}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => setGraphTablePage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={graphTablePage === totalPages}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </nav>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Statistics Table */}
        {statistics && !errorInfo && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Graph Statistics</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <button
                onClick={() => {
                  setSelectedStatistic('totalNodes');
                  setSearchQuery(''); // Clear search when switching
                  setStatsTablePage(1); // Reset to first page
                }}
                className={`rounded-lg p-4 border transition-all cursor-pointer text-left ${
                  selectedStatistic === 'totalNodes'
                    ? 'bg-gradient-to-br from-sky-100 to-blue-100 border-sky-400 shadow-md ring-2 ring-sky-300'
                    : 'bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200 hover:border-sky-400 hover:shadow-md'
                }`}
              >
                <div className="text-sm font-medium text-gray-600 mb-1">Total Nodes</div>
                <div className="text-2xl font-bold text-sky-600">{statistics.totalNodes}</div>
                <div className="text-xs text-gray-500 mt-1">Click to view details</div>
              </button>
              <button
                onClick={() => {
                  setSelectedStatistic('subjectNodes');
                  setSearchQuery(''); // Clear search when switching
                  setStatsTablePage(1); // Reset to first page
                }}
                className={`rounded-lg p-4 border transition-all cursor-pointer text-left ${
                  selectedStatistic === 'subjectNodes'
                    ? 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-400 shadow-md ring-2 ring-blue-300'
                    : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <div className="text-sm font-medium text-gray-600 mb-1">Subject Nodes</div>
                <div className="text-2xl font-bold text-blue-600">{statistics.subjectNodes}</div>
                <div className="text-xs text-gray-500 mt-1">Click to view details</div>
              </button>
              <button
                onClick={() => {
                  setSelectedStatistic('objectNodes');
                  setSearchQuery(''); // Clear search when switching
                  setStatsTablePage(1); // Reset to first page
                }}
                className={`rounded-lg p-4 border transition-all cursor-pointer text-left ${
                  selectedStatistic === 'objectNodes'
                    ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-400 shadow-md ring-2 ring-green-300'
                    : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-400 hover:shadow-md'
                }`}
              >
                <div className="text-sm font-medium text-gray-600 mb-1">Object Nodes</div>
                <div className="text-2xl font-bold text-green-600">{statistics.objectNodes}</div>
                <div className="text-xs text-gray-500 mt-1">Click to view details</div>
              </button>
              <button
                onClick={() => {
                  setSelectedStatistic('totalRelationships');
                  setSearchQuery(''); // Clear search when switching
                  setStatsTablePage(1); // Reset to first page
                }}
                className={`rounded-lg p-4 border transition-all cursor-pointer text-left ${
                  selectedStatistic === 'totalRelationships'
                    ? 'bg-gradient-to-br from-purple-100 to-pink-100 border-purple-400 shadow-md ring-2 ring-purple-300'
                    : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:border-purple-400 hover:shadow-md'
                }`}
              >
                <div className="text-sm font-medium text-gray-600 mb-1">Total Relationships</div>
                <div className="text-2xl font-bold text-purple-600">{statistics.totalRelationships}</div>
                <div className="text-xs text-gray-500 mt-1">Click to view details</div>
              </button>
              <button
                onClick={() => {
                  setSelectedStatistic('uniqueTypes');
                  setSearchQuery(''); // Clear search when switching
                  setStatsTablePage(1); // Reset to first page
                }}
                className={`rounded-lg p-4 border transition-all cursor-pointer text-left ${
                  selectedStatistic === 'uniqueTypes'
                    ? 'bg-gradient-to-br from-amber-100 to-orange-100 border-amber-400 shadow-md ring-2 ring-amber-300'
                    : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:border-amber-400 hover:shadow-md'
                }`}
              >
                <div className="text-sm font-medium text-gray-600 mb-1">Unique Types</div>
                <div className="text-2xl font-bold text-amber-600">{statistics.uniqueRelationshipTypes}</div>
                <div className="text-xs text-gray-500 mt-1">Click to view details</div>
              </button>
            </div>

            {/* Dynamic Details Table */}
            <div className="mt-6">
              {getStatisticDetails(selectedStatistic) && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getStatisticDetails(selectedStatistic)?.title} Details
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {getStatisticDetails(selectedStatistic)?.description}
                      </p>
                    </div>
                    <button
                      onClick={exportToCSV}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                      title="Export to CSV"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="mb-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder={`Search ${getStatisticDetails(selectedStatistic)?.title.toLowerCase()}...`}
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setStatsTablePage(1); // Reset to first page when searching
                        }}
                        className="block w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        >
                          <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        </button>
                      )}
                    </div>
                    {searchQuery.trim() !== "" && (
                      <p className="mt-2 text-sm text-gray-600">
                        Showing {filterItems(getStatisticDetails(selectedStatistic)!.items, selectedStatistic).length} of {getStatisticDetails(selectedStatistic)!.items.length} results
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-700 table-auto">
                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-gray-200">
                          <tr>
                            {selectedStatistic === 'totalRelationships' ? (
                              <>
                                <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">Subject</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">Predicate</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">Object</th>
                              </>
                            ) : selectedStatistic === 'uniqueTypes' ? (
                              <>
                                <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">Relationship Type</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">Count</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">Percentage</th>
                              </>
                            ) : (
                              <>
                                <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">Type</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">Node Label</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(() => {
                            const filteredItems = filterItems(getStatisticDetails(selectedStatistic)!.items, selectedStatistic);
                            const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
                            const startIndex = (statsTablePage - 1) * ITEMS_PER_PAGE;
                            const endIndex = startIndex + ITEMS_PER_PAGE;
                            const paginatedItems = filteredItems.slice(startIndex, endIndex);
                            
                            // Reset to first page if current page is beyond available pages
                            if (statsTablePage > totalPages && totalPages > 0) {
                              setStatsTablePage(1);
                            }
                            
                            return paginatedItems.length > 0 ? (
                              paginatedItems.map((item: any, index: number) => {
                              if (selectedStatistic === 'totalRelationships') {
                                return (
                                  <tr key={item.id || index} className="hover:bg-sky-50/50 transition-colors duration-150">
                                    <td className="px-6 py-4 break-words">
                                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium break-all ${
                                        item.subjectType === 'subject' 
                                          ? 'bg-blue-100 text-blue-800' 
                                          : 'bg-green-100 text-green-800'
                                      }`}>
                                        {item.subject}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 break-words">
                                      <div className="flex items-start gap-2 flex-wrap">
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800 break-all">
                                          {item.predicate}
                                        </code>
                                        {item.predicate.length > 50 && (
                                          <button
                                            onClick={() => toggleRelationship(item.predicate)}
                                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                                            title={expandedRelationships.has(item.predicate) ? 'Collapse' : 'Expand'}
                                          >
                                            {expandedRelationships.has(item.predicate) ? (
                                              <ChevronUp className="w-4 h-4 text-gray-600" />
                                            ) : (
                                              <ChevronDown className="w-4 h-4 text-gray-600" />
                                            )}
                                          </button>
                                        )}
                                        <button
                                          onClick={() => copyToClipboard(item.predicate)}
                                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                                          title="Copy URL"
                                        >
                                          {copiedUrl === item.predicate ? (
                                            <Check className="w-4 h-4 text-green-600" />
                                          ) : (
                                            <Copy className="w-4 h-4 text-gray-600" />
                                          )}
                                        </button>
                                        {item.predicate.startsWith('http') && (
                                          <a
                                            href={item.predicate}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                                            title="Open in new tab"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <ExternalLink className="w-4 h-4 text-gray-600" />
                                          </a>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 break-words">
                                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium break-all ${
                                        item.objectType === 'subject' 
                                          ? 'bg-blue-100 text-blue-800' 
                                          : 'bg-green-100 text-green-800'
                                      }`}>
                                        {item.object}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              } else if (selectedStatistic === 'uniqueTypes') {
                                const percentage = item.percentage;
                                const isExpanded = expandedRelationships.has(item.label);
                                const isLongUrl = item.label.length > 50;
                                return (
                                  <>
                                    <tr key={item.label} className="hover:bg-sky-50/50 transition-colors duration-150">
                                      <td className="px-6 py-4 break-words">
                                        <div className="flex items-start gap-2 flex-wrap">
                                          <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800 break-all">
                                            {item.label}
                                          </code>
                                          <div className="flex items-center gap-1">
                                            {isLongUrl && (
                                              <button
                                                onClick={() => toggleRelationship(item.label)}
                                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                title={isExpanded ? 'Collapse' : 'Expand'}
                                              >
                                                {isExpanded ? (
                                                  <ChevronUp className="w-4 h-4 text-gray-600" />
                                                ) : (
                                                  <ChevronDown className="w-4 h-4 text-gray-600" />
                                                )}
                                              </button>
                                            )}
                                            <button
                                              onClick={() => copyToClipboard(item.label)}
                                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                                              title="Copy URL"
                                            >
                                              {copiedUrl === item.label ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                              ) : (
                                                <Copy className="w-4 h-4 text-gray-600" />
                                              )}
                                            </button>
                                            {item.label.startsWith('http') && (
                                              <a
                                                href={item.label}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                title="Open in new tab"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <ExternalLink className="w-4 h-4 text-gray-600" />
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 font-semibold text-gray-900">{item.count}</td>
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                            <div
                                              className="bg-gradient-to-r from-sky-500 to-blue-500 h-2 rounded-full"
                                              style={{ width: `${percentage}%` }}
                                            ></div>
                                          </div>
                                          <span className="text-gray-600 text-sm">{percentage}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                    {isExpanded && (
                                      <tr className="bg-gray-50">
                                        <td colSpan={3} className="px-6 py-4">
                                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                                            <div className="text-xs font-semibold text-gray-700 mb-2">Full URL:</div>
                                            <code className="text-xs bg-gray-100 px-3 py-2 rounded text-gray-800 break-all block">
                                              {item.label}
                                            </code>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                );
                              } else {
                                return (
                                  <tr key={item.id || index} className="hover:bg-sky-50/50 transition-colors duration-150">
                                    <td className="px-6 py-4">
                                      <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
                                        item.type === 'subject' 
                                          ? 'bg-sky-100 text-sky-800' 
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                        {item.type === 'subject' ? 'Subject' : 'Object'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="text-gray-800 break-all block">{item.label}</span>
                                    </td>
                                  </tr>
                                );
                              }
                              })
                            ) : (
                              <tr>
                                <td colSpan={selectedStatistic === 'totalRelationships' || selectedStatistic === 'uniqueTypes' ? 3 : 2} className="px-6 py-8 text-center text-gray-500">
                                  {searchQuery.trim() ? 'No results found for your search' : 'No items found'}
                                </td>
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Pagination for Statistics Table */}
                  {(() => {
                    const filteredItems = filterItems(getStatisticDetails(selectedStatistic)!.items, selectedStatistic);
                    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
                    
                    if (totalPages <= 1) {
                      return (
                        <div className="mt-4 text-sm text-gray-600">
                          {searchQuery.trim() ? (
                            <>
                              Showing {filteredItems.length} of {getStatisticDetails(selectedStatistic)!.items.length} items
                            </>
                          ) : (
                            <>
                              Showing {getStatisticDetails(selectedStatistic)!.items.length} items
                            </>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        <nav className="flex items-center flex-wrap md:flex-row justify-between pt-6 gap-4" aria-label="Table navigation">
                          <div className="text-sm text-gray-600">
                            Showing <span className="font-semibold text-gray-900">{(statsTablePage - 1) * ITEMS_PER_PAGE + 1}</span> to <span
                              className="font-semibold text-gray-900">{Math.min(statsTablePage * ITEMS_PER_PAGE, filteredItems.length)}</span> of <span
                              className="font-semibold text-gray-900">{filteredItems.length}</span> entries
                            {searchQuery.trim() && filteredItems.length !== getStatisticDetails(selectedStatistic)!.items.length && (
                              <span className="text-gray-500"> (filtered from {getStatisticDetails(selectedStatistic)!.items.length} total)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setStatsTablePage((prev) => Math.max(prev - 1, 1))}
                              disabled={statsTablePage === 1}
                              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Previous
                            </button>
                            <div className="flex items-center gap-1">
                              {Array.from({length: Math.min(totalPages, 10)}, (_, index) => {
                                let pageNum;
                                if (totalPages <= 10) {
                                  pageNum = index + 1;
                                } else if (statsTablePage <= 5) {
                                  pageNum = index + 1;
                                } else if (statsTablePage >= totalPages - 4) {
                                  pageNum = totalPages - 9 + index;
                                } else {
                                  pageNum = statsTablePage - 5 + index;
                                }
                                return (
                                  <button
                                    key={index}
                                    onClick={() => setStatsTablePage(pageNum)}
                                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                      statsTablePage === pageNum
                                        ? 'bg-sky-600 text-white shadow-md'
                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                    }`}
                                    aria-current={statsTablePage === pageNum ? 'page' : undefined}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              onClick={() => setStatsTablePage((prev) => Math.min(prev + 1, totalPages))}
                              disabled={statsTablePage === totalPages}
                              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Next
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </nav>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!graphData && !isLoading && !errorInfo && (
          <div className="bg-white rounded-xl shadow-lg p-12">
            <div className="text-center">
              <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">Upload a file to visualize your knowledge graph</p>
              <p className="text-gray-400 text-sm mt-2">Supported formats: JSON-LD (.jsonld) and Turtle (.ttl)</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
