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

## Important

The value of `http://brainkb-unified` must be configured to match the deployment environment:

- **Docker deployment (UI and microservices on the same machine):**  
  Configure and reference the `brainkb-unified` Docker network. Please note there are some known issues--UI not recognizing some endpoints--and I am working on fixing this. 

- **UI running outside Docker (for example, via `pm2`):**  
  Use `http://localhost` as the endpoint.

- **Distributed deployment (UI and microservices on different hosts, such as in AWS):**  
  Update the value to the appropriate service URL or public endpoint.

Failure to update this value may result in connectivity issues between the UI and the backend services.
