/**
 * Build-time script to warm the cache by pre-fetching data
 * This runs during build to populate the cache before the app starts
 */

const fs = require('fs');
const path = require('path');

// Cache directory (will be used by API routes at runtime)
const CACHE_DIR = path.join(process.cwd(), '.next', 'cache', 'brainkb-warm');
const CACHE_FILE_STATS = path.join(CACHE_DIR, 'statistics.json');
const CACHE_FILE_KB_PREFIX = path.join(CACHE_DIR, 'knowledge-base');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

async function fetchStatistics() {
  try {
    console.log('🔄 Fetching statistics data...');
    
    // Import the fetch function (we'll need to make it available)
    // For now, we'll use a direct fetch approach
    const yaml = require('../src/app/components/config-home.yaml');
    const { getData } = require('../src/app/components/getData.tsx');
    
    const updatedDataCount = await Promise.all(
      yaml.boxiconsstatisticscount.map(async (page) => {
        try {
          const queryParameter = { sparql_query: page.sparql_query };
          const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
          
          const response = await getData(queryParameter, endpoint);
          return response && response.status === "success" && response.message?.results?.bindings
            ? response.message.results.bindings[0].count.value
            : null;
        } catch (error) {
          console.warn(`Failed to fetch statistic for ${page.name}:`, error.message);
          return null;
        }
      })
    );
    
    // Save to cache file
    fs.writeFileSync(
      CACHE_FILE_STATS,
      JSON.stringify({
        data: updatedDataCount,
        timestamp: Date.now()
      }, null, 2)
    );
    
    console.log('✅ Statistics cache warmed successfully');
    return updatedDataCount;
  } catch (error) {
    console.error('❌ Error warming statistics cache:', error.message);
    // Don't fail the build if cache warming fails
    return null;
  }
}

async function fetchKnowledgeBase(slug) {
  try {
    console.log(`🔄 Fetching knowledge base data for: ${slug}...`);
    
    const yaml = require('../src/app/components/config-knowledgebases.yaml');
    const { getData } = require('../src/app/components/getData.tsx');
    
    const page = yaml.pages.find((page) => page.slug === slug);
    if (!page) {
      console.warn(`Page with slug "${slug}" not found`);
      return null;
    }

    const query_to_execute = page.sparql_query;
    const queryParameter = { sparql_query: query_to_execute };
    const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";

    const response = await getData(queryParameter, endpoint);

    if (response.status === 'success' && response.message?.results?.bindings) {
      const bindings = response.message.results.bindings;
      const vars = response.message.head.vars;

      const result = {
        data: bindings,
        headers: vars,
        pageTitle: page.page || "",
        pageSubtitle: page.description || "",
        entityPageSlug: page.entitypageslug || "",
        timestamp: Date.now()
      };
      
      // Save to cache file
      const cacheFile = `${CACHE_FILE_KB_PREFIX}-${slug}.json`;
      fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
      
      console.log(`✅ Knowledge base cache warmed for: ${slug}`);
      return result;
    } else {
      throw new Error("Invalid data format");
    }
  } catch (error) {
    console.error(`❌ Error warming knowledge base cache for ${slug}:`, error.message);
    return null;
  }
}

async function warmAllCaches() {
  console.log('🔥 Starting cache warming process...\n');
  
  try {
    // Warm statistics cache
    await fetchStatistics();
    
    // Warm knowledge base caches
    const yaml = require('../src/app/components/config-knowledgebases.yaml');
    const slugs = yaml.pages.map(page => page.slug);
    
    for (const slug of slugs) {
      await fetchKnowledgeBase(slug);
    }
    
    console.log('\n✅ Cache warming completed successfully!');
  } catch (error) {
    console.error('\n❌ Cache warming failed:', error);
    // Don't fail the build
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  warmAllCaches();
}

module.exports = { warmAllCaches, fetchStatistics, fetchKnowledgeBase };

