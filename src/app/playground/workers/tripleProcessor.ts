import { Triple, Node, Link } from '../types';

// Process 50k triples at a time. This is also to reduce the overhead.
const CHUNK_SIZE = 50000;
// Maximum nodes to show initially
const MAX_VISIBLE_NODES = 50000;

interface ProcessedChunk {
  nodes: Map<string, Node>;
  links: Link[];
  metadata: {
    processedTriples: number;
    totalTriples: number;
    uniqueNodes: number;
  };
}

interface WorkerMessage {
  triples: Triple[];
  startIndex: number;
  totalTriples: number;
}

interface ProgressMessage {
  type: 'progress';
  data: {
    processedTriples: number;
    totalTriples: number;
    uniqueNodes: number;
  };
}

interface CompleteMessage {
  type: 'complete';
  data: {
    nodes: [string, Node][];
    links: Link[];
    metadata: {
      processedTriples: number;
      totalTriples: number;
      uniqueNodes: number;
      visibleNodes?: number; // Add optional visibleNodes property
    };
  };
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { triples, startIndex, totalTriples } = e.data;
  const nodes = new Map<string, Node>();
  const links: Link[] = [];
  let processedCount = 0;

  // Find root node (first subject)
  const rootNode = triples[0].subject;

  // Process triples in chunks
  for (let i = 0; i < triples.length; i += CHUNK_SIZE) {
    const chunk = triples.slice(i, Math.min(i + CHUNK_SIZE, triples.length));

    // Process chunk
    chunk.forEach((triple: Triple) => {
      // Add subject node if not exists - all nodes visible by default
      if (!nodes.has(triple.subject)) {
        const isRoot = triple.subject === rootNode;
        nodes.set(triple.subject, {
          id: triple.subject,
          label: triple.subject,
          type: 'subject',
          expanded: isRoot,
          visible: true, // Make all subject nodes visible by default
          index: startIndex + nodes.size
        });
      }

      // Add object node if not exists - all nodes visible by default
      if (!nodes.has(triple.object)) {
        nodes.set(triple.object, {
          id: triple.object,
          label: triple.object,
          type: 'object',
          expanded: false,
          visible: true, // Make all object nodes visible by default
          index: startIndex + nodes.size
        });
      }

      // Add link - all links visible by default
      links.push({
        source: triple.subject,
        target: triple.object,
        label: triple.predicate,
        visible: true // Make all links visible by default
      });
    });

    // All nodes are already visible by default, so we don't need to make specific connections visible
    // But we still want to track the root node's connections for metadata
    if (i === 0) {
      // Just count the root connections for metadata purposes
      const rootConnectionsCount = chunk.filter(triple => triple.subject === rootNode).length;
    }

    processedCount += chunk.length;

    // Send progress update
    if (processedCount % (CHUNK_SIZE * 10) === 0 || processedCount === triples.length) {
      const progressMessage: ProgressMessage = {
        type: 'progress',
        data: {
          processedTriples: startIndex + processedCount,
          totalTriples,
          uniqueNodes: nodes.size
        }
      };
      self.postMessage(progressMessage);
    }

    // Allow other tasks to run
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // Send completed chunk
  const completeMessage: CompleteMessage = {
    type: 'complete',
    data: {
      nodes: Array.from(nodes.entries()),
      links,
      metadata: {
        processedTriples: startIndex + processedCount,
        totalTriples,
        uniqueNodes: nodes.size,
        visibleNodes: nodes.size // All nodes are visible
      }
    }
  };
  self.postMessage(completeMessage);
};

export {};
