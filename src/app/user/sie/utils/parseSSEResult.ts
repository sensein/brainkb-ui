/**
 * Utility functions for parsing SSE (Server-Sent Events) stream results from the NER extraction API.
 * 
 * This module handles the complex and defensive parsing logic required due to inconsistent
 * backend API response structures. The backend may return NER data in various formats:
 * 
 * - New format: { judge_ner_terms: { "1": [...], "2": [...] } }
 * - Old format: { entities: { "EntityType": [...] } }
 * - Wrapped formats: { data: { judge_ner_terms: {...} } }
 * - Nested formats: { judged_structured_information: { judge_ner_terms: {...} } }
 * - String formats: JSON strings that need parsing
 * 
 * The parsing logic attempts to find the data in all these possible locations.
 */

/**
 * Result structure for parsed NER data.
 * Can be in either the new format (judge_ner_terms) or old format (entities).
 */
export interface ParsedNERResult {
    /** New format: NER data with judge_ner_terms structure */
    judge_ner_terms?: Record<string, any[]>;
    /** Old format: NER data with entities structure */
    entities?: Record<string, any[]>;
}

/**
 * Attempts to parse JSON from various source types.
 * Handles both string JSON and already-parsed objects.
 * 
 * @param source - The data source to parse (can be string, object, or null/undefined)
 * @param sourceName - Name of the source for logging purposes
 * @returns Parsed object if successful, null otherwise
 */
function tryParseJSON(source: any, sourceName: string): any {
    if (!source) return null;
    
    // If already an object, return as-is
    if (typeof source === 'object' && source !== null) {
        return source;
    }
    
    // If string, try to parse as JSON
    if (typeof source === 'string') {
        const trimmed = source.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                return parsed;
            } catch (e) {
                console.error(`Failed to parse ${sourceName} as JSON:`, e);
                return null;
            }
        }
    }
    
    return null;
}

/**
 * Recursively searches an object for NER data structures.
 * Looks for judge_ner_terms, judged_structured_information, or entities properties.
 * 
 * @param obj - The object to search
 * @param path - Current path in the object hierarchy (for logging)
 * @returns Object containing NER data if found, null otherwise
 */
function findNERData(obj: any, path: string = 'root'): ParsedNERResult | null {
    if (!obj || typeof obj !== 'object') return null;
    
    // Check for direct judge_ner_terms property (new format)
    if (obj.judge_ner_terms) {
        return obj;
    }
    
    // Handle judged_structured_information - it may contain judge_ner_terms inside
    if (obj.judged_structured_information) {
        console.info(`Found judged_structured_information at ${path}`);
        
        // Check if it has judge_ner_terms inside
        if (obj.judged_structured_information.judge_ner_terms) {
            console.info(`Found judge_ner_terms inside judged_structured_information at ${path}`);
            return {
                judge_ner_terms: obj.judged_structured_information.judge_ner_terms
            };
        }
        
        // If judged_structured_information itself is the judge_ner_terms structure
        // (has numeric string keys with arrays as values)
        if (typeof obj.judged_structured_information === 'object' && !Array.isArray(obj.judged_structured_information)) {
            const keys = Object.keys(obj.judged_structured_information);
            if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
                return {
                    judge_ner_terms: obj.judged_structured_information
                };
            }
        }
    }
    
    // Check for entities property (old format)
    if (obj.entities) {
        console.info(`Found entities at ${path}`);
        return obj;
    }
    
    // Recursively search nested objects
    for (const key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
            const found = findNERData(obj[key], `${path}.${key}`);
            if (found) return found;
        }
    }
    
    return null;
}

/**
 * Normalizes parsed data to handle judged_structured_information structures.
 * Extracts judge_ner_terms from nested judged_structured_information if needed.
 * 
 * @param parsedData - The parsed data that may contain judged_structured_information
 * @returns Normalized data with judge_ner_terms at the top level
 */
