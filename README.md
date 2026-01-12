# 🧠 BrainKB UI

A modern user interface for exploring and interacting with the **BrainKB Knowledge Graph infrastructure**.  

---

## 📸 Screenshots
<img width="1735" height="1123" alt="landing_page" src="https://github.com/user-attachments/assets/9d1b5aa0-8fc5-4b63-8428-f0aad86f7e76" />
<img width="1735" height="1123" alt="Screenshot 2025-11-12 at 2 06 44 PM" src="https://github.com/user-attachments/assets/de5732fe-962f-4fdf-a567-d42f0f544993" />



---

## Getting Started

You can run BrainKB UI locally or with Docker.  
The UI depends on the **BrainKB backend services** (authentication, query, chat, etc.).   

---

### 1. Clone the Repository & Configure Environment

```bash
git clone https://github.com/sensein/brainkb-ui.git
```

Before starting the app, create a `.env.local` file with the required environment variables.

---

### 🧠 Environment Variables

Below is a structured overview of supported variables:


```env
########################################################################################################
######### OAuth Credentials (Optional) ###############################################################
# Required only if you want to enable login via GitHub or access the admin dashboard.
# ORCID login is not supported in local development.
########################################################################################################
GITHUB_CLIENT_ID=APP-XXXXXXXXX
GITHUB_CLIENT_SECRET=XXXXX

ORCID_CLIENT_ID=APP-XXXXXX
ORCID_CLIENT_SECRET=XXXX

NEXTAUTH_SECRET=ANY_RANDOM_STRING_SECRET
NEXTAUTH_URL=http://localhost:3000 #FOR LOCAL DEPLOYMENT

########################################################################################################
######### Ipify (Optional) ###############################################################
#Maps  IP to Address city country...
########################################################################################################

NEXT_PUBLIC_IPIFY_KEY=

########################################################################################################
######### Structured Resource Extraction ##############################################################
# Endpoints for uploading and saving structured resources.
########################################################################################################
NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE=http://127.0.0.1:8007/api/token
#websocket endpoints
NEXT_PUBLIC_API_NER_ENDPOINT=ws://127.0.0.1:8007/api/ws/ner
NEXT_PUBLIC_NER_SAVE_ENDPOINT=http://127.0.0.1:8007/api/save/ner
NEXT_PUBLIC_NER_GET_ENDPOINT=http://127.0.0.1:8007/api/ner
NEXT_PUBLIC_API_PDF2REPROSCHEMA_ENDPOINT=ws://127.0.0.1:8007/api/ws/pdf2reproschema
NEXT_PUBLIC_API_ADMIN_EXTRACT_STRUCTURED_RESOURCE_ENDPOINT=ws://127.0.0.1:8007/api/ws/extract-resources
NEXT_PUBLIC_API_ADMIN_SAVE_STRUCTURED_RESOURCE_ENDPOINT=http://127.0.0.1:8007/api/save/structured-resource
NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT=http://127.0.0.1:8007/api/structured-resource

########################################################################################################
######### JWT Authentication ##########################################################################
# Common JWT credentials for accessing backend services.
########################################################################################################

NEXT_PUBLIC_JWT_USER=test@test.com
NEXT_PUBLIC_JWT_PASSWORD=test13e

########################################################################################################
######### User Profile Management #####################################################################
# Endpoints for creating, fetching, and updating user profiles.
########################################################################################################

NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE=http://127.0.0.1:8008/api/token
NEXT_PUBLIC_CREATE_USER_PROFILE_ENDPOINT_USER_MANAGEMENT_SERVICE=http://127.0.0.1:8008/api/users/profile
NEXT_PUBLIC_GET_ENDPOINT_USER_PROFILE_USER_MANAGEMENT_SERVICE=http://127.0.0.1:8009/api/users/profile
NEXT_PUBLIC_UPDATE_ENDPOINT_USER_PROFILE_USER_MANAGEMENT_SERVICE=http://127.0.0.1:8008/api/users/profile
NEXT_PUBLIC_GET_ENDPOINT_USER_ACTIVITY_USER_MANAGEMENT_SERVICE=http://127.0.0.1:8008/api/users/activities


########################################################################################################
######### Chat Service #################################################################################
# Endpoints for chat-related token generation and message streaming.
########################################################################################################

NEXT_PUBLIC_TOKEN_ENDPOINT_CHAT_SERVICE=http://127.0.0.1:8011/api/token
NEXT_PUBLIC_CHAT_SERVICE_API_ENDPOINT=http://127.0.0.1:8011/api/chat?stream=false

########################################################################################################
######### Query Service ################################################################################
# Endpoints for querying the Knowledge Graph and uploading triples.
########################################################################################################

NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE=http://localhost:8010/api/token

# Query registered named graphs
NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT=http://localhost:8010/api/query/registered-named-graphs

# SPARQL query endpoint (used for querying knowledge graph)
NEXT_PUBLIC_API_QUERY_ENDPOINT=http://localhost:8010/api/query/sparql/

# Upload RDF/TTL/JSON-LD files representing Knowledge Graph triples
NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_ENDPOINT=http://localhost:8010/api/insert/files/knowledge-graph-triples

# all job status
NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT=http://localhost:8010/api/insert/jobs
#single job status
NEXT_PUBLIC_API_ADMIN_INSERT_ALL_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT=http://localhost:8010/api/insert/user/jobs/detail
```

