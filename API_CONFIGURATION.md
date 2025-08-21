# API Configuration and JWT Authentication

This application now uses a centralized API service with JWT bearer token authentication to eliminate redundant API calls and improve security. The service is now dynamic, allowing different pages to use different endpoints by reading from environment variables, and supports optional bearer token authentication.

## Environment Variables Required

Add the following environment variables to your `.env.local` file:

```bash
# API Configuration
NEXT_PUBLIC_API_ADMIN_HOST=https://queryservice.brainkb.org
NEXT_PUBLIC_API_QUERY_ENDPOINT=query/sparql

# JWT Authentication (Optional)
NEXT_PUBLIC_JWT_USER=your_email@example.com
NEXT_PUBLIC_JWT_PASSWORD=your_jwt_password
NEXT_PUBLIC_TOKEN_ENDPOINT=https://queryservice.brainkb.org/token

# Bearer Token Configuration (Optional)
NEXT_PUBLIC_USE_BEARER_TOKEN=true  # Default: true, set to "false" to disable
```

## How It Works

1. **Centralized API Service**: The `ApiService` class in `src/app/services/query_service/apiService.ts` manages all API calls and JWT token authentication
2. **Dynamic Endpoints**: Each page can specify its own endpoint by reading from environment variables
3. **Optional Bearer Authentication**: Bearer token authentication is enabled by default but can be disabled globally or per request
4. **Token Caching**: JWT tokens are automatically cached and refreshed when needed
5. **Automatic Authentication**: All API calls automatically include the Bearer token in the Authorization header (when enabled)
6. **Eliminated Redundancy**: No more duplicate API configuration across components

## Usage

### Basic Usage (Default Endpoint with Bearer Token)
```typescript
import { getData } from "@/src/app/components/getData";

// Uses default endpoint from environment with bearer token (default)
const response = await getData({ sparql_query: "YOUR_QUERY" });
```

### Dynamic Endpoint Usage
```typescript
import { getData } from "@/src/app/components/getData";

// Read endpoint from environment variable for this specific page
const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
const response = await getData({ sparql_query: "YOUR_QUERY" }, endpoint);
```

### Without Bearer Token
```typescript
import { getData } from "@/src/app/components/getData";

// Disable bearer token for this specific request
const response = await getData({ sparql_query: "YOUR_QUERY" }, undefined, undefined, false);
```

### Custom Endpoint and Base URL
```typescript
import { getData } from "@/src/app/components/getData";

// Custom endpoint and base URL with bearer token
const response = await getData(
  { sparql_query: "YOUR_QUERY" }, 
  "custom/endpoint", 
  "https://custom-base-url.com",
  true  // Enable bearer token
);
```

## Bearer Token Configuration

### Global Configuration
Set in your `.env.local` file:
```bash
# Enable bearer token (default)
NEXT_PUBLIC_USE_BEARER_TOKEN=true

# Disable bearer token globally
NEXT_PUBLIC_USE_BEARER_TOKEN=false
```

### Per-Request Configuration
```typescript
// With bearer token (default)
const response1 = await getData(queryParams, endpoint, baseUrl, true);

// Without bearer token
const response2 = await getData(queryParams, endpoint, baseUrl, false);

// Use global setting
const response3 = await getData(queryParams, endpoint, baseUrl);
```

## Page-Specific Configuration

You can now configure different endpoints for different pages by setting environment variables:

```bash
# For specific pages, you can override the default endpoint
NEXT_PUBLIC_KNOWLEDGE_BASE_ENDPOINT=knowledge/query
NEXT_PUBLIC_ASSERTIONS_ENDPOINT=assertions/query
NEXT_PUBLIC_EVIDENCE_ENDPOINT=evidence/query

# You can also configure bearer token usage per page type
NEXT_PUBLIC_KNOWLEDGE_BASE_USE_BEARER=false
NEXT_PUBLIC_ASSERTIONS_USE_BEARER=true
```

Then in your page components:
```typescript
// In knowledge-base page (without bearer token)
const endpoint = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_ENDPOINT || process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
const useBearer = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_USE_BEARER !== "false";
const response = await getData(queryParams, endpoint, undefined, useBearer);

// In assertions page (with bearer token)
const endpoint = process.env.NEXT_PUBLIC_ASSERTIONS_ENDPOINT || process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
const useBearer = process.env.NEXT_PUBLIC_ASSERTIONS_USE_BEARER !== "false";
const response = await getData(queryParams, endpoint, undefined, useBearer);
```

## File Structure

```
src/app/
├── services/
│   └── query_service/
│       └── apiService.ts          # Centralized API service with JWT auth
├── api/
│   ├── auth/
│   ├── config/
│   └── ...                        # Other API routes
├── components/
│   └── getData.tsx               # Updated to use centralized service
└── ...
```

## Benefits

- ✅ Eliminates redundant API configuration
- ✅ Dynamic endpoint configuration per page
- ✅ Optional bearer token authentication
- ✅ Automatic JWT token management
- ✅ Improved security with bearer token authentication
- ✅ Centralized error handling
- ✅ Token caching for better performance
- ✅ Consistent API interface across all components
- ✅ Organized under app services directory
- ✅ Flexible configuration through environment variables
- ✅ Graceful fallback when authentication fails

## Authentication Details

The JWT token request sends a JSON payload with:
- `email`: Your email address (NEXT_PUBLIC_JWT_USER)
- `password`: Your password (NEXT_PUBLIC_JWT_PASSWORD)

The API responds with:
- `access_token`: The JWT token to use for subsequent requests
- `token_type`: Usually "Bearer"
- `expires_in`: Token expiration time in seconds

## Error Handling

- If bearer token authentication is enabled but fails, the service will log a warning and proceed without authentication
- This allows the application to continue working even if the authentication service is temporarily unavailable
- You can monitor the console for authentication warnings 