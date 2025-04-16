import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const file = searchParams.get('file');

        if (!file) {
            return NextResponse.json(
                { error: 'File parameter is required' },
                { status: 400 }
            );
        }

        // Validate file name to prevent directory traversal
        const validFiles = [
            'ner_agent.yaml',
            'ner_task.yaml',
            'embedding.yaml',
            'search_ontology_knowledge.yaml'
        ];

        if (!validFiles.includes(file)) {
            return NextResponse.json(
                { error: 'Invalid file requested' },
                { status: 400 }
            );
        }

        // Read the file from the src directory
        const filePath = path.join(process.cwd(), 'src/app/admin/ner', file);
        const fileContent = fs.readFileSync(filePath, 'utf8');

        return new NextResponse(fileContent, {
            headers: {
                'Content-Type': 'application/yaml',
            },
        });

    } catch (error) {
        console.error('Error serving config file:', error);
        return NextResponse.json(
            { error: 'Failed to serve config file' },
            { status: 500 }
        );
    }
} 