function normalizeJudgedStructuredInformation(parsedData: any): ParsedNERResult | null {
    if (!parsedData || !parsedData.judged_structured_information) {
        return parsedData;
    }

    
    // Check if judged_structured_information contains judge_ner_terms
    if (parsedData.judged_structured_information.judge_ner_terms) {
        return {
            judge_ner_terms: parsedData.judged_structured_information.judge_ner_terms
        };
    }
    
    // If judged_structured_information itself looks like judge_ner_terms structure
    // (has numeric string keys with arrays as values)
    if (!parsedData.judge_ner_terms) {
        const keys = Object.keys(parsedData.judged_structured_information);
        if (keys.length > 0) {
            const firstKey = keys[0];
            const firstValue = parsedData.judged_structured_information[firstKey];
            // Check if keys are numeric and values are arrays
            if (/^\d+$/.test(firstKey) && Array.isArray(firstValue)) {
                return {
                    judge_ner_terms: parsedData.judged_structured_information
                };
            }
        }
    }
    
    return parsedData;
}

/**
 * Main function to parse SSE result data from the NER extraction API.
 * 
 * This function attempts to find NER data in the result using multiple strategies:
 * 1. Recursive search through the entire result object
 * 2. Checking specific known paths where data might be located
 * 3. Parsing JSON strings found in message fields
 * 4. Normalizing judged_structured_information structures
 * 
 * @param result - The raw result object from the SSE stream
 * @returns Parsed NER data in either new format (judge_ner_terms) or old format (entities), or null if not found
 */
export function parseSSEResult(result: any): ParsedNERResult | null {
    if (!result) {
        return null;
    }

    
    let parsedData: ParsedNERResult | null = null;
    
    // Strategy 1: Try to find NER data recursively in the result
    parsedData = findNERData(result, 'result');
    
    // Strategy 2: If not found recursively, try specific known paths
    if (!parsedData) {
        const sources = [
            { data: result.data, name: 'result.data' },
            { data: result.message, name: 'result.message' },
            { data: result.data?.message, name: 'result.data.message' },
            { data: result.data?.data, name: 'result.data.data' },
            { data: result.entities, name: 'result.entities' },
            { data: result.data?.entities, name: 'result.data.entities' },
            { data: result.judge_ner_terms, name: 'result.judge_ner_terms' },
            { data: result.data?.judge_ner_terms, name: 'result.data.judge_ner_terms' },
            { data: result.judged_structured_information, name: 'result.judged_structured_information' },
            { data: result.data?.judged_structured_information, name: 'result.data.judged_structured_information' },
            { data: result, name: 'result' }
        ];
        
        for (const source of sources) {
            const parsed = tryParseJSON(source.data, source.name);
            if (parsed) {
                
                // Check if this parsed data has NER structure
                const nerData = findNERData(parsed, source.name);
                if (nerData) {
                    parsedData = nerData;
                    break;
                }
                
                // Also check if there's a message field that contains JSON
                if (typeof parsed === 'object' && parsed.message && typeof parsed.message === 'string') {
                    try {
                        const messageParsed = JSON.parse(parsed.message);
                        const nerDataInMessage = findNERData(messageParsed, `${source.name}.message`);
                        if (nerDataInMessage) {
                            parsedData = nerDataInMessage;
                            break;
                        }
                    } catch (e) {
                        console.error(`Failed to parse message field as JSON:`, e);
                    }
                }
            }
        }
    }
    
    // Strategy 3: Normalize judged_structured_information structures
    if (parsedData) {
        parsedData = normalizeJudgedStructuredInformation(parsedData);
    }
    
    // Strategy 4: Check for nested structures in the original result
    if (!parsedData || !parsedData.judge_ner_terms) {
        if (result.judged_structured_information?.judge_ner_terms) {
            parsedData = {
                judge_ner_terms: result.judged_structured_information.judge_ner_terms
            };
        } else if (result.data?.judged_structured_information?.judge_ner_terms) { 
            parsedData = {
                judge_ner_terms: result.data.judged_structured_information.judge_ner_terms
            };
        }
    }
    
    return parsedData;
}

