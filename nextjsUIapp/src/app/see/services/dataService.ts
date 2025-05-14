import { ProcessingResult } from "@/src/app/see/types";

// Fetch data from API (using dummy data for now)
export const fetchEntityData = async (): Promise<ProcessingResult> => {
    // In a real implementation, this would be an API call
    // For now, use dummy data
    const dummyData = {
        documentName: "neuroscience-research-paper.pdf",
        processedAt: new Date().toISOString(),
        entities: {
            GENE: [
                {
                    text: 'BDNF',
                    start: 46,
                    end: 50,
                    confidence: 0.98,
                    sentence: "Brain-derived neurotrophic factor (BDNF) plays a crucial role in synaptic plasticity, especially within the hippocampus.",
                    feedback: 'up' as 'up'
                },
                {
                    text: 'APOE',
                    start: 206,
                    end: 210,
                    confidence: 0.97,
                    sentence: "Additionally, mutations in the APOE gene have been linked to neurodegenerative disorders, impacting astrocytes and microglia function.",
                    feedback: 'up' as 'up'
                },
                {
                    text: 'GRIN2B',
                    start: 440,
                    end: 446,
                    confidence: 0.96,
                    sentence: "Understanding the role of genes like GRIN2B in synaptic modulation provides deeper insight into cognitive functions and psychiatric conditions.",
                    feedback: 'down' as 'down',
                    corrected: true,
                    originalText: 'GRIN2B'
                }
            ],
            CELL_TYPE: [
                {
                    text: 'astrocytes',
                    start: 247,
                    end: 257,
                    confidence: 0.95,
                    sentence: "Additionally, mutations in the APOE gene have been linked to neurodegenerative disorders, impacting astrocytes and microglia function.",
                    feedback: 'up' as 'up'
                },
                {
                    text: 'microglia',
                    start: 262,
                    end: 270,
                    confidence: 0.96,
                    sentence: "Additionally, mutations in the APOE gene have been linked to neurodegenerative disorders, impacting astrocytes and microglia function.",
                    feedback: 'up' as 'up'
                }
            ],
            ANATOMICAL_REGION: [
                {
                    text: 'hippocampus',
                    start: 82,
                    end: 93,
                    confidence: 0.97,
                    sentence: "Brain-derived neurotrophic factor (BDNF) plays a crucial role in synaptic plasticity, especially within the hippocampus.",
                    feedback: 'up' as 'up'
                },
                {
                    text: 'prefrontal cortex',
                    start: 159,
                    end: 177,
                    confidence: 0.95,
                    sentence: "Research suggests that pyramidal neurons in the prefrontal cortex are heavily influenced by BDNF signaling.",
                    feedback: 'down' as 'down'
                },
                {
                    text: 'amygdala',
                    start: 303,
                    end: 311,
                    confidence: 0.94,
                    sentence: "The amygdala also shows significant changes in connectivity due to alterations in dopaminergic neurons.",
                    feedback: 'up' as 'up'
                }
            ],
            NEURON_TYPE: [
                {
                    text: 'pyramidal neurons',
                    start: 114,
                    end: 131,
                    confidence: 0.95,
                    sentence: "Research suggests that pyramidal neurons in the prefrontal cortex are heavily influenced by BDNF signaling.",
                    feedback: 'up' as 'up'
                },
                {
                    text: 'dopaminergic neurons',
                    start: 326,
                    end: 346,
                    confidence: 0.96,
                    sentence: "The amygdala also shows significant changes in connectivity due to alterations in dopaminergic neurons.",
                    feedback: 'up' as 'up'
                }
            ]
        }
    };
    
    return dummyData as ProcessingResult;
};

// Save entity data (feedback and corrections)
export const saveEntityData = async (data: ProcessingResult): Promise<void> => {
    // simulated for now. To be updated later with API call. Replace
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real implementation, you would return the response from the API
    return;
};
