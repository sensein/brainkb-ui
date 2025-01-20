import {Triple, GraphData, Node as GraphNode, Link} from '../types';

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

async function* parseJsonLDChunked(content: string, chunkSize = 1000): AsyncGenerator<Triple[]> {
    try {
        const jsonld = JSON.parse(content);
        const items = jsonld['@graph'] || (Array.isArray(jsonld) ? jsonld : [jsonld]);
        let currentChunk: Triple[] = [];

        for (const item of items) {
            if (!item) continue;

            // Process each item
            const processItem = (item: any) => {
                const triples: Triple[] = [];
                const subject = item['@id'] || item.id;
                if (!subject) return triples;

                // Handle @type
                if (item['@type']) {
                    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
                    types.forEach(type => {
                        triples.push({subject, predicate: 'type', object: type});
                    });
                }

                // Process properties
                Object.entries(item).forEach(([key, value]) => {
                    if (key.startsWith('@')) return;

                    const processValue = (val: any) => {
                        if (typeof val === 'object' && val !== null) {
                            if ('@value' in val) return String(val['@value']);
                            if ('@id' in val) return val['@id'];
                            if ('id' in val) return val.id;
                            return JSON.stringify(val);
                        }
                        return String(val);
                    };

                    if (Array.isArray(value)) {
                        value.forEach(v => {
                            triples.push({
                                subject,
                                predicate: key,
                                object: processValue(v)
                            });
                        });
                    } else if (value !== null && value !== undefined) {
                        triples.push({
                            subject,
                            predicate: key,
                            object: processValue(value)
                        });
                    }
                });

                return triples;
            };

            // Process item and add to current chunk
            const itemTriples = processItem(item);
            currentChunk.push(...itemTriples);

            // If chunk is full, yield it
            if (currentChunk.length >= chunkSize) {
                yield currentChunk;
                currentChunk = [];
            }
        }

        // Yield any remaining triples
        if (currentChunk.length > 0) {
            yield currentChunk;
        }
    } catch (error) {
        console.error('Error parsing JSON-LD:', error);
        throw new Error('Invalid JSON-LD format');
    }
}

