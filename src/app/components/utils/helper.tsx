/**
 * Re-export utilities from centralized locations
 * @deprecated Use imports from @/src/utils instead
 */

// Re-export SPARQL utilities
export {
  extractPredicateObjectPairs,
  formatExtractPredicateObjectPairs,
  normalizeSparqlBindings,
  processSparqlQueryResult,
} from '@/src/utils/data/sparql-bindings';

// Re-export S3 utilities
export { getRapidReleaseFile as get_rapid_release_file } from '@/src/utils/aws/s3-helpers';
