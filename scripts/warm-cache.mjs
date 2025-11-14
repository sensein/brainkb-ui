/**
 * Build-time script to warm the cache by pre-fetching data
 * This runs during build to populate cache files that API routes can use
 * 
 * Version: 1.0.0
 * 
 * Note: This script requires environment variables to be set
 * If API calls fail, the build will continue (cache warming is optional)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Try to use getData function which already uses ApiService
// This requires the TypeScript to be compiled, so we'll use a fallback approach
let getData = null;
try {
  // Try to require the compiled getData (if available)
  // Note: This might not work during build, so we have a fallback
  const getDataModule = require('../src/app/components/getData.tsx');
  getData = getDataModule.getData;
} catch (error) {
  // getData not available, we'll use direct ApiService approach
  getData = null;
}

// Load environment variables from .env.local if it exists
// (Next.js automatically loads these during build, but this helps if running script standalone)
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (error) {
  // Ignore errors - env vars might already be set by Next.js
}

// Cache directory (will be used by API routes at runtime)
const CACHE_DIR = path.join(process.cwd(), '.next', 'cache', 'brainkb-warm');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Reuse ApiService logic - simplified version that matches ApiService behavior
async function getToken() {
  const jwtUser = process.env.NEXT_PUBLIC_JWT_USER;
  const jwtPassword = process.env.NEXT_PUBLIC_JWT_PASSWORD;
  const tokenEndpoint = process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE || '';
  
  if (!jwtUser || !jwtPassword || !tokenEndpoint) {
    throw new Error('JWT credentials not configured');
  }
  
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: jwtUser, password: jwtPassword })
  });
  
  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status}`);
  }
  
  const tokenData = await response.json();
  return tokenData.access_token;
}

async function getHeaders() {
  const headers = { 'Accept': 'application/json' };
  const useBearerToken = process.env.NEXT_PUBLIC_USE_BEARER_TOKEN !== 'false';
  
  if (useBearerToken) {
    try {
      const token = await getToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.warn('Failed to get bearer token, proceeding without authentication');
    }
  }
  
  return headers;
}

async function fetchData(queryParameter, endpoint) {
  // Try to use getData if available (which uses ApiService)
  if (getData) {
    try {
      return await getData(queryParameter, endpoint);
    } catch (error) {
      console.warn('getData failed, using direct ApiService approach:', error.message);
    }
  }
  
  // Use the same approach as ApiService.query()
  const apiEndpoint = endpoint || process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || 'https://queryservice.brainkb.org/query/sparql';
  const headers = await getHeaders();
  
  const queryString = new URLSearchParams(queryParameter).toString();
  const urlWithQuery = queryString ? `${apiEndpoint}?${queryString}` : apiEndpoint;
  
  const response = await fetch(urlWithQuery, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Network response was not ok. Status: ${urlWithQuery} - ${response.status}`);
  }
  
  return await response.json();
}

async function warmCache() {
  console.log('Starting cache warming during build...\n');
  
  // Check if API endpoint is configured
  const apiEndpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT;
  if (!apiEndpoint) {
    console.log('API endpoint not configured, skipping cache warming');
    console.log('Set NEXT_PUBLIC_API_QUERY_ENDPOINT to enable cache warming\n');
    return;
  }
  
  try {
    // Import YAML configs
    const yamlHome = require('../src/app/components/config-home.yaml');
    const yamlKB = require('../src/app/components/config-knowledgebases.yaml');
    
    // Warm statistics cache
    console.log('Warming statistics cache...');
    try {
      const statsData = await Promise.all(
        yamlHome.boxiconsstatisticscount.map(async (page) => {
          try {
            const queryParameter = { sparql_query: page.sparql_query };
            const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
            
            const response = await fetchData(queryParameter, endpoint);
            return response && response.status === "success" && response.message?.results?.bindings
              ? response.message.results.bindings[0].count.value
              : null;
          } catch (error) {
            console.warn(`Failed to fetch statistic for ${page.name}:`, error.message);
            return null;
          }
        })
      );
      
      fs.writeFileSync(
        path.join(CACHE_DIR, 'statistics.json'),
        JSON.stringify({
          data: statsData,
          timestamp: Date.now()
        }, null, 2)
      );
      console.log('Statistics cache warmed\n');
    } catch (error) {
      console.warn('Statistics cache warming failed:', error.message);
    }
    
    // Warm knowledge base caches
    console.log('Warming knowledge base caches...');
    for (const page of yamlKB.pages) {
      try {
        const queryParameter = { sparql_query: page.sparql_query };
        const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
        
        const response = await fetchData(queryParameter, endpoint);
        
        if (response.status === 'success' && response.message?.results?.bindings) {
          const result = {
            data: response.message.results.bindings,
            headers: response.message.head.vars,
            pageTitle: page.page || "",
            pageSubtitle: page.description || "",
            entityPageSlug: page.entitypageslug || "",
            timestamp: Date.now()
          };
          
          fs.writeFileSync(
            path.join(CACHE_DIR, `kb-${page.slug}.json`),
            JSON.stringify(result, null, 2)
          );
          console.log(`KB cache warmed for: ${page.slug}`);
        }
      } catch (error) {
        console.warn(`KB cache warming failed for ${page.slug}:`, error.message);
      }
    }
    
    console.log('\nCache warming completed!');
  } catch (error) {
    console.error('Cache warming failed:', error.message);
    // Don't fail the build if cache warming fails
    console.log('Build will continue without pre-warmed cache\n');
  }
}

warmCache();