async function parseJsonLD(content: string): Promise<Triple[]> {
    const allTriples: Triple[] = [];
    try {
        for await (const chunk of parseJsonLDChunked(content)) {
            allTriples.push(...chunk);
        }
        return allTriples;
    } catch (error) {
        console.error('Error in parseJsonLD:', error);
        throw error;
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
    const triples: Triple[] = [];
    const prefixes: { [key: string]: string } = {
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'owl': 'http://www.w3.org/2002/07/owl#',
        'xsd': 'http://www.w3.org/2001/XMLSchema#'
    };

    // Remove comments and normalize whitespace
    const cleanContent = content
        .split('\n')
        .map(line => line.split('#')[0].trim())
        .filter(Boolean)
        .join('\n');

    // Parse prefix declarations
    const prefixRegex = /@prefix\s+(\w*:)\s*<([^>]*)>/g;
    let match;
    while ((match = prefixRegex.exec(cleanContent)) !== null) {
        prefixes[match[1]] = match[2];
    }

    // Helper function to resolve URIs and handle prefixed names
    const resolveURI = (term: string): string => {
        try {
            if (term.startsWith('<')) {
                return term.slice(1, -1);
            }
            if (term === 'a') {
                return prefixes['rdf'] + 'type';
            }
            if (term.includes(':')) {
                const [prefix, ...rest] = term.split(':');
                const local = rest.join(':');  // Handle cases where local part contains colons
                if (prefix && local && prefixes[prefix + ':']) {
                    return prefixes[prefix + ':'] + local;
                }
                // If not a known prefix but looks like a valid URI, return as is
                if (/^[a-zA-Z][\w-]*:/.test(term)) {
                    return term;
                }
            }
            return term;
        } catch (error) {
            console.error('Error resolving URI:', {term, error});
            return term;  // Return original term if resolution fails
        }
    };

    // Helper function to parse literal values
    const parseLiteral = (literal: string): string => {
        const literalRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"(?:@(\w+)|^^<([^>]+)>)?/;
        const match = literal.match(literalRegex);
        if (match) {
            const value = match[1].replace(/\\"/g, '"');
            if (match[3]) { // datatype
                return `"${value}"^^${match[3]}`;
            }
            if (match[2]) { // language tag
                return `"${value}"@${match[2]}`;
            }
            return value;
        }
        return literal;
    };

    // Process the content
    let currentContent = cleanContent.replace(/@prefix[^\n]+\n/g, '');
    let blankNodeCounter = 0;

    // Helper function to generate blank node identifiers
    const generateBlankNodeId = () => `_:b${blankNodeCounter++}`;

    // Helper function to process a statement block
    const processStatement = (stmt: string, defaultSubject?: string) => {
        try {
            // Pre-process statement to handle special cases
            stmt = stmt
                .replace(/\s+/g, ' ')  // Normalize whitespace
                .replace(/\s*;\s*/g, ' ; ')  // Normalize semicolons
                .replace(/\s*,\s*/g, ' , ')  // Normalize commas
                .replace(/\s*\[\s*/g, ' [ ')  // Normalize brackets
                .replace(/\s*\]\s*/g, ' ] ')
                .trim();

            const parts = stmt.split(' ');
            let currentSubject = defaultSubject;
            let currentPredicate = '';
            let buffer = '';
            let inQuotes = false;
            let bracketDepth = 0;
            let parenDepth = 0;
            let lastToken = '';

            const addTriple = (obj: string) => {
                try {
                    if (!currentSubject) {
                        throw new Error('Missing subject in triple');
                    }
                    if (!currentPredicate) {
                        throw new Error('Missing predicate in triple');
                    }
                    if (!obj) {
                        throw new Error('Missing object in triple');
                    }

                    const object = obj.startsWith('"') ? parseLiteral(obj) : resolveURI(obj);
                    triples.push({
                        subject: currentSubject,
                        predicate: currentPredicate,
                        object
                    });
                } catch (error) {
                    console.error('Error adding triple:', error);
                    console.error('Current state:', {currentSubject, currentPredicate, obj});
                    throw error;
                }
            };

            const handleBlankNode = (startIndex: number): [string, number] => {
                let depth = 1;
                let endIndex = startIndex + 1;
                let nodeContent = '';

                while (endIndex < parts.length && depth > 0) {
                    if (parts[endIndex] === '[') depth++;
                    if (parts[endIndex] === ']') depth--;
                    if (depth > 0) nodeContent += ' ' + parts[endIndex];
                    endIndex++;
                }

                const blankNodeId = generateBlankNodeId();
                if (nodeContent.trim()) {
                    processStatement(nodeContent.trim(), blankNodeId);
                }

                return [blankNodeId, endIndex];
            };

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];

                // Skip empty parts
                if (!part) continue;

                // Handle quoted strings
                if (part.includes('"')) {
                    if (!inQuotes) {
                        if (part.split('"').length % 2 === 0) {
                            inQuotes = true;
                        }
                        buffer = part;
                    } else {
                        buffer += ' ' + part;
                        if (part.endsWith('"') && !part.endsWith('\\"')) {
                            inQuotes = false;
                            if (!currentPredicate) {
                                currentPredicate = buffer;
                            } else {
                                addTriple(buffer);
                                buffer = '';
                            }
                        }
                    }
                    lastToken = part;
                    continue;
                }

                if (inQuotes) {
                    buffer += ' ' + part;
                    continue;
                }

                // Handle brackets and parentheses
                if (part === '[') {
                    const [blankNodeId, newIndex] = handleBlankNode(i);
                    i = newIndex - 1;
                    if (!currentPredicate) {
                        currentSubject = blankNodeId;
                    } else {
                        addTriple(blankNodeId);
                    }
                    lastToken = ']';
                    continue;
                }

                // Process normal parts
                switch (part) {
                    case 'a':
                        currentPredicate = prefixes['rdf'] + 'type';
                        break;
                    case ';':
                        if (buffer) {
                            addTriple(buffer);
                            buffer = '';
                        }
                        currentPredicate = '';
                        break;
                    case ',':
                        if (buffer) {
                            addTriple(buffer);
                            buffer = '';
                        }
                        break;
                    default:
                        if (!currentSubject) {
                            currentSubject = resolveURI(part);
                        } else if (!currentPredicate) {
                            currentPredicate = resolveURI(part);
                        } else {
                            if (buffer) buffer += ' ';
                            buffer += part;
                        }
                }

                lastToken = part;
            }

            // Handle any remaining buffer
            if (buffer) {
                addTriple(buffer);
            }
        } catch (error: unknown) {
            console.error('Error processing statement:', stmt);
            console.error('Error details:', error);
            if (error instanceof Error) {
                throw new Error(`Failed to parse Turtle statement: ${error.message}`);
            } else {
                throw new Error('Failed to parse Turtle statement: Unknown error');
            }
        }
    };

    // Split into statements and process each
    const statements = currentContent.split(/\s*\.\s*/).filter(Boolean);
    statements.forEach(stmt => processStatement(stmt));

    return triples;
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
        if (isFormat.jsonld()) {
            return await parseJsonLD(content);
        } else if (isFormat.rdf()) {
            return parseRDF(content);
        } else if (isFormat.turtle()) {
            return parseTurtle(content);
        } else if (isFormat.ntriples()) {
            return parseNTriples(content);
        }

        // Try to determine format from content patterns
        const lines = trimmedContent.split('\n').filter(line => !line.trim().startsWith('#'));
        if (lines.some(line => line.includes(';') && line.includes('<'))) {
            return parseTurtle(content);
        }
        if (lines.some(line => line.includes(',') && line.split(',').length === 3)) {
            return parseCSV(content);
        }

        // Default to Turtle as it's the most flexible format
        return parseTurtle(content);
    } catch (error) {
        console.error('Error parsing file:', error);
        throw new Error('Failed to parse file. Please check if the file format is correct.');
    }
}

