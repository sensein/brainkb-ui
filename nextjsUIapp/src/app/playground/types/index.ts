export interface Triple {
  subject: string;
  predicate: string;
  object: string;
}

export interface Node {
  id: string;
  label: string;
  type: 'subject' | 'object';
  expanded: boolean;
  visible: boolean;
  index?: number;
  // D3 simulation properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface Link {
  source: string | Node;
  target: string | Node;
  label: string;
  visible: boolean;
}

export interface GraphMetadata {
  totalNodes: number;
  totalLinks: number;
  visibleNodes: number;
  maxVisibleNodes: number;
  hasMore: boolean;
  processedTriples: number;
}

export interface ProcessingProgress {
  processedTriples: number;
  totalTriples: number;
  uniqueNodes: number;
}

export interface WorkerMessage {
  type: 'progress' | 'complete';
  data: ProcessingProgress | {
    nodes: [string, Node][];
    links: Link[];
    metadata: ProcessingProgress;
  };
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
  metadata?: GraphMetadata;
}
