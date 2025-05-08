import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { configFile, updates } = body;

        if (!configFile || !updates) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // Construct the path to the config file in the admin/ner directory
        const configPath = path.join(process.cwd(), 'src', 'app', 'admin', 'ner', configFile);

        // Read the current config file
        const configContent = await fs.readFile(configPath, 'utf8');
        const config = yaml.load(configContent) as Record<string, any>;

        console.log('Current config:', config);

        // Update api_key for each agent's llm section
        const agents = ['extractor_agent', 'alignment_agent', 'judge_agent'];
        agents.forEach(agent => {
            if (config[agent] && config[agent].llm) {
                config[agent].llm.api_key = updates.api_key;
            }
        });

        // Write the updated config back to the file
        const updatedContent = yaml.dump(config);
        await fs.writeFile(configPath, updatedContent, 'utf8');

        console.log('Updated config:', config);
        console.log('Updated YAML content:', updatedContent);

        return NextResponse.json({ 
            success: true,
            updatedConfig: config 
        });
    } catch (error) {
        console.error('Error updating config:', error);
        return NextResponse.json(
            { error: 'Failed to update config file' },
            { status: 500 }
        );
    }
} 