import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

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

        // Construct the path to the config file
        const configPath = path.join(process.cwd(), 'src', 'app', 'admin', 'sie', file);

        // Read the config file
        const configContent = await fs.readFile(configPath, 'utf8');
        
        // Parse YAML to JSON for easier manipulation
        const config = yaml.load(configContent);

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error reading config file:', error);
        return NextResponse.json(
            { error: 'Failed to read config file' },
            { status: 500 }
        );
    }
} 