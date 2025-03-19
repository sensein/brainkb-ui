// Define types for our entities and results
export interface CorrectionHistory {
    originalText?: string;
    correctedText?: string;
    originalType?: string;
    newType?: string;
    correctedBy: string;
    correctedAt: string;
    reason?: string;
    changeType: 'text' | 'type' | 'both'; // Indicates what was changed
}

export interface Entity {
    text: string;
    start: number;
    end: number;
    confidence: number;
    sentence?: string;
    feedback?: 'up' | 'down';
    corrected?: boolean;
    originalText?: string;
    correction?: string;
    entityType?: string;  // New field for entity type classification
    contributedBy?: string;
    submittedAt?: string;
    correctionHistory?: CorrectionHistory[];
}

export interface EntityResults {
    [key: string]: Entity[];
}

export interface ProcessingResult {
    entities: EntityResults;
    documentName: string;
    processedAt: string;
}

export interface ContributionStats {
    totalEntities: number;
    approvedEntities: number;
    correctedEntities: number;
    pendingReview: number;
}

export type StatusFilter = 'all' | 'approved' | 'corrected' | 'pending';
