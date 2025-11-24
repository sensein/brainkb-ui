/**
 * Static imports for detail page configurations
 * This ensures Next.js can properly bundle these YAML files
 */
import libraryaliquotDetail from '@/src/config/yaml/libraryaliquot-detail.yaml';
import barcodedcellsampleDetail from '@/src/config/yaml/barcodedcellsample-detail.yaml';
import celltaxonDetail from '@/src/config/yaml/celltaxon-detail.yaml';
import nerDetail from '@/src/config/yaml/ner-detail.yaml';
import resourcesDetail from '@/src/config/yaml/resources-detail.yaml';

export const detailConfigMap: Record<string, any> = {
  'libraryaliquot-detail.yaml': libraryaliquotDetail,
  'barcodedcellsample-detail.yaml': barcodedcellsampleDetail,
  'celltaxon-detail.yaml': celltaxonDetail,
  'ner-detail.yaml': nerDetail,
  'resources-detail.yaml': resourcesDetail,
};

