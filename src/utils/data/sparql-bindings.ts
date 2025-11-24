/**
 * SPARQL binding utilities
 * Consolidated from helper.tsx
 */

export interface NormalizeSparqlBindingsOptions {
  shape?: 'object' | 'rows';
  replaceUnderscoreWithSpace?: boolean;
  multiRowStrategy?: 'first' | 'merge';
}

interface SparqlBinding {
  [key: string]: {
    value: string;
    type?: string;
    datatype?: string;
    [key: string]: unknown;
  };
}

const DEFAULT_BINDING_OPTIONS = {
  replaceUnderscoreWithSpace: true,
};

function bindingEntryToValue(entry: unknown): string | undefined {
  if (!entry) return undefined;
  if (typeof entry === 'object' && entry !== null && 'value' in entry) {
    return (entry as { value: string }).value;
  }
  return String(entry);
}

function bindingToRowObject(
  binding: SparqlBinding,
  options = DEFAULT_BINDING_OPTIONS
): Record<string, string> {
  const row: Record<string, string> = {};
  if (!binding) return row;

  Object.entries(binding).forEach(([key, raw]) => {
    const value = bindingEntryToValue(raw);
    if (value == null) return;
    if (typeof value === 'string' && value.trim() === '') return;

    const finalKey =
      options.replaceUnderscoreWithSpace === false
        ? key
        : key.replace(/_/g, ' ');

    row[finalKey] = String(value);
  });

  return row;
}

function bindingsRepresentPredicateObject(bindings: SparqlBinding[]): boolean {
  if (!Array.isArray(bindings) || bindings.length === 0) return false;
  const sample = bindings[0];
  return (
    sample &&
    typeof sample === 'object' &&
    'predicate' in sample &&
    'object' in sample
  );
}

function predicateObjectBindingsToObject(bindings: SparqlBinding[]): Record<string, string> {
  const result: Record<string, string> = {};

  bindings.forEach((item) => {
    const predicate = bindingEntryToValue(item.predicate) || 'N/A';
    const object = bindingEntryToValue(item.object) || 'N/A';

    let processedKey: string;
    if (predicate.includes('#')) {
      processedKey = predicate.split('#').pop() || predicate;
    } else {
      processedKey = predicate.split('/').pop() || predicate;
    }

    let processedValue = object;
    if (typeof object === 'string' && object.includes('://')) {
      if (object.includes('#')) {
        processedValue = object.split('#').pop() || object;
      } else {
        processedValue = object.split('/').pop() || object;
      }
    } else if (typeof object === 'string' && object.includes(':')) {
      processedValue = object.split(':').pop() || object;
    }

    result[processedKey] = processedValue;
  });

  return result;
}

/**
 * Normalize SPARQL JSON bindings.
 *
 * @param bindings - SPARQL JSON bindings array.
 * @param options - Normalization options
 * @returns Normalized object or array
 */
export function normalizeSparqlBindings(
  bindings: SparqlBinding[],
  options: NormalizeSparqlBindingsOptions = {}
): Record<string, string> | Record<string, string>[] {
  const {
    shape = 'object',
    replaceUnderscoreWithSpace = true,
    multiRowStrategy = 'first',
  } = options;

  if (!Array.isArray(bindings) || bindings.length === 0) {
    return shape === 'rows' ? [] : {};
  }

  if (shape === 'rows') {
    return bindings.map((binding) =>
      bindingToRowObject(binding, { replaceUnderscoreWithSpace })
    );
  }

  if (bindingsRepresentPredicateObject(bindings)) {
    return predicateObjectBindingsToObject(bindings);
  }

  const rowObjects = bindings
    .map((binding) =>
      bindingToRowObject(binding, { replaceUnderscoreWithSpace })
    )
    .filter((row) => Object.keys(row).length > 0);

  if (rowObjects.length === 0) {
    return {};
  }

  if (rowObjects.length === 1 || multiRowStrategy === 'first') {
    return rowObjects[0];
  }

  if (multiRowStrategy === 'merge') {
    return rowObjects.reduce((acc, row) => ({ ...acc, ...row }), {});
  }

  return rowObjects[0];
}

/**
 * Process SPARQL query result bindings
 */
export async function processSparqlQueryResult(
  bindings: SparqlBinding[],
  options: NormalizeSparqlBindingsOptions = {}
): Promise<Record<string, string>> {
  console.log('processSparqlQueryResult called with bindings:', bindings);

  const result = normalizeSparqlBindings(bindings, {
    shape: 'object',
    ...options,
  }) as Record<string, string>;

  console.log('Normalized result:', result);
  return result;
}

/**
 * Extract predicate and object pairs from SPARQL bindings
 */
export async function extractPredicateObjectPairs(
  data: Array<{ predicate?: { value: string }; object?: { value: string } }>
): Promise<Array<{ predicate: string; object: string }>> {
  return data.map((item) => {
    return {
      predicate: item.predicate?.value || 'N/A',
      object: item.object?.value || 'N/A',
    };
  });
}

/**
 * Format and extract predicate-object pairs
 */
export async function formatExtractPredicateObjectPairs(
  data: Array<{ predicate: string; object: string }>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  data.forEach(({ predicate, object }) => {
    let processedKey: string;
    if (predicate.includes('#')) {
      processedKey = predicate.split('#').pop() || predicate;
    } else {
      processedKey = predicate.split('/').pop() || predicate;
    }

    let processedValue = object;
    if (typeof object === 'string' && object.includes('//')) {
      processedValue = object.split('/').pop() || object;
    } else if (typeof object === 'string' && object.includes(':')) {
      processedValue = object.split(':').pop() || object;
    } else if (typeof object === 'string' && object.includes('/')) {
      processedValue = object.split('/').pop() || object;
    }

    result[processedKey] = processedValue;
  });

  return result;
}

