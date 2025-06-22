# 🧠 BrainKB UI

A user interface for interacting with the BrainKB knowledge graph infrastructure.

---

## 📸 Screenshots
| Home | About | Admin |
|------|-------|-----|
| ![](images/home.png) | ![](images/about.png) | ![](images/admin.png) |

---

## 🚀 Getting Started

To deploy the BrainKB UI locally, follow these steps.

> ⚠️ Important Notes: These API configuration requires deployment of the BrainKB backend service. For more see [http://docs.brainkb.org/deployment_userinterface.html](http://docs.brainkb.org/deployment_userinterface.html).
> The document is old and might refer to different branch than main, ignore that and use the main branch.
### 1. Clone the Repository & Set Up Environment

```shell
git clone https://github.com/sensein/brainkb-ui.git
cd nextjsUIapp
```

Before deployment, create and configure a `.env.local` file. Most required environment variables are documented [here](http://docs.brainkb.org/deployment_userinterface.html), but note that recent updates might not yet be reflected there.

Below is a brief description of essential environment variables:

#### 🔐 Authentication - optional unless you want to access the admin panel.
```env
GITHUB_CLIENT_ID=            # GitHub OAuth App Client ID (for login)
GITHUB_CLIENT_SECRET=        # GitHub OAuth App Client Secret
NEXTAUTH_SECRET=             # Secret used by NextAuth.js to encrypt session tokens
NEXTAUTH_URL=http://localhost:3000  # Public URL for the app (used in auth callbacks, set to localhost for local dev)
```

> **Note:** ORCID login will not work with localhost due to callback restrictions.

#### 🔑 JWT & Token Authentication
```env
NEXT_PUBLIC_JWT_USER=            # Email/username for JWT-protected API access
NEXT_PUBLIC_JWT_PASSWORD=        # Password for JWT authentication
NEXT_PUBLIC_TOKEN_ENDPOINT=      # Endpoint to obtain JWT token (e.g., https://queryservice.brainkb.org/token)
```

#### 🧠 API Configuration
```env
NEXT_PUBLIC_API_ADMIN_HOST=https://your hosturl  # Base API host

# The values of the endpoint below are not to be changed.
# SPARQL query endpoint (used for querying knowledge graph)
NEXT_PUBLIC_API_QUERY_ENDPOINT=query/sparql

# Fetch available named graphs
NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT=query/registered-named-graphs

# Upload RDF/TTL/JSON-LD files representing KG triples
NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_ENDPOINT=insert/files/knowledge-graph-triples

# Upload structured JSON files (auto-converted to KG triples)
NEXT_PUBLIC_API_ADMIN_INSERT_STRUCTURED_JSON_ENDPOINT=insert/files/structured-resource-json-to-kg
```

> **Note:**  
> To test with the deployed BrainKB instance, set `NEXT_PUBLIC_API_ADMIN_HOST` to `https://queryservice.brainkb.org`.  
> 
> You can register for a JWT-based API user at [https://ingest.brainkb.org/docs#/Security/register_api_register_post](https://ingest.brainkb.org/docs#/Security/register_api_register_post).  
> 
> **Important:** After registration, your account must be activated by an admin before you can start using the API.

### 2. Deploy without Docker
1. Install NodeJS
2. Navigate to `nextjsUIapp` and run `npm install --legacy-peer-deps` (or --force)
3. Run `npm run dev`
### 3. Deploy with Docker

Run the following command to clean existing Docker volumes and deploy:

```bash
bash clean_and_deploy.sh
```

Once deployed, open your browser and visit:  
[http://localhost:3000](http://localhost:3000)

---

## ⚠️ Important Notes

- Do **not** upgrade the Next.js version unless explicitly needed. Future versions may introduce breaking changes.
- Admin panel access may not fully work on `localhost` due to OAuth restrictions by some providers (like ORCID).
  - Just in case if you get following issue (check docker logs <container-id>) though it should not be the case as the code has been updated.

      ```shell
      2025-06-22 00:00:53 web-1  |   code: 'NO_SECRET'
      2025-06-22 00:00:53 web-1  | }
      2025-06-22 00:00:53 web-1  | Error: There is a problem with the server configuration. Check the server logs for more information.
      2025-06-22 00:00:53 web-1  |     at s (/app/.next/server/chunks/5609.js:25:19829)
      2025-06-22 00:00:53 web-1  |     at async x (/app/.next/server/chunks/8081.js:9:7184) {
      2025-06-22 00:00:53 web-1  |   digest: '279538222'
      2025-06-22 00:00:53 web-1  | }
      2025-06-22 00:00:53 web-1  | Error: There is a problem with the server configuration. Check the server logs for more information.
      2025-06-22 00:00:53 web-1  |     at s (/app/.next/server/chunks/5609.js:25:19829)
      2025-06-22 00:00:53 web-1  |     at async x (/app/.next/server/chunks/8081.js:9:7184) {
      2025-06-22 00:00:53 web-1  |   digest: '279538222'
      2025-06-22 00:00:53 web-1  | }
      ```
    create a .env file and update the docker. 
      ```shell
      NEXTAUTH_SECRET=ANY_RANDOM_STRING_SECRET
      NEXTAUTH_URL=http://localhost:3000 #FOR LOCAL DEPLOYMENT
      ```
---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