---

> **Note:**  
> To use the public BrainKB instance, register for a JWT key here:  
> [API Registration](https://ingest.brainkb.org/docs#/Security/register_api_register_post)  
> Your account must be **activated by an admin** before access is granted.  

---

### 2. Run Without Docker

1. Install [Node.js](https://nodejs.org/)  
2. Install dependencies:  
   ```bash
   npm install --legacy-peer-deps
   ```
   _(use `--force` if necessary)_  
3. Start development server:  
   ```bash
   npm run dev
   ```
   Note for production, you would run the following command.
   ```bash
   npm run build
   npm start
    ```
---

### 3. Run With Docker

To clean volumes and deploy in Docker, run:

```bash
bash clean_and_deploy.sh
```

Once deployed, open [http://localhost:3000](http://localhost:3000) in your browser.

---
### 3. Run Without Docker
After installing node
```bash
npm install pm2 -g
```

#### Monitoring
```bash
pm2 list
pm2 logs nextapp
pm2 stop nextapp
pm2 delete nextapp
pm2 start nextapp
```
# Developer Documentation

## Codebase Structure

```
brainkb-ui/
├── src/
│   ├── app/                    # Next.js App Router pages and components
│   │   ├── api/               # API route handlers (Next.js API routes)
│   │   ├── components/        # React components
│   │   ├── knowledge-base/    # Knowledge base pages
│   │   ├── user/             # User dashboard and tools e.g., KG upload, NER extraction
│   │   └── ...
│   ├── config/               # Configuration files
│   │   ├── yaml/            # YAML configuration files
│   │   ├── env.ts           # Environment variable management
│   │   └── constants.ts     # Application constants
│   ├── services/            # Service layer (API clients, cache)
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
│       ├── api/            # API client utilities
│       ├── config/         # Configuration loaders
│       ├── data/           # Data transformers
│       └── ...
├── lib/                      # Library code (auth providers)
├── public/                   # Static assets
└── scripts/                  # Build and deployment scripts
```

## Key Directories and Files
**Page behavior, routing, or page-level logic**: 
#### **Pages (`/src/app/*/page.tsx`)** 
- **Key Files**:
  - `page.tsx` - Home page
  - `knowledge-base/[slug]/page.tsx` - List pages (dynamic routing)
  - `knowledge-base/[slug]/[id]/page.tsx` - Detail pages (dynamic routing)
  - `user/*/page.tsx` - User dashboard and tools e.g., KG upload, NER extraction

**Modifying API endpoints, add new backend integrations, or change request/response handling.**
#### **API Routes (`/src/app/api/*/route.ts`)** 
- **Key Files**:
  - `api/entity-query/route.ts` - SPARQL entity queries
  - `api/generic_kg_upload/route.ts` - Knowledge graph file uploads
  - `api/job-status/route.ts` - Job status polling
  - `api/resources/route.ts` - Resource CRUD operations
  - `api/ner/route.ts` - Named Entity Recognition

**Change authentication handling.**
#### **API Clients (`/src/utils/api/`)** 
- **Key Files**:
  - `api-client.ts` - Main API client with pagination support
  - `api-client-without-token.ts` - API client without authentication
  - `api-helpers.ts` - Helper functions for API requests
  - `auth.ts` - Authentication utilities


**When you need to modify or add new reusable react components for UI, add new display components, or change component behavior.**
#### **Components (`/src/app/components/`)** 
- **Key Directories**:
  - `components/data-display/` - Dynamic list and detail page components
  - `components/detail/` - Detail page specific components (provenance, related items)
  - `components/layout/` - Layout components (navbar, footer)
  - `components/ui/` - UI primitives (buttons, cards, badges)
  - `components/user/` - User-specific components

**Configure new KB pages, modify page layouts, or change data display fields.**
### `/src/config/` - Configuration
#### **YAML Files (`/src/config/yaml/`)** 
- **Key Files**:
  - `page-mapper.yaml` - Maps page slugs to their configuration files
  - `config-knowledgebases.yaml` - Knowledge base list configurations
  - `*-detail.yaml` - Detail page configurations (e.g., `genomeannotation-detail.yaml`)
  - `*-list.yaml` - List page configurations (e.g., `ner-list.yaml`)

#### Steps to configure new KB page
1. Update the `config-knowledgebases.yaml` to include page and sparql query. This is what you would see first when you visit on that particular page.
Below is an example for Genome Annotation.
```yaml
  - page: "Genome Annotation"
    title: "Genome Annotation"
    description: "Genome Annotation Data."
    slug: "genomeannotation"
    sparql_query: |-
      PREFIX bican: <https://identifiers.org/brain-bican/vocab/>
      PREFIX NIMP: <http://example.org/NIMP/>
      PREFIX biolink: <https://w3id.org/biolink/vocab/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      SELECT DISTINCT ?entity ?label
      WHERE {
      GRAPH <https://test-upload.com/> {
          ?entity biolink:category "bican:GenomeAnnotation"^^<http://www.w3.org/2001/XMLSchema#anyURI>;
              rdfs:label ?label;
        }
      }
    default_kb: false

```
2. Create a detail YAML file (e.g., `myentity-detail.yaml`) for the detail view. Below is an example for genome annotation. See `YAML Configuration Reference` for details.
```yaml
type: "detail"
route: "/knowledge-base/genomeannotation"
slug: "genomeannotation"
backLink: "/knowledge-base/genomeannotation"
title: "Genome Annotation"
dataSource:
  type: "sparql"
  endpoint: "/api/entity-query"
  idParam: "id"
  cardConfigFile: "genomeannotation_card.yaml"
tabs:
  - id: "summary"
    label: "Summary"
    sections:
      - title: "Summary"
        layout: "default"
        # Fields will be auto-generated from data
  - id: "related-info"
    label: "Related Info"
    type: "related"
  - id: "contributors"
    label: "Contributors"
    type: "provenance"
  - id: "revision-history"
    label: "Revision History"
    type: "provenance"
showProvenance: false
showRelated: true
```
Make sure you have `*_card.ymal` page to show card, in our case `genomeannotation_card.yaml`. This will contain the SPARQL query.
```yaml

#EntityView:
id: ui:1
name: GenomeAnnotation_card
slug: genomeannotation
description: Genome Annotation
boxes:
  - box:
    slug: summarybox
    id: ui:2
    name: Summary
    cardtype: card
    box_header:
      key: id
    sparql_query: |-
        PREFIX NIMP: <http://example.org/NIMP/>
                PREFIX prov: <http://www.w3.org/ns/prov#>
                PREFIX biolink: <https://w3id.org/biolink/vocab/>
                
                SELECT DISTINCT ?subject ?predicate ?object ?category_type
                WHERE {
                GRAPH <https://test-upload.com/> {
                  {  BIND(<{0}> AS ?id)
                      ?subject ?predicate ?id . }
                      UNION
                      { BIND(<{0}> AS ?id)
                      ?id ?predicate ?object . }
                      UNION
                      { BIND(<{0}> AS ?id)
                      ?subject ?id ?object . }
                      
                      OPTIONAL {
                      ?id prov:wasDerivedFrom ?derivedFrom .
                      ?derivedFrom biolink:category ?category_type .
                      }
                  }
              }
    box_additional_info:
      is_iterable: true
      properties:
        - key: Source Derived From
          sparql_query: |-
            PREFIX NIMP:   <http://example.org/NIMP/>
            PREFIX prov:   <http://www.w3.org/ns/prov#>
            PREFIX biolink: <https://w3id.org/biolink/vocab/>
            
            SELECT DISTINCT ?subject ?predicate ?object ?category_type
            WHERE {
              GRAPH <https://test-upload.com/> {
            
                # focus_id is either the root itself or any *direct* wasDerivedFrom target
                #{
                #  VALUES ?focus_id { <{0}> }
                #}
                #UNION
                {
                  <{0}> prov:wasDerivedFrom ?focus_id .
                }
            
                # Neighborhood of each focus_id
                {
                  # ... as object
                  ?subject ?predicate ?focus_id .
                }
                UNION
                {
                  # ... as subject (but do NOT follow its own wasDerivedFrom further)
                  ?focus_id ?predicate ?object .
                  FILTER (?predicate != prov:wasDerivedFrom)
                }
                UNION
                {
                  # ... as predicate
                  ?subject ?focus_id ?object .
                }
            
                # Category of the focus node itself
                OPTIONAL {
                  ?focus_id biolink:category ?category_type .
                }
              }
            }

```
3. Configure the `page-mapper.yaml` , i.e., update it to add new page information.
```yaml
PageMapper:
  # List pages
  - type: "list"
    slug: "ner"
    filename: "ner-list.yaml"
  
  # Detail pages
  - type: "detail"
    slug: "ner"
    filename: "ner-detail.yaml"
  
  - type: "detail"
    slug: "myentity"
    filename: "myentity-detail.yaml"
```
For our genomeannotation page, we will add new entry.
```yaml
PageMapper:
  # List pages
  - type: "list"
    slug: "ner"
    filename: "ner-list.yaml"
  
  # Detail pages
  - type: "detail"
    slug: "ner"
    filename: "ner-detail.yaml"
  
  - type: "detail"
    slug: "myentity"
    filename: "myentity-detail.yaml"
    
  - type: "detail"
    slug: "genomeannotation"
    filename: "genomeannotation-detail.yaml"
```
Finally, add it to the `NavBar`. That's it, you should have the genome annotation page added.


### YAML Configuration Reference

#### List Page Configuration for API-based e.g., NER, Resources

```yaml
type: "list"                    # Required: must be "list"
route: "/knowledge-base/slug"  # Required: page route
slug: "slug"                   # Required: unique identifier
title: "Page Title"            # Required: page title
description: "Description"     # Optional: page description
dataSource:                    # Required: data source configuration
  type: "api-get"              # Required: "api-get" or "api-post"
  endpoint: "NEXT_PUBLIC_ENV_VAR_NAME"  # Required: environment variable name (e.g., "NEXT_PUBLIC_NER_GET_ENDPOINT")
  apiRoute: "/api/route"       # Required: Next.js API route (e.g., "/api/ner")
  params:                       # Optional: additional parameters
    tokenEndpointType: "query"  # Optional: "ml", "query", or "default" (default: "query")
    useAuth: true              # Optional: enable/disable auth (default: true)
columns:                       # Required: column definitions
  - key: "field_name"          # Required: field key from API response
    label: "Display Label"     # Required: column header
    type: "text"               # Required: "text", "link", "badge", "date", "array"
    linkPath: "/knowledge-base/slug"  # Optional: for "link" type (base path for links)
    badgeVariant: "default"    # Optional: for "badge" type
    arraySeparator: ", "       # Optional: for "array" type
itemsPerPage: 50              # Optional: items per page (default: 50)
search:                       # Optional: search configuration
  enabled: true               # Required: enable/disable search
  placeholder: "Search..."    # Optional: search placeholder text
```

Below is an example for resources list page.
```yaml
type: "list"
route: "/knowledge-base/resources"
slug: "resources"
title: "Structured Resources"
description: "Browse extracted resources from neuroscience publications, including models, code, datasets, and benchmarks."
dataSource:
  type: "api-get"
  endpoint: "NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT"
  apiRoute: "/api/resources"
  params:
    tokenEndpointType: "ml"  # Options: "ml", "query", "default" (default: "query")
    useAuth: true  # Optional: set to false to disable auth (default: true)
  dataExtractor: "extractResourceData"
columns:
  - key: "name"
    label: "Name"
    type: "link"
    linkPath: "/knowledge-base/resources"
  - key: "category"
    label: "Category"
    type: "text"
  - key: "type"
    label: "Type"
    type: "text"
  - key: "judge_score"
    label: "Judge Score"
    type: "text"
itemsPerPage: 50
search:
  enabled: true
  placeholder: "Search resources by name, category, type, description..."
```

#### Detail Page Configuration for SPARQL-based page

```yaml
type: "detail"                 # Required: must be "detail"
route: "/knowledge-base/slug" # Required: page route
slug: "slug"                  # Required: unique identifier
backLink: "/knowledge-base/slug" # Required: back navigation link
title: "Page Title"           # Required: page title
dataSource:                   # Required: data source configuration
  type: "sparql"              # Required: "sparql"
  endpoint: "/api/entity-query"  # Required: Next.js API route (no env var needed)
  idParam: "id"               # Optional: ID parameter name (default: "id")
  cardConfigFile: "entity_card.yaml"  # Required: card configuration file name
tabs:                         # Required: tab definitions
  - id: "summary"             # Required: unique tab identifier
    label: "Summary"          # Required: tab label
    sections:                 # Optional: field sections
      - title: "Summary"      # Required: section title
        layout: "default"     # Optional: layout type (default: "default")
        # Fields will be auto-generated from card config file
  - id: "related-info"        # Required: unique tab identifier
    label: "Related Info"     # Required: tab label
    type: "related"           # Required: special tab type
  - id: "contributors"        # Required: unique tab identifier
    label: "Contributors"     # Required: tab label
    type: "provenance"        # Required: special tab type
  - id: "revision-history"    # Required: unique tab identifier
    label: "Revision History" # Required: tab label
    type: "provenance"        # Required: special tab type
showProvenance: false         # Optional: show provenance tab (default: true)
showRelated: true             # Optional: show related items (default: false)
```

