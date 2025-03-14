import {NextRequest, NextResponse} from 'next/server';


// Function to extract text from a file via API call to our backend-service
async function extractTextFromFile(file: File): Promise<string> {
    // we would probably use libraries like pdf.js for PDFs or simply read text files directly


    // this is for test only, once backend is complete, we will replace accordingly
    return `This is the content extracted from ${file.name}. 
  Brain-derived neurotrophic factor (BDNF) plays a crucial role in synaptic plasticity, especially within the hippocampus. Research suggests that pyramidal neurons in the prefrontal cortex are heavily influenced by BDNF signaling. Additionally, mutations in the APOE gene have been linked to neurodegenerative disorders, impacting astrocytes and microglia function. The amygdala also shows significant changes in connectivity due to alterations in dopaminergic neurons. Understanding the role of genes like GRIN2B in synaptic modulation provides deeper insight into cognitive functions and psychiatric conditions`;
}

// Function to perform named entity recognition (dummy implementation)
async function performNER(text: string): Promise<any> {
    // here we would call the backend service. For now we are using the dummy content.

    // Get API key from environment variable
    const apiKey = process.env.NER_API_KEY || 'api-key';

    console.log(`Using API key: ${apiKey} for NER processing`);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create dummy entities for testing purpose, will be replaced later with the API call.
    const neuroscienceEntities = {
        GENE: [
            {
                text: 'BDNF',
                start: 46,
                end: 50,
                confidence: 0.98,
                sentence: "Brain-derived neurotrophic factor (BDNF) plays a crucial role in synaptic plasticity, especially within the hippocampus."
            },
            {
                text: 'APOE',
                start: 206,
                end: 210,
                confidence: 0.97,
                sentence: "Additionally, mutations in the APOE gene have been linked to neurodegenerative disorders, impacting astrocytes and microglia function."
            },
            {
                text: 'GRIN2B',
                start: 440,
                end: 446,
                confidence: 0.96,
                sentence: "Understanding the role of genes like GRIN2B in synaptic modulation provides deeper insight into cognitive functions and psychiatric conditions."
            }
        ],
        CELL_TYPE: [
            {
                text: 'astrocytes',
                start: 247,
                end: 257,
                confidence: 0.95,
                sentence: "Additionally, mutations in the APOE gene have been linked to neurodegenerative disorders, impacting astrocytes and microglia function."
            },
            {
                text: 'microglia',
                start: 262,
                end: 270,
                confidence: 0.96,
                sentence: "Additionally, mutations in the APOE gene have been linked to neurodegenerative disorders, impacting astrocytes and microglia function."
            }
        ],
        ANATOMICAL_REGION: [
            {
                text: 'hippocampus',
                start: 82,
                end: 93,
                confidence: 0.97,
                sentence: "Brain-derived neurotrophic factor (BDNF) plays a crucial role in synaptic plasticity, especially within the hippocampus."
            },
            {
                text: 'prefrontal cortex',
                start: 159,
                end: 177,
                confidence: 0.95,
                sentence: "Research suggests that pyramidal neurons in the prefrontal cortex are heavily influenced by BDNF signaling."
            },
            {
                text: 'amygdala',
                start: 303,
                end: 311,
                confidence: 0.94,
                sentence: "The amygdala also shows significant changes in connectivity due to alterations in dopaminergic neurons."
            }
        ],
        NEURON_TYPE: [
            {
                text: 'pyramidal neurons',
                start: 114,
                end: 131,
                confidence: 0.95,
                sentence: "Research suggests that pyramidal neurons in the prefrontal cortex are heavily influenced by BDNF signaling."
            },
            {
                text: 'dopaminergic neurons',
                start: 326,
                end: 346,
                confidence: 0.96,
                sentence: "The amygdala also shows significant changes in connectivity due to alterations in dopaminergic neurons."
            }
        ]
    };


    return neuroscienceEntities;
}

// Apply corrections to entities
function applyCorrections(entities: any, corrections: Record<string, string>): any {
    if (!corrections || Object.keys(corrections).length === 0) {
        return entities;
    }

    const updatedEntities = {...entities};

    // Go through each entity type and apply corrections
    Object.keys(updatedEntities).forEach(type => {
        updatedEntities[type] = updatedEntities[type].map(entity => {
            if (corrections[entity.text]) {
                return {
                    ...entity,
                    text: corrections[entity.text],
                    // Mark as corrected so frontend can display differently
                    corrected: true,
                    originalText: entity.text
                };
            }
            return entity;
        });
    });

    return updatedEntities;
}

export async function POST(request: NextRequest) {
    try {
        // Check if API key is configured
        if (!process.env.NER_API_KEY) {
            console.warn('NER_API_KEY environment variable is not set.');
        }

        // Get the form data from the request
        const formData = await request.formData();
        const file = formData.get('document') as File;
        const correctionsStr = formData.get('corrections') as string;

        if (!file) {
            return NextResponse.json(
                {error: 'No document provided'},
                {status: 400}
            );
        }

        // Check file type
        const fileType = file.type;
        if (fileType !== 'application/pdf' && fileType !== 'text/plain') {
            return NextResponse.json(
                {error: 'Only PDF and text files are supported'},
                {status: 400}
            );
        }

        // Extract text from the file
        const text = await extractTextFromFile(file);

        // Perform named entity recognition
        let entities = await performNER(text);

        // Apply corrections if provided
        if (correctionsStr) {
            try {
                const corrections = JSON.parse(correctionsStr);
                entities = applyCorrections(entities, corrections);
                console.log('Applied corrections:', corrections);
            } catch (err) {
                console.error('Error parsing corrections:', err);
            }
        }

        // Return the results
        return NextResponse.json({
            entities,
            documentName: file.name,
            processedAt: new Date().toISOString(),
            corrected: !!correctionsStr
        });

    } catch (error) {
        console.error('Error processing document:', error);
        return NextResponse.json(
            {error: 'Failed to process document'},
            {status: 500}
        );
    }
}
