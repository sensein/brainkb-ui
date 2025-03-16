import { ContributionStats, Entity, ProcessingResult } from "../types";

// Calculate stats based on current results
export const calculateStats = (data: ProcessingResult): ContributionStats => {
    let total = 0;
    let approved = 0;
    let corrected = 0;
    let pending = 0;
    
    Object.keys(data.entities).forEach(type => {
        data.entities[type].forEach(entity => {
            total++;
            if (entity.feedback === 'up') {
                approved++;
                if (entity.corrected) {
                    corrected++;
                }
            } else if (entity.feedback === 'down') {
                pending++;
            }
        });
    });
    
    return {
        totalEntities: total,
        approvedEntities: approved,
        correctedEntities: corrected,
        pendingReview: pending
    };
};

// Download entities as CSV
export const downloadAsCSV = (
    results: ProcessingResult, 
    selectedEntities: {[key: string]: boolean}
): void => {
    // Prepare CSV content
    let csvContent = "Type,Text,Confidence,Feedback,Sentence\n";
    
    Object.keys(results.entities).forEach(type => {
        results.entities[type].forEach((entity, index) => {
            if (selectedEntities[`${type}-${index}`]) {
                // Clean sentence text for CSV (remove newlines, escape quotes)
                const cleanSentence = entity.sentence 
                    ? entity.sentence.replace(/\n/g, ' ').replace(/"/g, '""')
                    : '';
                
                csvContent += `${type},"${entity.text}",${(entity.confidence * 100).toFixed(1)}%,${entity.feedback || 'none'},"${cleanSentence}"\n`;
            }
        });
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ner-results-${results.documentName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Download entities as JSON
export const downloadAsJSON = (
    results: ProcessingResult, 
    selectedEntities: {[key: string]: boolean}
): void => {
    // Prepare JSON content
    const jsonData: any = {
        documentName: results.documentName,
        processedAt: results.processedAt,
        entities: {}
    };
    
    Object.keys(results.entities).forEach(type => {
        jsonData.entities[type] = [];
        
        results.entities[type].forEach((entity, index) => {
            if (selectedEntities[`${type}-${index}`]) {
                jsonData.entities[type].push(entity);
            }
        });
    });
    
    // Create and download file
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ner-results-${results.documentName}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
