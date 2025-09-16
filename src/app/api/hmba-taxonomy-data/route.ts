import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Construct the path to the treeData.json file in the public directory
    const filePath = path.join(process.cwd(), 'public', 'treeData.json');
    
    // Read the JSON file
    const fileContent = await fs.readFile(filePath, 'utf8');
    
    // Parse the JSON content
    const treeData = JSON.parse(fileContent);
    
    // Return the data as JSON response
    return NextResponse.json(treeData);
    
  } catch (error) {
    console.error('Error reading tree data file:', error);
    return NextResponse.json(
      { error: 'Failed to load tree data' },
      { status: 500 }
    );
  }
}