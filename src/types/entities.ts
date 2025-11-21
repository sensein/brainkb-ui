/**
 * Entity-related type definitions
 */

export interface Resource {
  _id: string;
  [key: string]: unknown;
}

export interface NEREntity {
  _id: string;
  [key: string]: unknown;
}

export interface KnowledgeBaseEntity {
  [key: string]: unknown;
}

export interface SparqlBinding {
  [key: string]: {
    value: string;
    type?: string;
    datatype?: string;
    [key: string]: unknown;
  };
}

