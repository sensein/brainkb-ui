import {Triple, GraphData, Node as GraphNode, Link} from '../types';
// Import libraries with proper error handling
let jsonld: any;
let $rdf: any;

// Dynamic imports to prevent build errors
try {
  // Use require for server-side compatibility
  jsonld = require('jsonld');
} catch (error) {
  console.warn('jsonld library not available:', error);
  // Fallback implementation
  jsonld = {
    expand: async (doc: any) => doc,
    toRDF: async (doc: any, options: any) => JSON.stringify(doc)
  };
}

try {
  // Use require for server-side compatibility
  $rdf = require('rdflib');
} catch (error) {
  console.warn('rdflib library not available:', error);
  // Fallback implementation
  $rdf = {
    graph: () => ({
      statementsMatching: () => []
    }),
    parse: () => {}
  };
}

export function graphDataToJsonLD(data: GraphData): string {
    const jsonld = data.nodes.map(node => {
        const nodeData: any = {
            '@id': node.id,
            '@type': node.type === 'subject' ? 'Subject' : 'Object'
        };

        // Find all outgoing links for this node
        const outgoingLinks = data.links.filter(link =>
            (typeof link.source === 'string' ? link.source : link.source.id) === node.id
        );

        // Add predicates and objects
        outgoingLinks.forEach(link => {
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            const predicate = link.label;

            if (!nodeData[predicate]) {
                nodeData[predicate] = {'@id': targetId};
            } else if (Array.isArray(nodeData[predicate])) {
                nodeData[predicate].push({'@id': targetId});
            } else {
                nodeData[predicate] = [nodeData[predicate], {'@id': targetId}];
            }
        });

        return nodeData;
    });

    return JSON.stringify({
        '@context': {
            '@vocab': 'http://example.org/',
            'Subject': 'http://example.org/Subject',
            'Object': 'http://example.org/Object'
        },
        '@graph': jsonld
    }, null, 2);
}