export async function triplesToGraphData(triples: Triple[]): Promise<GraphData> {
    // For small datasets (less than 10k triples), process synchronously
    if (triples.length < 10000) {
        const nodesMap = new Map<string, GraphNode>();
        const rootNode = triples[0].subject;

        // Add all nodes
        triples.forEach(triple => {
            if (!nodesMap.has(triple.subject)) {
                nodesMap.set(triple.subject, {
                    id: triple.subject,
                    label: triple.subject,
                    type: 'subject',
                    expanded: triple.subject === rootNode,
                    visible: triple.subject === rootNode,
                    index: nodesMap.size
                });
            }
            if (!nodesMap.has(triple.object)) {
                nodesMap.set(triple.object, {
                    id: triple.object,
                    label: triple.object,
                    type: 'object',
                    expanded: false,
                    visible: false,
                    index: nodesMap.size
                });
            }
        });

        // Make immediate connections from root visible
        const rootConnections = triples
            .filter(triple => triple.subject === rootNode)
            .slice(0, 50);

        rootConnections.forEach(triple => {
            const node = nodesMap.get(triple.object);
            if (node) {
                node.visible = true;
            }
        });

        const links = triples.map(triple => ({
            source: triple.subject,
            target: triple.object,
            label: triple.predicate,
            visible: triple.subject === rootNode
        }));

        return {
            nodes: Array.from(nodesMap.values()),
            links,
            metadata: {
                totalNodes: nodesMap.size,
                totalLinks: links.length,
                visibleNodes: rootConnections.length + 1,
                maxVisibleNodes: 50,
                hasMore: triples.filter(t => t.subject === rootNode).length > 50,
                processedTriples: triples.length
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

// export const sampleTriples: Triple[] = [
//   {
//     subject: "Albert Einstein",
//     predicate: "developed",
//     object: "Theory of Relativity"
//   },
//   {
//     subject: "Theory of Relativity",
//     predicate: "describes",
//     object: "Spacetime"
//   },
//   {
//     subject: "Albert Einstein",
//     predicate: "won",
//     object: "Nobel Prize"
//   },
//   {
//     subject: "Nobel Prize",
//     predicate: "awarded in",
//     object: "1921"
//   }
// ];

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
