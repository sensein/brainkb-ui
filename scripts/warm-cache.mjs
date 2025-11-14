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
import { createHash } from 'crypto';
import yaml from 'js-yaml';

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

// Helper function to load and parse YAML files
function loadYamlFile(filePath) {
  try {
    const yamlContent = fs.readFileSync(filePath, 'utf8');
    return yaml.load(yamlContent);
  } catch (error) {
    console.error(`Failed to load YAML file ${filePath}:`, error.message);
    throw error;
  }
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
  console.log(`Cache directory: ${CACHE_DIR}`);
  
  // Check if API endpoint is configured
  const apiEndpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT;
  if (!apiEndpoint) {
    console.log('API endpoint not configured, skipping cache warming');
    console.log('Set NEXT_PUBLIC_API_QUERY_ENDPOINT to enable cache warming\n');
    return;
  }
  
  console.log(`API endpoint: ${apiEndpoint}`);
  
  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`Created cache directory: ${CACHE_DIR}`);
  } else {
    console.log(`Cache directory already exists: ${CACHE_DIR}`);
  }
  
  try {
    // Load and parse YAML configs
    const yamlHomePath = path.join(process.cwd(), 'src', 'app', 'components', 'config-home.yaml');
    const yamlKBPath = path.join(process.cwd(), 'src', 'app', 'components', 'config-knowledgebases.yaml');
    
    const yamlHome = loadYamlFile(yamlHomePath);
    const yamlKB = loadYamlFile(yamlKBPath);
    
    // Warm statistics cache
    console.log('Warming statistics cache...');
    let statsSuccess = false;
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
      
      const statsFile = path.join(CACHE_DIR, 'statistics.json');
      fs.writeFileSync(
        statsFile,
        JSON.stringify({
          data: statsData,
          timestamp: Date.now()
        }, null, 2)
      );
      
      // Verify file was written
      if (fs.existsSync(statsFile)) {
        const fileStats = fs.statSync(statsFile);
        console.log(`Statistics cache warmed (${fileStats.size} bytes)`);
        statsSuccess = true;
      } else {
        console.error('Failed to write statistics cache file');
      }
    } catch (error) {
      console.error('Statistics cache warming failed:', error.message);
      console.error(error.stack);
    }
    
    // Warm knowledge base caches
    console.log('Warming knowledge base caches...');
    let kbSuccessCount = 0;
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
          
          const kbFile = path.join(CACHE_DIR, `kb-${page.slug}.json`);
          fs.writeFileSync(kbFile, JSON.stringify(result, null, 2));
          
          // Verify file was written
          if (fs.existsSync(kbFile)) {
            const fileStats = fs.statSync(kbFile);
            console.log(`KB cache warmed for: ${page.slug} (${fileStats.size} bytes)`);
            kbSuccessCount++;
          } else {
            console.error(`Failed to write KB cache file for: ${page.slug}`);
          }
        } else {
          console.warn(`Invalid response for ${page.slug}:`, response.status);
        }
      } catch (error) {
        console.error(`KB cache warming failed for ${page.slug}:`, error.message);
      }
    }
    
    // Taxonomy is cached at runtime when user clicks/navigates (not during build)
    console.log('Skipping taxonomy cache warming (will be cached at runtime when accessed)');
    
    // Warm entity pages cache (sample entities from each KB)
    console.log('Warming entity pages cache...');
    let entitySuccessCount = 0;
    let entityTotalCount = 0;
    
    try {
      // Load entity card mapper config
      const entityMapperPath = path.join(process.cwd(), 'src', 'app', 'components', 'enititycardmapper.yaml');
      const entityMapper = loadYamlFile(entityMapperPath);
      
      // For each knowledge base page, get sample entities (first 5 entities)
      const MAX_ENTITIES_PER_SLUG = 5;
      
      for (const kbPage of yamlKB.pages) {
        if (!kbPage.entitypageslug) continue;
        
        const slug = kbPage.entitypageslug;
        const entityConfig = entityMapper.EntityViewCardsMaper?.find((e) => e.slug === slug);
        
        if (!entityConfig) {
          console.log(`No entity config found for slug: ${slug}, skipping`);
          continue;
        }
        
        // Get entity IDs from the knowledge base data we already fetched
        const kbCacheFile = path.join(CACHE_DIR, `kb-${kbPage.slug}.json`);
        if (!fs.existsSync(kbCacheFile)) {
          console.log(`KB cache file not found for ${kbPage.slug}, skipping entity warming`);
          continue;
        }
        
        const kbData = JSON.parse(fs.readFileSync(kbCacheFile, 'utf8'));
        const entities = kbData.data || [];
        const headers = kbData.headers || [];
        
        if (entities.length === 0 || headers.length === 0) {
          console.log(`No entities found for ${kbPage.slug}, skipping`);
          continue;
        }
        
        // Get entity IDs from the first column (usually the entity ID)
        const entityIdHeader = headers[0];
        const sampleEntities = entities
          .slice(0, MAX_ENTITIES_PER_SLUG)
          .map((entity) => {
            const idValue = entity[entityIdHeader]?.value;
            return idValue ? decodeURIComponent(idValue) : null;
          })
          .filter((id) => id !== null);
        
        if (sampleEntities.length === 0) {
          console.log(`No valid entity IDs found for ${kbPage.slug}, skipping`);
          continue;
        }
        
        console.log(`Warming ${sampleEntities.length} entities for slug: ${slug}`);
        
        // Load entity card YAML config
        const entityCardPath = path.join(process.cwd(), 'src', 'app', 'components', entityConfig.filename);
        if (!fs.existsSync(entityCardPath)) {
          console.log(`Entity card config not found: ${entityCardPath}, skipping`);
          continue;
        }
        
        const entityCardConfig = loadYamlFile(entityCardPath);
        const boxes = entityCardConfig?.boxes || [];
        
        // For each sample entity, execute all queries and cache them
        for (const entityId of sampleEntities) {
          entityTotalCount++;
          
          try {
            // Execute queries for each box
            for (const box of boxes) {
              if (box.cardtype !== 'card') continue;
              
              // Main box query
              if (box.sparql_query) {
                const query = box.sparql_query.replace(/\{0\}/g, entityId);
                try {
                  const queryParameter = { sparql_query: query };
                  const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
                  
                  const response = await fetchData(queryParameter, endpoint);
                  
                  // Store in warm cache
                  if (response && response.status === "success" && response.message?.results?.bindings) {
                    const bindings = response.message.results.bindings;
                    if (Array.isArray(bindings) && bindings.length > 0) {
                      const queryHash = createHash('sha256').update(query).digest('hex').slice(0, 16);
                      const cacheFile = path.join(CACHE_DIR, `entity-query-${queryHash}.json`);
                      fs.writeFileSync(
                        cacheFile,
                        JSON.stringify({
                          data: bindings,
                          timestamp: Date.now()
                        }, null, 2)
                      );
                      console.log(`  Cached query for entity ${entityId} (${bindings.length} results)`);
                    } else {
                      console.warn(`  Query for entity ${entityId} returned empty results`);
                    }
                  } else {
                    console.warn(`  Query for entity ${entityId} failed or returned invalid response`);
                  }
                } catch (error) {
                  console.warn(`Failed to execute query for entity ${entityId}:`, error.message);
                }
              }
              
              // Additional info queries
              if (box.box_additional_info) {
                const add = box.box_additional_info;
                
                if (add.sparql_query) {
                  const query = add.sparql_query.replace(/\{0\}/g, entityId);
                  try {
                    const queryParameter = { sparql_query: query };
                    const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
                    
                    const response = await fetchData(queryParameter, endpoint);
                    
                    // Store in warm cache
                    if (response && response.status === "success" && response.message?.results?.bindings) {
                      const bindings = response.message.results.bindings;
                      if (Array.isArray(bindings) && bindings.length > 0) {
                        const queryHash = createHash('sha256').update(query).digest('hex').slice(0, 16);
                        const cacheFile = path.join(CACHE_DIR, `entity-query-${queryHash}.json`);
                        fs.writeFileSync(
                          cacheFile,
                          JSON.stringify({
                            data: bindings,
                            timestamp: Date.now()
                          }, null, 2)
                        );
                      }
                    }
                  } catch (error) {
                    console.warn(`Failed to execute additional query for entity ${entityId}:`, error.message);
                  }
                }
                
                // Property queries
                if (Array.isArray(add.properties)) {
                  for (const prop of add.properties) {
                    if (prop.sparql_query) {
                      const query = prop.sparql_query.replace(/\{0\}/g, entityId);
                      try {
                        const queryParameter = { sparql_query: query };
                        const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
                        
                        const response = await fetchData(queryParameter, endpoint);
                        
                        // Store in warm cache
                        if (response && response.status === "success" && response.message?.results?.bindings) {
                          const bindings = response.message.results.bindings;
                          if (Array.isArray(bindings) && bindings.length > 0) {
                            const queryHash = createHash('sha256').update(query).digest('hex').slice(0, 16);
                            const cacheFile = path.join(CACHE_DIR, `entity-query-${queryHash}.json`);
                            fs.writeFileSync(
                              cacheFile,
                              JSON.stringify({
                                data: bindings,
                                timestamp: Date.now()
                              }, null, 2)
                            );
                          }
                        }
                      } catch (error) {
                        console.warn(`Failed to execute property query for entity ${entityId}:`, error.message);
                      }
                    }
                  }
                }
              }
            }
            
            entitySuccessCount++;
          } catch (error) {
            console.warn(`Failed to warm cache for entity ${entityId}:`, error.message);
          }
        }
      }
      
      console.log(`Entity cache warming: ${entitySuccessCount}/${entityTotalCount} entities processed`);
    } catch (error) {
      console.warn('Entity cache warming failed:', error.message);
      console.error(error.stack);
    }
    
    // List all cache files created
    console.log('\nCache files created:');
    try {
      const files = fs.readdirSync(CACHE_DIR);
      files.forEach(file => {
        const filePath = path.join(CACHE_DIR, file);
        const fileStats = fs.statSync(filePath);
        console.log(`  - ${file} (${fileStats.size} bytes)`);
      });
    } catch (error) {
      console.error('Failed to list cache files:', error.message);
    }
    
    console.log(`\nCache warming completed!`);
    console.log(`  Statistics: ${statsSuccess ? 'success' : 'failed'}`);
    console.log(`  KB pages: ${kbSuccessCount}/${yamlKB.pages.length}`);
    console.log(`  Taxonomy: skipped (cached at runtime when accessed)`);
    console.log(`  Entities: ${entitySuccessCount}/${entityTotalCount} entities warmed`);
  } catch (error) {
    console.error('Cache warming failed:', error.message);
    console.error(error.stack);
    // Don't fail the build if cache warming fails
    console.log('Build will continue without pre-warmed cache\n');
  }
}

warmCache();