async function parseJsonLD(content: string): Promise<Triple[]> {
    try {
        // Parse the JSON-LD content
        const jsonldDoc = JSON.parse(content);

        // Expand the JSON-LD document to normalize it
        const expanded = await jsonld.expand(jsonldDoc);

        // Convert to N-Quads format (which is similar to triples)
        const nquads = await jsonld.toRDF(expanded, {format: 'application/n-quads'});

        // Parse the N-Quads into triples
        const triples: Triple[] = [];
        const lines = (nquads as string).split('\n').filter(Boolean);

        for (const line of lines) {
            // N-Quads format: <subject> <predicate> <object> [<graph>] .
            const match = line.match(/^<([^>]*)>\s*<([^>]*)>\s*(.+?)\s*\./);
            if (match) {
                const subject = match[1];
                const predicate = match[2];
                let object = match[3];

                // Handle different types of objects (URI, blank node, literal)
                if (object.startsWith('<') && object.endsWith('>')) {
                    object = object.slice(1, -1); // Remove < > for URIs
                } else if (object.startsWith('_:')) {
                    // Blank node, keep as is
                } else {
                    // Literal, keep as is (with quotes and datatype/language tag)
                }

                triples.push({ subject, predicate, object });
            }
        }

        return triples;
    } catch (error) {
        console.error('Error in parseJsonLD:', error);
        throw new Error(`Failed to parse JSON-LD: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function parseRDF(content: string): Triple[] {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'application/xml');
        const triples: Triple[] = [];
        const rdfNS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
        const owlNS = 'http://www.w3.org/2002/07/owl#';
        const rdfsNS = 'http://www.w3.org/2000/01/rdf-schema#';

        // Helper function to get full URI from prefix:name format
        const expandQName = (qname: string): string => {
            if (qname.startsWith('http://')) return qname;
            const [prefix, local] = qname.split(':');
            switch (prefix) {
                case 'rdf':
                    return `${rdfNS}${local}`;
                case 'owl':
                    return `${owlNS}${local}`;
                case 'rdfs':
                    return `${rdfsNS}${local}`;
                default:
                    return qname;
            }
        };

        // Process all elements that might contain RDF statements
        const processElement = (element: Element, context: { baseURI?: string } = {}) => {
            const about = element.getAttribute('rdf:about') || element.getAttribute('rdf:ID');
            const resource = element.getAttribute('rdf:resource');
            const nodeID = element.getAttribute('rdf:nodeID');

            // Handle different types of subjects
            let subject = '';
            if (about) {
                subject = about.startsWith('#') && context.baseURI
                    ? context.baseURI + about
                    : about;
            } else if (nodeID) {
                subject = `_:${nodeID}`;
            }

            if (!subject) return;

            // Handle type declarations
            const typeAttr = element.getAttribute('rdf:type');
            if (typeAttr) {
                triples.push({
                    subject,
                    predicate: expandQName('rdf:type'),
                    object: expandQName(typeAttr)
                });
            }

            // Process attributes as predicates
            Array.from(element.attributes).forEach(attr => {
                if (!attr.name.startsWith('xmlns:') && !attr.name.startsWith('rdf:')) {
                    const predicate = expandQName(attr.name);
                    triples.push({subject, predicate, object: attr.value});
                }
            });

            // Process child elements
            Array.from(element.children).forEach(child => {
                const predicate = expandQName(child.tagName);
                const resource = child.getAttribute('rdf:resource');
                const nodeID = child.getAttribute('rdf:nodeID');
                const datatype = child.getAttribute('rdf:datatype');

                let object = '';
                if (resource) {
                    object = resource;
                } else if (nodeID) {
                    object = `_:${nodeID}`;
                } else {
                    object = child.textContent || '';
                    if (datatype) {
                        object = `"${object}"^^${expandQName(datatype)}`;
                    }
                }

                if (predicate && object) {
                    triples.push({subject, predicate, object});
                }

                // Recursively process nested elements
                processElement(child, {baseURI: context.baseURI});
            });
        };

        // Find base URI if present
        const baseURI = doc.documentElement.getAttribute('xml:base') || '';

        // Process all elements
        const allElements = doc.getElementsByTagName('*');
        Array.from(allElements).forEach(element => {
            if (element !== doc.documentElement) {
                processElement(element, {baseURI});
            }
        });

        return triples;
    } catch (error) {
        console.error('Error parsing RDF/XML:', error);
        throw new Error('Invalid RDF/XML format');
    }
}

function parseNTriples(content: string): Triple[] {
    const triples: Triple[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^<([^>]*)>\s*<([^>]*)>\s*<([^>]*)>\s*\./);
        if (match) {
            triples.push({
                subject: match[1],
                predicate: match[2],
                object: match[3]
            });
        }
    }

    return triples;
}

function parseTurtle(content: string): Triple[] {
    try {
        // Check if rdflib is available
        if (!$rdf || !$rdf.graph || !$rdf.parse) {
            // Fallback to manual parsing if rdflib is not available
            return fallbackParseTurtle(content);
        }

        // Create a new RDF store
        const store = $rdf.graph();

        try {
            // Parse the Turtle content directly
            $rdf.parse(content, store, 'http://example.org/', 'text/turtle');

            // Extract triples from the store
            const triples: Triple[] = [];

            // Get all statements from the store
            const statements = store.statementsMatching(null, null, null, null);

            // Convert each statement to our Triple format
            statements.forEach(statement => {
                try {
                    let subject = statement.subject.value;
                    let predicate = statement.predicate.value;
                    let object = statement.object.value;

                    // Handle blank nodes
                    if (statement.subject.termType === 'BlankNode') {
                        subject = `_:${subject}`;
                    }

                    if (statement.object.termType === 'BlankNode') {
                        object = `_:${object}`;
                    }

                    // Handle literals with language or datatype
                    if (statement.object.termType === 'Literal') {
                        if (statement.object.language) {
                            object = `"${object}"@${statement.object.language}`;
                        } else if (statement.object.datatype) {
                            object = `"${object}"^^${statement.object.datatype.value}`;
                        } else {
                            object = `"${object}"`;
                        }
                    }

                    triples.push({ subject, predicate, object });
                } catch (statementError) {
                    console.warn('Error processing statement:', statementError);
                    // Continue with next statement
                }
            });

            if (triples.length === 0) {
                // If no triples were found with rdflib, try the fallback parser
                return fallbackParseTurtle(content);
            }

            return triples;
        } catch (parseError) {
            console.warn('Error using rdflib parser:', parseError);
            // Fallback to manual parsing if rdflib parsing fails
            return fallbackParseTurtle(content);
        }
    } catch (error) {
        console.error('Error in parseTurtle:', error);

        // Provide a detailed error message
        if (error instanceof Error) {
            throw new Error(`Failed to parse Turtle: ${error.message}`);
        } else {
            throw new Error('Failed to parse Turtle: Unknown error');
        }
    }
}

// Fallback parser for when rdflib is not available or fails
function fallbackParseTurtle(content: string): Triple[] {
    const triples: Triple[] = [];
    const prefixes: { [key: string]: string } = {
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'owl': 'http://www.w3.org/2002/07/owl#',
        'xsd': 'http://www.w3.org/2001/XMLSchema#'
    };

    try {
        // Remove comments and normalize whitespace
        const cleanContent = content
            .split('\n')
            .map(line => line.split('#')[0].trim())
            .filter(Boolean)
            .join(' ');

        // Extract prefix declarations
        const prefixRegex = /@prefix\s+(\w*:)\s*<([^>]*)>/g;
        let prefixMatch;
        while ((prefixMatch = prefixRegex.exec(cleanContent)) !== null) {
            prefixes[prefixMatch[1]] = prefixMatch[2];
        }

        // Simple triple extraction for basic Turtle syntax
        // This is a simplified parser that handles basic cases
        const tripleRegex = /([^\s]+)\s+([^\s]+)\s+([^.]+)\s*\./g;
        let tripleMatch;

        while ((tripleMatch = tripleRegex.exec(cleanContent)) !== null) {
            try {
                let subject = tripleMatch[1];
                let predicate = tripleMatch[2];
                let object = tripleMatch[3].trim();

                // Handle URIs
                if (subject.startsWith('<') && subject.endsWith('>')) {
                    subject = subject.slice(1, -1);
                }

                if (predicate.startsWith('<') && predicate.endsWith('>')) {
                    predicate = predicate.slice(1, -1);
                }

                if (object.startsWith('<') && object.endsWith('>')) {
                    object = object.slice(1, -1);
                }

                // Handle prefixed names
                if (subject.includes(':') && !subject.startsWith('<')) {
                    const [prefix, local] = subject.split(':');
                    if (prefixes[prefix + ':']) {
                        subject = prefixes[prefix + ':'] + local;
                    }
                }

                if (predicate.includes(':') && !predicate.startsWith('<')) {
                    const [prefix, local] = predicate.split(':');
                    if (prefixes[prefix + ':']) {
                        predicate = prefixes[prefix + ':'] + local;
                    }
                }

                if (object.includes(':') && !object.startsWith('<') && !object.startsWith('"')) {
                    const [prefix, local] = object.split(':');
                    if (prefixes[prefix + ':']) {
                        object = prefixes[prefix + ':'] + local;
                    }
                }

                triples.push({ subject, predicate, object });
            } catch (tripleError) {
                console.warn('Error processing triple:', tripleError);
                // Continue with next triple
            }
        }

        // If we couldn't extract any triples, try a more basic approach
        if (triples.length === 0) {
            // Split by periods and try to extract simple triples
            const statements = cleanContent.split('.');
            for (const stmt of statements) {
                const parts = stmt.trim().split(/\s+/);
                if (parts.length >= 3) {
                    const subject = parts[0];
                    const predicate = parts[1];
                    const object = parts.slice(2).join(' ');

                    if (subject && predicate && object) {
                        triples.push({ subject, predicate, object });
                    }
                }
            }
        }

        return triples;
    } catch (error) {
        console.error('Error in fallback Turtle parser:', error);

        // Create some basic triples from the content to avoid complete failure
        const lines = content.split('\n').filter(Boolean);
        for (const line of lines) {
            const words = line.trim().split(/\s+/);
            if (words.length >= 3) {
                triples.push({
                    subject: words[0],
                    predicate: words[1],
                    object: words.slice(2).join(' ')
                });
            }
        }

        return triples;
    }
}

function parseCSV(content: string): Triple[] {
    const lines = content.split('\n').filter(Boolean);
    return lines.map(line => {
        const [subject, predicate, object] = line.split(',').map(s => s.trim());
        if (!subject || !predicate || !object) {
            throw new Error('Invalid triple format');
        }
        return {subject, predicate, object};
    });
}

// Helper function to process items in chunks
async function processInChunks<T, R>(
    items: T[],
    chunkSize: number,
    processor: (chunk: T[]) => Promise<R[]>
): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const chunkResults = await processor(chunk);
        results.push(...chunkResults);
        // Allow other tasks to run
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    return results;
}

// Helper function to extract line number from error message
function extractLineNumber(errorMessage: string): number | null {
    const lineMatch = errorMessage.match(/Line (\d+)/);
    if (lineMatch && lineMatch[1]) {
        return parseInt(lineMatch[1], 10);
    }
    return null;
}

// Helper function to extract problematic content around a line
function extractProblemContent(content: string, lineNumber: number, context: number = 2): string {
    if (!lineNumber) return '';

    const lines = content.split('\n');
    const start = Math.max(0, lineNumber - context - 1);
    const end = Math.min(lines.length, lineNumber + context);

    return lines.slice(start, end).map((line, i) => {
        const currentLineNumber = start + i + 1;
        const prefix = currentLineNumber === lineNumber ? '> ' : '  ';
        return `${prefix}${currentLineNumber}: ${line}`;
    }).join('\n');
}

// Helper function to get a user-friendly error message
function getUserFriendlyErrorMessage(error: Error, content: string): string {
    const errorMessage = error.message;

    // Check for common error patterns
    if (errorMessage.includes('EOF found in middle of path syntax')) {
        const lineNumber = extractLineNumber(errorMessage);
        const problemContent = lineNumber ? extractProblemContent(content, lineNumber) : '';

        return `Syntax error: Unexpected end of file in the middle of a URI path (line ${lineNumber}).\n` +
               `This often happens when a URI is not properly closed with '>'\n\n` +
               `Problem area:\n${problemContent}\n\n` +
               `Suggestion: Check for unclosed URI brackets '<' or incomplete statements.`;
    }

    if (errorMessage.includes('Missing subject in triple')) {
        return 'Error: Missing subject in triple. Each statement must start with a valid subject.\n' +
               'Suggestion: Ensure each statement begins with a URI, blank node, or prefixed name.';
    }

    if (errorMessage.includes('Bad syntax')) {
        const lineNumber = extractLineNumber(errorMessage);
        const problemContent = lineNumber ? extractProblemContent(content, lineNumber) : '';

        return `Syntax error at line ${lineNumber}:\n` +
               `${problemContent}\n\n` +
               `Suggestion: Check for missing periods, incorrect prefixes, or malformed URIs.`;
    }

    // Default detailed message
    return `Error parsing file: ${errorMessage}`;
}

// Update the main entry point
export async function parseTriplesFile(content: string): Promise<Triple[]> {
    try {
        const trimmedContent = content.trim();

        // Helper function to check if content matches a format
        const isFormat = {
            jsonld: () => {
                try {
                    const firstChar = trimmedContent[0];
                    return firstChar === '{' || firstChar === '[';
                } catch {
                    return false;
                }
            },
            rdf: () => trimmedContent.includes('<?xml') ||
                trimmedContent.includes('<rdf:RDF') ||
                trimmedContent.includes('xmlns:rdf='),
            ntriples: () => /^<[^>]+>\s+<[^>]+>\s+<[^>]+>\s*\./m.test(trimmedContent),
            turtle: () => {
                const hasTurtleMarkers = trimmedContent.includes('@prefix') ||
                    trimmedContent.includes('@base') ||
                    /^(?:[a-zA-Z][\w-]*:)?[a-zA-Z][\w-]*\s+[a-zA-Z][\w-]*:/.test(trimmedContent) ||
                    /<[^>]+>\s+(?:a|<[^>]+>)\s+[^.]+\s*\./.test(trimmedContent);

                return hasTurtleMarkers;
            }
        };

        // Try to detect format and parse accordingly
        let result: Triple[] = [];
        let formatDetected = false;
        let errors: Error[] = [];

        // Try each parser in sequence, collecting errors but continuing if one fails
        if (isFormat.jsonld()) {
            formatDetected = true;
            try {
                result = await parseJsonLD(content);
                return result; // Return immediately if successful
            } catch (error) {
                if (error instanceof Error) errors.push(error);
                console.warn('JSON-LD parsing failed, trying other formats');
            }
        }

        if (isFormat.rdf()) {
            formatDetected = true;
            try {
                result = parseRDF(content);
                return result; // Return immediately if successful
            } catch (error) {
                if (error instanceof Error) errors.push(error);
                console.warn('RDF/XML parsing failed, trying other formats');
            }
        }

        if (isFormat.turtle() || !formatDetected) {
            formatDetected = true;
            try {
                result = parseTurtle(content);
                return result; // Return immediately if successful
            } catch (error) {
                if (error instanceof Error) errors.push(error);
                console.warn('Turtle parsing failed, trying fallback');

                // Try fallback parser directly
                try {
                    result = fallbackParseTurtle(content);
                    if (result.length > 0) {
                        console.log('Fallback parser succeeded with', result.length, 'triples');
                        return result;
                    }
                } catch (fallbackError) {
                    if (fallbackError instanceof Error) errors.push(fallbackError);
                    console.warn('Fallback parser also failed');
                }
            }
        }

        if (isFormat.ntriples()) {
            formatDetected = true;
            try {
                result = parseNTriples(content);
                return result; // Return immediately if successful
            } catch (error) {
                if (error instanceof Error) errors.push(error);
                console.warn('N-Triples parsing failed, trying other formats');
            }
        }

        // Try to determine format from content patterns as a last resort
        const lines = trimmedContent.split('\n').filter(line => !line.trim().startsWith('#'));
        if (lines.some(line => line.includes(',') && line.split(',').length === 3)) {
            try {
                result = parseCSV(content);
                if (result.length > 0) return result;
            } catch (error) {
                if (error instanceof Error) errors.push(error);
                console.warn('CSV parsing failed');
            }
        }

        // If we got here, all parsing attempts failed
        if (errors.length > 0) {
            // Get the most informative error
            const mainError = errors[0];
            const userFriendlyMessage = getUserFriendlyErrorMessage(mainError, content);
            throw new Error(userFriendlyMessage);
        } else {
            throw new Error('Failed to parse file. The format could not be determined or is not supported.');
        }
    } catch (error: unknown) {
        console.error('Error parsing file:', error);

        // Provide more specific error messages based on the error
        if (error instanceof Error) {
            // The error message should already be user-friendly from getUserFriendlyErrorMessage
            throw error;
        } else {
            throw new Error('Failed to parse file. Please check if the file format is correct.');
        }
    }
}

// Helper function to check if a string is a comment or long text
function isCommentOrLongText(text: string): boolean {
    // Check if it's a comment (starts with # or //)
    if (text.startsWith('#') || text.startsWith('//')) {
        return true;
    }

    // Check if it's a long text (more than 100 characters)
    if (text.length > 100) {
        return true;
    }

    // Check if it contains common description predicates
    const descriptionPredicates = [
        'comment', 'description', 'label', 'title', 'abstract',
        'note', 'definition', 'example', 'documentation'
    ];

    // If the text contains any of these words, it's likely a description
    return descriptionPredicates.some(word =>
        text.toLowerCase().includes(word)
    );
}

// Helper function to truncate long labels
function truncateLabel(label: string, maxLength: number = 30): string {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength) + '...';
}

export async function triplesToGraphData(triples: Triple[]): Promise<GraphData> {
    // Filter out triples with comments or long text
    const filteredTriples = triples.filter(triple => {
        // Skip triples with comment predicates
        if (isCommentOrLongText(triple.predicate)) {
            return false;
        }

        // Skip triples with very long object values (likely descriptions)
        if (typeof triple.object === 'string' && triple.object.length > 100) {
            return false;
        }

        return true;
    });

    // For small datasets (less than 10k triples), process synchronously
    if (filteredTriples.length < 10000) {
        const nodesMap = new Map<string, GraphNode>();
        const rootNode = filteredTriples.length > 0 ? filteredTriples[0].subject : triples[0].subject;

        // Add all nodes with visibility set to true by default
        filteredTriples.forEach(triple => {
            if (!nodesMap.has(triple.subject)) {
                nodesMap.set(triple.subject, {
                    id: triple.subject,
                    label: truncateLabel(triple.subject),
                    type: 'subject',
                    expanded: triple.subject === rootNode,
                    visible: true, // Make all subject nodes visible by default
                    index: nodesMap.size
                });
            }
            if (!nodesMap.has(triple.object)) {
                nodesMap.set(triple.object, {
                    id: triple.object,
                    label: truncateLabel(triple.object),
                    type: 'object',
                    expanded: false,
                    visible: true, // Make all object nodes visible by default
                    index: nodesMap.size
                });
            }
        });

        // Create links with all visible by default
        const links = filteredTriples.map(triple => ({
            source: triple.subject,
            target: triple.object,
            label: truncateLabel(triple.predicate, 15),
            visible: true // Make all links visible by default
        }));

        return {
            nodes: Array.from(nodesMap.values()),
            links,
            metadata: {
                totalNodes: nodesMap.size,
                totalLinks: links.length,
                visibleNodes: nodesMap.size, // All nodes are visible
                maxVisibleNodes: 50,
                hasMore: nodesMap.size > 50,
                processedTriples: filteredTriples.length,
                filteredOutTriples: triples.length - filteredTriples.length
            }
        };
    }

    // For large datasets, use web worker
    const worker = new Worker(new URL('../workers/tripleProcessor.ts', import.meta.url));
    const BATCH_SIZE = 50000;
    const totalTriples = triples.length;
    let processedNodes = new Map<string, GraphNode>();
    let processedLinks: Link[] = [];
    let startIndex = 0;

    return new Promise((resolve, reject) => {
        worker.onmessage = (e: MessageEvent) => {
            const {type, data} = e.data;

            if (type === 'progress') {
                const progress = (data.processedTriples / data.totalTriples) * 100;
                console.log(`Processing: ${progress.toFixed(1)}%`);
            } else if (type === 'complete') {
                data.nodes.forEach(([id, node]: [string, GraphNode]) => {
                    processedNodes.set(id, node);
                });
                processedLinks = processedLinks.concat(data.links);

                startIndex += BATCH_SIZE;
                if (startIndex < totalTriples) {
                    const nextBatch = triples.slice(startIndex, startIndex + BATCH_SIZE);
                    worker.postMessage({
                        triples: nextBatch,
                        startIndex,
                        totalTriples
                    });
                } else {
                    worker.terminate();
                    resolve({
                        nodes: Array.from(processedNodes.values()),
                        links: processedLinks,
                        metadata: {
                            totalNodes: processedNodes.size,
                            totalLinks: processedLinks.length,
                            visibleNodes: data.metadata.visibleNodes,
                            maxVisibleNodes: 50,
                            hasMore: true,
                            processedTriples: totalTriples
                        }
                    });
                }
            }
        };

        worker.onerror = (error) => {
            console.error('Worker error:', error);
            reject(error);
        };

        // Start processing with first batch
        const firstBatch = triples.slice(0, BATCH_SIZE);
        worker.postMessage({
            triples: firstBatch,
            startIndex: 0,
            totalTriples
        });
    });
}

export async function getSampleTriples(): Promise<Triple[]> {
    try {
        const response = await fetch('/default-triple.jsonld');
        if (!response.ok) {
            throw new Error('Failed to fetch sample triples');
        }
        const content = await response.text();
        return await parseJsonLD(content);
    } catch (error) {
        console.error('Error loading sample triples:', error);
        // Fallback to default triples if file loading fails
        return [
            {
                subject: "Albert Einstein",
                predicate: "developed",
                object: "Theory of Relativity"
            },
            {
                subject: "Theory of Relativity",
                predicate: "describes",
                object: "Spacetime"
            },
            {
                subject: "Albert Einstein",
                predicate: "won",
                object: "Nobel Prize"
            },
            {
                subject: "Nobel Prize",
                predicate: "awarded in",
                object: "1921"
            }
            // ... fallback triples
        ];
    }
}

export async function extractTriplesFromPDF(file: File): Promise<Triple[]> {
    try {
        const text = await file.text();
        const sentences = text.split(/[.!?]+/).filter(Boolean);
        const triples: Triple[] = [];

        for (const sentence of sentences) {
            const words = sentence.trim().split(/\s+/);
            if (words.length >= 3) {
                triples.push({
                    subject: words[0],
                    predicate: words[1],
                    object: words.slice(2).join(' ')
                });
            }
        }

        return triples;
    } catch (error) {
        console.error('Error processing PDF:', error);
        throw new Error('Failed to process PDF file');
    }
}
