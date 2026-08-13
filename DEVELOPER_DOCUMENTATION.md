# Developer Documentation

This document provides comprehensive developer documentation for the BrainKB UI project, including the Job Status page implementation and Knowledge Base page configuration instructions.

---

## Table of Contents

1. [Codebase Structure](#codebase-structure)
   - [Directory Overview](#directory-overview)
   - [Key Directories and Files](#key-directories-and-files)

2. [Job Status Page Developer Documentation](#job-status-page-developer-documentation)
   - [Overview](#overview)
   - [Features](#features)
   - [API Endpoints](#api-endpoints)
   - [Environment Variables](#environment-variables)
   - [Component Structure](#component-structure)
   - [State Management](#state-management)
   - [Polling Mechanism](#polling-mechanism)
   - [Job Status Types](#job-status-types)
   - [Error Handling](#error-handling)

3. [Knowledge Base Page Configuration](#knowledge-base-page-configuration)
   - [Overview](#overview-1)
   - [Configuration Files](#configuration-files)
   - [Creating a New List Page](#creating-a-new-list-page)
   - [Creating a New Detail Page](#creating-a-new-detail-page)
   - [SPARQL-Based Pages](#sparql-based-pages)
   - [Page Mapper Configuration](#page-mapper-configuration)
   - [YAML Configuration Reference](#yaml-configuration-reference)

---

## Codebase Structure

### Directory Overview

```
brainkb-ui/
├── src/
│   ├── app/                    # Next.js App Router pages and components
│   │   ├── api/               # API route handlers (Next.js API routes)
│   │   ├── components/        # React components
│   │   ├── knowledge-base/    # Knowledge base pages
│   │   ├── user/             # User dashboard and tools (e.g., KG upload, NER extraction)
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

### Key Directories and Files

#### **Pages (`/src/app/*/page.tsx`)**

**When to modify:** Page behavior, routing, or page-level logic.

**Key Files:**
- `page.tsx` - Home page
- `knowledge-base/[slug]/page.tsx` - List pages (dynamic routing)
- `knowledge-base/[slug]/[id]/page.tsx` - Detail pages (dynamic routing)
- `user/*/page.tsx` - User dashboard and tools (e.g., KG upload, NER extraction)

#### **API Routes (`/src/app/api/*/route.ts`)**

**When to modify:** Modifying API endpoints, adding new backend integrations, or changing request/response handling.

**Key Files:**
- `api/entity-query/route.ts` - SPARQL entity queries
- `api/generic_kg_upload/route.ts` - Knowledge graph file uploads
- `api/job-status/route.ts` - Job status polling
- `api/job-details/route.ts` - Job details retrieval
- `api/resources/route.ts` - Resource CRUD operations
- `api/ner/route.ts` - Named Entity Recognition

#### **API Clients (`/src/utils/api/`)**

**When to modify:** Change authentication handling or API request logic.

**Key Files:**
- `api-client.ts` - Main API client with pagination support
- `api-client-without-token.ts` - API client without authentication
- `api-helpers.ts` - Helper functions for API requests
- `auth.ts` - Authentication utilities

#### **Components (`/src/app/components/`)**

**When to modify:** When you need to modify or add new reusable React components for UI, add new display components, or change component behavior.

**Key Directories:**
- `components/data-display/` - Dynamic list and detail page components
- `components/detail/` - Detail page specific components (provenance, related items)
- `components/layout/` - Layout components (navbar, footer)
- `components/ui/` - UI primitives (buttons, cards, badges)
- `components/user/` - User-specific components

#### **Configuration (`/src/config/`)**

**When to modify:** Configure new KB pages, modify page layouts, or change data display fields.

**YAML Files (`/src/config/yaml/`):**
- `page-mapper.yaml` - Maps page slugs to their configuration files
- `config-knowledgebases.yaml` - Knowledge base list configurations
- `*-detail.yaml` - Detail page configurations (e.g., `genomeannotation-detail.yaml`)
- `*-list.yaml` - List page configurations (e.g., `ner-list.yaml`)

**TypeScript Files:**
- `env.ts` - Environment variable management and type-safe access
- `constants.ts` - Application constants

#### **Services (`/src/services/`)**

**When to modify:** Service layer logic, caching, or API service abstractions.

**Key Files:**
- `api/base-service.ts` - Base service class
- `cache/cache-service.ts` - Caching utilities
- `query-service/apiService.ts` - Query service API client

#### **Types (`/src/types/`)**

**When to modify:** Adding or modifying TypeScript type definitions.

**Key Files:**
- `api.ts` - API-related types
- `entities.ts` - Entity type definitions
- `page-config.ts` - Page configuration types
- `user.ts` - User-related types

#### **Utils (`/src/utils/`)**

**When to modify:** Utility functions, helpers, or data transformation logic.

**Key Directories:**
- `api/` - API client utilities and authentication
- `config/` - Configuration loaders (e.g., `page-config-loader.ts`)
- `data/` - Data transformers and SPARQL binding utilities
- `error/` - Error handling utilities
- `formatting/` - Date and data formatting utilities
- `hooks/` - Custom React hooks

#### **Library Code (`/lib/`)**

**When to modify:** Authentication providers and library-level code.

**Key Files:**
- `auth.ts` - Authentication configuration
- `orcid_provider.ts` - ORCID OAuth provider

#### **Static Assets (`/public/`)**

**When to modify:** Adding images, icons, or other static files.

**Key Files:**
- `brainkb_logo.png` - Application logo
- `default-triple.jsonld` - Default JSON-LD template
- `treeData.json` - Tree data for visualization

#### **Scripts (`/scripts/`)**

**When to modify:** Build, deployment, or maintenance scripts.

**Key Files:**
- `warm-cache.mjs` - Cache warming script

---

## Job Status Page Developer Documentation

### Overview

The Job Status page (`/user/job-status`) provides a comprehensive interface for monitoring and managing knowledge graph ingestion jobs. It displays real-time job progress, processing history, and provides recovery options for stuck jobs.

**Location:** `src/app/user/job-status/page.tsx`

### Features

- **Real-time Job Monitoring**: Automatic polling of job status every 5 seconds
- **Job Details Modal**: Detailed view with progress bars, file counts, and processing information
- **Job Status Display**: Visual status indicators (pending, running, done, partial, failed, error)
- **Progress Tracking**: Progress bars showing completion percentage
- **File Processing**: Display of processed vs total files
- **Date Formatting**: Human-readable timestamps for job start times
- **Error Handling**: Graceful error messages and fallback states

### API Endpoints

The Job Status page uses the following API endpoints:

#### 1. Job List Endpoint

**Route:** `/api/job-status`  
**Method:** `GET`  
**Query Parameters:**
- `user_id` (required): User ID for filtering jobs
- `limit` (optional): Maximum number of jobs to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response Format:**
```json
{
  "jobs": [
    {
      "job_id": "string",
      "status": "running" | "done" | "partial" | "failed" | "error" | "pending",
      "progress_percent": 0-100,
      "processed_files": 0,
      "total_files": 0,
      "success_count": 0,
      "fail_count": 0,
      "start_time": 1234567890,
      "summary": { ... }
    }
  ]
}
```

#### 2. Job Details Endpoint

**Route:** `/api/job-details`  
**Method:** `GET`  
**Query Parameters:**
- `user_id` (required): User ID
- `job_id` (required): Job ID to fetch details for

**Response Format:**
```json
{
  "job_id": "string",
  "status": "string",
  "progress_percent": 0-100,
  "processed_files": 0,
  "total_files": 0,
  "success_count": 0,
  "fail_count": 0,
  "start_time": 1234567890,
  "summary": {
    "total_files": 0,
    "success_count": 0,
    "fail_count": 0,
    "success_rate_percent": 0-100,
    "total_bytes": 0,
    "total_bytes_human": "string",
    "failures": [...]
  },
  "message": "string",
  "error": "string"
}
```

### Environment Variables

The following environment variables are required for the Job Status page:

```env
# Job Status Endpoint (List all jobs for a user)
NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT=http://localhost:8010/api/insert/jobs?user_id={user_id}&limit={limit}&offset={offset}

# Job Details Endpoint (Get detailed information for a specific job)
NEXT_PUBLIC_API_ADMIN_INSERT_ALL_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT=http://localhost:8010/api/insert/user/jobs/detail?job_id={job_id}&user_id={user_id}
```

**Configuration Location:** `src/config/env.ts`

The environment configuration is managed through the `EnvConfigManager` singleton class:

```typescript
import { clientEnv } from '@/src/config/env';

// Access job status endpoint
const endpoint = clientEnv.kgJobStatusEndpoint;

// Access job details endpoint
const detailsEndpoint = clientEnv.kgAllJobsStatusEndpoint;
```

### Component Structure

The Job Status page is a client component built with React and Next.js:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { clientEnv } from "../../../config/env";
import { format } from "date-fns";
```

**Key Interfaces:**

```typescript
interface Job {
  job_id?: string;
  id?: string;
  status?: string;
  state?: string;
  progress_percent?: number;
  processed_files?: number;
  total_files?: number;
  success_count?: number;
  fail_count?: number;
  start_time?: number;
  startTime?: number;
  created_at?: string | number;
  summary?: JobSummary;
  message?: string;
  error?: string;
}

interface JobSummary {
  total_files?: number;
  success_count?: number;
  fail_count?: number;
  success_rate_percent?: number;
  total_bytes?: number;
  total_bytes_human?: string;
  failures?: JobFailure[];
  // ... additional fields
}
```

### State Management

The component uses React hooks for state management:

```typescript
const [jobs, setJobs] = useState<Job[]>([]);
const [selectedJob, setSelectedJob] = useState<Job | null>(null);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);
const [refreshing, setRefreshing] = useState<boolean>(false);
```

**State Flow:**
1. **Initial Load**: `fetchJobs()` is called when the component mounts
2. **Polling**: `useEffect` sets up an interval to refresh jobs every 5 seconds
3. **Job Selection**: Clicking "View Details" calls `fetchJobDetails()` and sets `selectedJob`
4. **Modal Display**: `selectedJob` state controls the visibility of the job details modal

### Polling Mechanism

The page implements automatic polling to keep job status up-to-date:

```typescript
useEffect(() => {
  if (session) {
    fetchJobs();
    // Refresh every 5 seconds
    const interval = setInterval(() => {
      fetchJobs();
    }, 5000);
    return () => clearInterval(interval);
  }
}, [session]);
```

**Polling Behavior:**
- Polls every 5 seconds when user is authenticated
- Stops polling when component unmounts
- Only polls when `session` is available

### Job Status Types

The backend API returns the following status values:

- **`done`**: All files succeeded (fail_count = 0, success_count > 0)
- **`partial`**: Some succeeded, some failed (both success_count > 0 and fail_count > 0)
- **`failed`**: All files failed (success_count = 0, fail_count > 0)
- **`error`**: Job crashed/failed completely (system error)
- **`running`**: Job is in progress
- **`pending`**: Job hasn't started yet

**Status Color Mapping:**

```typescript
const getStatusColor = (status: string | undefined): string => {
  const statusValue = (status || '').toLowerCase();
  if (statusValue === 'completed' || statusValue === 'success' || statusValue === 'done') {
    return 'text-green-600 dark:text-green-400';
  } else if (statusValue === 'failed' || statusValue === 'error') {
    return 'text-red-600 dark:text-red-400';
  } else if (statusValue === 'processing' || statusValue === 'running' || statusValue === 'in_progress') {
    return 'text-blue-600 dark:text-blue-400';
  }
  return 'text-gray-600 dark:text-gray-400';
};
```

### Error Handling

The component implements comprehensive error handling:

1. **API Errors**: Catches and displays error messages from API responses
2. **Missing Configuration**: Validates environment variables before making requests
3. **Authentication Errors**: Redirects to login if user is not authenticated
4. **Fallback States**: Shows appropriate messages when jobs are not found

**Error Display:**
```typescript
{error && (
  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
    <p className="text-red-800 dark:text-red-200">{error}</p>
  </div>
)}
```

---

## Knowledge Base Page Configuration

### Overview

The Knowledge Base pages are dynamically configured using YAML files. This allows developers to create new list and detail pages without modifying React components. The system supports both API-based and SPARQL-based data sources.

**Key Components:**
- `DynamicListPage`: Renders list pages from YAML configuration
- `DynamicDetailPage`: Renders detail pages from YAML configuration
- `page-config-loader.ts`: Loads and parses YAML configurations

### Configuration Files

The configuration system uses the following file structure:

```
src/config/yaml/
├── page-mapper.yaml              # Maps page slugs to configuration files
├── config-knowledgebases.yaml    # SPARQL-based knowledge base configurations
├── ner-list.yaml                 # NER list page configuration
├── ner-detail.yaml               # NER detail page configuration
├── resources-list.yaml           # Resources list page configuration
├── resources-detail.yaml         # Resources detail page configuration
└── [entity]-detail.yaml          # Entity-specific detail configurations
```

### Creating a New List Page

To create a new list page, follow these steps:

#### Step 1: Create YAML Configuration File

Create a new YAML file in `src/config/yaml/` (e.g., `myentity-list.yaml`):

```yaml
type: "list"
route: "/knowledge-base/myentity"
slug: "myentity"
title: "My Entity List"
description: "Browse and search my entities."
dataSource:
  type: "api-get"  # Options: "api-get", "api-post", "sparql"
  endpoint: "NEXT_PUBLIC_MY_ENTITY_ENDPOINT"  # Environment variable name
  apiRoute: "/api/myentity"  # Next.js API route
  params:
    tokenEndpointType: "query"  # Options: "ml", "query", "default"
    useAuth: true  # Optional: set to false to disable auth (default: true)
columns:
  - key: "id"
    label: "ID"
    type: "link"
    linkPath: "/knowledge-base/myentity"
  - key: "name"
    label: "Name"
    type: "text"
  - key: "status"
    label: "Status"
    type: "badge"
    badgeVariant: "secondary"
itemsPerPage: 50
search:
  enabled: true
  placeholder: "Search entities..."
```

#### Step 2: Register in Page Mapper

Add an entry to `src/config/yaml/page-mapper.yaml`:

```yaml
PageMapper:
  - type: "list"
    slug: "myentity"
    filename: "myentity-list.yaml"
```

#### Step 3: Create API Route (if using API-based data source)

Create a Next.js API route at `src/app/api/myentity/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuthHeaders } from '@/src/utils/api/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  // Extract query parameters
  const limit = searchParams.get('limit') || '50';
  const offset = searchParams.get('offset') || '0';
  
  // Get endpoint from environment
  const endpoint = process.env.NEXT_PUBLIC_MY_ENTITY_ENDPOINT;
  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint not configured' }, { status: 500 });
  }
  
  // Make authenticated request to backend
  const url = `${endpoint}?limit=${limit}&offset=${offset}`;
  const response = await fetch(url, {
    headers: withAuthHeaders('query'),
  });
  
  if (!response.ok) {
    return NextResponse.json(
      { error: `Backend error: ${response.status}` },
      { status: response.status }
    );
  }
  
  const data = await response.json();
  return NextResponse.json(data);
}
```

#### Step 4: Access the Page

Navigate to `/knowledge-base/myentity` to view the new list page.

### Creating a New Detail Page

To create a new detail page:

#### Step 1: Create Detail YAML Configuration

**For SPARQL-based pages (most common):**

Create `src/config/yaml/myentity-detail.yaml`:

```yaml
type: "detail"
route: "/knowledge-base/myentity"
slug: "myentity"
backLink: "/knowledge-base/myentity"
title: "My Entity Details"
dataSource:
  type: "sparql"
  endpoint: "/api/entity-query"  # Next.js API route
  idParam: "id"
  cardConfigFile: "myentity_card.yaml"  # Card configuration file
tabs:
  - id: "summary"
    label: "Summary"
    sections:
      - title: "Summary"
        layout: "default"
        # Fields will be auto-generated from card config file
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

**For API-based pages:**

Create `src/config/yaml/myentity-detail.yaml`:

```yaml
type: "detail"
route: "/knowledge-base/myentity"
slug: "myentity"
backLink: "/knowledge-base/myentity"
title: "My Entity Details"
dataSource:
  type: "api-get"
  endpoint: "NEXT_PUBLIC_MY_ENTITY_ENDPOINT"  # Environment variable name
  apiRoute: "/api/myentity"  # Next.js API route
  idParam: "id"  # Query parameter name for entity ID
  params:
    tokenEndpointType: "query"
    useAuth: true
tabs:
  - id: "overview"
    label: "Overview"
    sections:
      - title: "Basic Info"
        layout: "default"
        fields:
          - key: "id"
            label: "ID"
            type: "text"
          - key: "name"
            label: "Name"
            type: "text"
          - key: "description"
            label: "Description"
            type: "text"
  - id: "metadata"
    label: "Metadata"
    sections:
      - title: "Metadata"
        layout: "default"
        fields:
          - key: "created_at"
            label: "Created At"
            type: "date"
          - key: "tags"
            label: "Tags"
            type: "array"
            arraySeparator: ", "
showProvenance: true
showRelated: true
```

#### Step 2: Register in Page Mapper

Add to `src/config/yaml/page-mapper.yaml`:

```yaml
PageMapper:
  - type: "detail"
    slug: "myentity"
    filename: "myentity-detail.yaml"
```

#### Step 3: Create Detail API Route (API-based only)

**Note:** For SPARQL-based pages, you don't need to create a custom API route - they use the existing `/api/entity-query` endpoint.

**For API-based pages only**, create `src/app/api/myentity/[id]/route.ts` or modify the existing route to handle detail requests:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuthHeaders } from '@/src/utils/api/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const endpoint = process.env.NEXT_PUBLIC_MY_ENTITY_ENDPOINT;
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint not configured' }, { status: 500 });
  }
  
  const url = `${endpoint}/${id}`;
  const response = await fetch(url, {
    headers: withAuthHeaders('query'),
  });
  
  if (!response.ok) {
    return NextResponse.json(
      { error: `Backend error: ${response.status}` },
      { status: response.status }
    );
  }
  
  const data = await response.json();
  return NextResponse.json(data);
}
```

### SPARQL-Based Pages

For SPARQL-based pages, use `config-knowledgebases.yaml`:

#### Step 1: Add to config-knowledgebases.yaml

```yaml
pages:
  - page: "My Entity"
    title: "My Entity"
    slug: "myentity"
    description: "Description of my entity type."
    sparql_query: |-
      PREFIX bican: <https://identifiers.org/brain-bican/vocab/>
      PREFIX biolink: <https://w3id.org/biolink/vocab/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      SELECT DISTINCT ?entity ?label
      WHERE {
        GRAPH <https://test-upload.com/> {
          ?entity biolink:category "bican:MyEntity"^^<http://www.w3.org/2001/XMLSchema#anyURI>;
            rdfs:label ?label;
        }
      }
    default_kb: false
```

#### Step 2: Create Detail Configuration
##
Create a detail YAML file (e.g., `myentity-detail.yaml`) for the detail view:

```yaml
type: "detail"
route: "/knowledge-base/myentity"
slug: "myentity"
title: "My Entity Details"
backLink: "/knowledge-base/myentity"
dataSource:
  type: "sparql"
  endpoint: "/api/knowledge-base"
  cardConfigFile: "myentity_card.yaml"  # card configuration
  params:
    slug: "myentity"
    sparqlQuery: ""  # Will be populated from config-knowledgebases.yaml
tabs:
  - label: "Overview"
    fields:
      - key: "entity"
        label: "Entity"
        type: "link"
      - key: "label"
        label: "Label"
        type: "text"
```

### Page Mapper Configuration

The `page-mapper.yaml` file maps page slugs to their configuration files:

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

**Configuration Rules:**
- Each page must have a unique `slug`
- `type` must be either `"list"` or `"detail"`
- `filename` must match an existing YAML file in `src/config/yaml/`
- List and detail pages can share the same slug (e.g., `ner`)

### YAML Configuration Reference

#### List Page Configuration

**For API-based data sources:**

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

**For SPARQL-based data sources:**

```yaml
type: "list"
route: "/knowledge-base/slug"
slug: "slug"
title: "Page Title"
description: "Description"
dataSource:
  type: "sparql"
  endpoint: "/api/entity-query"  # Next.js API route (no env var needed)
  # Note: SPARQL query is typically defined in config-knowledgebases.yaml
columns:
  - key: "entity"
    label: "Entity"
    type: "link"
    linkPath: "/knowledge-base/slug"
itemsPerPage: 50
search:
  enabled: true
  placeholder: "Search..."
```

#### Detail Page Configuration

**For SPARQL-based data sources (most common):**

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

**For API-based data sources:**

```yaml
type: "detail"
route: "/knowledge-base/slug"
slug: "slug"
backLink: "/knowledge-base/slug"
title: "Page Title"
dataSource:
  type: "api-get"             # Required: "api-get" or "api-post"
  endpoint: "NEXT_PUBLIC_ENV_VAR_NAME"  # Required: environment variable name
  apiRoute: "/api/route"       # Required: Next.js API route
  idParam: "id"               # Optional: ID parameter name (default: "id")
  params:                     # Optional: additional parameters
    tokenEndpointType: "query"
    useAuth: true
tabs:                         # Required: tab definitions
  - id: "overview"            # Required: unique tab identifier
    label: "Overview"         # Required: tab label
    sections:                 # Optional: field sections
      - title: "Basic Info"   # Required: section title
        layout: "default"     # Optional: layout type
        fields:               # Optional: explicit field definitions
          - key: "field_name" # Required: field key
            label: "Label"    # Required: field label
            type: "text"      # Required: field type
            linkPath: "/path" # Optional: for "link" type
            arraySeparator: ", "  # Optional: for "array" type
showProvenance: true         # Optional: show provenance tab
showRelated: true             # Optional: show related items
relatedConfig:                # Optional: related items configuration
  title: "Related Items"
  fetchFunction: "functionName"
```

**Key Differences:**

- **SPARQL-based**: Uses `endpoint` as the Next.js API route directly (e.g., `/api/entity-query`). Requires `cardConfigFile` for field definitions. No `apiRoute` or environment variable needed.
- **API-based**: Uses `endpoint` as an environment variable name (e.g., `NEXT_PUBLIC_NER_GET_ENDPOINT`) and `apiRoute` as the Next.js API route (e.g., `/api/ner`).
- **Tabs**: Use `id` (unique identifier), `label`, `sections` (for field organization), and `type` (for special tab types like "related" or "provenance").

#### Field Types

- **`text`**: Plain text display
- **`link`**: Clickable link (requires `linkPath`)
- **`badge`**: Badge/chip display (supports `badgeVariant`)
- **`date`**: Date formatting
- **`array`**: Array display (supports `arraySeparator`)

#### Badge Variants

- `default`: Default badge style
- `secondary`: Secondary badge style
- `success`: Success/green badge
- `warning`: Warning/yellow badge
- `danger`: Danger/red badge

### Environment Variable Configuration

Add new endpoints to `src/config/env.ts`:

```typescript
interface EnvConfig {
  // ... existing config
  NEXT_PUBLIC_MY_ENTITY_ENDPOINT?: string;
}

class EnvConfigManager {
  // ... existing methods
  
  public get myEntityEndpoint(): string | undefined {
    return this.config.NEXT_PUBLIC_MY_ENTITY_ENDPOINT;
  }
  
  // Add to resolveEnvVar mapping
  public resolveEnvVar(envVarName: string): string | undefined {
    const envVarMap: Record<string, () => string | undefined> = {
      // ... existing mappings
      'NEXT_PUBLIC_MY_ENTITY_ENDPOINT': () => this.myEntityEndpoint,
    };
    // ... rest of method
  }
}
```

### Testing Your Configuration

1. **Verify YAML Syntax**: Ensure your YAML files are valid (no syntax errors)
2. **Check Page Mapper**: Ensure your page is registered in `page-mapper.yaml`
3. **Test API Routes**: Verify your API routes return expected data
4. **Check Environment Variables**: Ensure all required environment variables are set
5. **Test Navigation**: Navigate to your page and verify it loads correctly

### Common Issues and Solutions

#### Issue: Page not found (404)

**Solution:**
- Verify the page is registered in `page-mapper.yaml`
- Check that the YAML file exists in `src/config/yaml/`
- Ensure the `slug` matches the URL path

#### Issue: Data not loading

**Solution:**
- Verify the API route exists and is accessible
- Check environment variables are set correctly
- Verify authentication headers are being sent
- Check browser console for API errors

#### Issue: Columns not displaying

**Solution:**
- Verify `columns` array is defined in YAML
- Check that `key` values match API response fields
- Ensure `type` is one of the supported types

#### Issue: Detail page not loading

**Solution:**
- Verify detail configuration exists in `page-mapper.yaml`
- Check that the API route handles detail requests (with ID parameter)
- Ensure `idParam` matches the query parameter name

---

## Additional Resources

- **API Configuration**: See `API_CONFIGURATION.md` for API endpoint documentation
- **Environment Setup**: See `README.md` for environment variable setup
- **Component Documentation**: See component files in `src/app/components/` for component-specific documentation

---

## Contributing

When adding new pages or modifying existing configurations:

1. Follow the YAML configuration structure outlined above
2. Register all new pages in `page-mapper.yaml`
3. Add required environment variables to `.env.local` and `src/config/env.ts`
4. Test thoroughly before committing
5. Update this documentation if adding new features or configuration options

---

**Last Updated:** 2025-01-07
