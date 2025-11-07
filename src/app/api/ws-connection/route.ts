import { NextRequest } from 'next/server';
import WebSocket from 'ws';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getAuthToken(): Promise<string> {
  const jwtUser = process.env.NEXT_PUBLIC_JWT_USER;
  const jwtPassword = process.env.NEXT_PUBLIC_JWT_PASSWORD;
  const tokenEndpoint = process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE;

  if (!jwtUser || !jwtPassword || !tokenEndpoint) {
    throw new Error('JWT credentials not configured');
  }

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: jwtUser,
        password: jwtPassword
      })
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const tokenData: TokenResponse = await response.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Failed to get JWT token:', error);
    throw new Error('Authentication failed');
  }
}

function getWebSocketUrl(endpoint: string, clientId: string, token: string): string {
  // Endpoint format: ws://localhost:8009/api/ws/extract-resources
  // Need to append clientId: ws://localhost:8009/api/ws/extract-resources/{clientId}
  const url = new URL(endpoint);
  
  // Append clientId to the pathname
  const pathname = url.pathname.endsWith('/') 
    ? `${url.pathname}${encodeURIComponent(clientId)}`
    : `${url.pathname}/${encodeURIComponent(clientId)}`;
  
  // Reconstruct the WebSocket URL
  const wsUrl = `${url.protocol}//${url.host}${pathname}`;
  
  // Add token as query parameter
  const separator = wsUrl.includes('?') ? '&' : '?';
  return `${wsUrl}${separator}token=${encodeURIComponent(token)}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const inputType = formData.get('input_type') as string;
    const endpoint = formData.get('endpoint') as string;
    const clientId = formData.get('clientId') as string;
    const openrouterApiKey = formData.get('openrouter_api_key') as string;

    console.log('Received WebSocket request:', { inputType, endpoint, clientId });

    if (!inputType) {
      return new Response(
        JSON.stringify({ error: 'Input type not provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint not provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Client ID not provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get authentication token
    let token: string;
    try {
      token = await getAuthToken();
      console.log('Authentication successful');
    } catch (error) {
      console.error('Failed to get bearer token:', error);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract input data before WebSocket connection
    const doi = inputType === 'doi' ? (formData.get('doi') as string) : null;
    const textContent = inputType === 'text' ? (formData.get('text_content') as string) : null;
    const pdfFile = inputType === 'pdf' ? (formData.get('pdf_file') as File) : null;

    // Create WebSocket URL (endpoint is already a WebSocket URL, just need to insert clientId)
    const wsUrl = getWebSocketUrl(endpoint, clientId, token);
    console.log('Connecting to WebSocket:', wsUrl);

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        let ws: WebSocket | null = null;
        let result: any = null;
        let taskId: string | null = null;
        let isComplete = false;
        let controllerClosed = false;

        // Helper function to safely enqueue data
        const safeEnqueue = (data: string) => {
          if (!controllerClosed) {
            try {
              controller.enqueue(data);
            } catch (error) {
              // Controller might be closed, mark it as such
              controllerClosed = true;
              console.warn('Attempted to enqueue after controller closed:', error);
            }
          }
        };

        // Helper function to safely close controller and WebSocket
        const safeClose = () => {
          if (!controllerClosed) {
            controllerClosed = true;
            try {
              controller.close();
            } catch (error) {
              console.warn('Error closing controller:', error);
            }
          }
          if (ws && ws.readyState === WebSocket.OPEN) {
            try {
              ws.close();
            } catch (error) {
              console.warn('Error closing WebSocket:', error);
            }
          }
        };

        try {
          // Connect to WebSocket with options to disable compression (avoids bufferUtil issues)
          ws = new WebSocket(wsUrl, {
            perMessageDeflate: false, // Disable compression to avoid bufferUtil.mask issues
          });

          ws.on('open', async () => {
            console.log('WebSocket connected');
            safeEnqueue(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to server' })}\n\n`);

            // Send start message based on input type
            if (inputType === 'doi' && doi) {
              const startMessage = {
                type: 'start',
                input_type: 'doi',
                doi: doi.trim(),
                openrouter_api_key: openrouterApiKey
              };
              if (ws) {
                ws.send(JSON.stringify(startMessage));
                console.log('Sent DOI start message:', doi);
              }
            } else if (inputType === 'text' && textContent) {
              const startMessage = {
                type: 'start',
                input_type: 'text',
                text_content: textContent.trim(),
                openrouter_api_key: openrouterApiKey
              };
              if (ws) {
                ws.send(JSON.stringify(startMessage));
                console.log('Sent text start message, length:', textContent?.length);
              }
            } else if (inputType === 'pdf' && pdfFile) {
              // Send start message for PDF
              const startMessage = {
                type: 'start',
                input_type: 'pdf',
                name: pdfFile.name,
                size: pdfFile.size,
                openrouter_api_key: openrouterApiKey
              };
              if (ws) {
                ws.send(JSON.stringify(startMessage));
                console.log('Sent PDF start message:', pdfFile.name, 'size:', pdfFile.size);

                // Upload PDF file in chunks
                const chunkSize = 64 * 1024; // 64KB
                const arrayBuffer = await pdfFile.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                
                let offset = 0;
                while (offset < buffer.length) {
                  const chunk = buffer.slice(offset, offset + chunkSize);
                  ws.send(chunk);
                  offset += chunkSize;
                  
                  const progress = Math.min(100, (offset / buffer.length) * 100);
                  safeEnqueue(`data: ${JSON.stringify({ type: 'progress', progress })}\n\n`);
                }

                // Send end message
                ws.send(JSON.stringify({ type: 'end' }));
                console.log('PDF upload complete');
              }
            } else {
              safeEnqueue(`data: ${JSON.stringify({ type: 'error', error: 'Invalid input data' })}\n\n`);
              safeClose();
            }
          });

          ws.on('message', (data: WebSocket.Data) => {
            try {
              const message = JSON.parse(data.toString());
              console.log('WebSocket message received:', JSON.stringify(message, null, 2));

              if (message.type === 'task_created') {
                taskId = message.task_id;
                safeEnqueue(`data: ${JSON.stringify({ type: 'task_created', task_id: taskId })}\n\n`);
              } else if (message.type === 'job_status' || message.type === 'job_update' || message.type === 'status') {
                const status = message.status || message.job_status || message.message;
                safeEnqueue(`data: ${JSON.stringify({ type: 'status', status: status, data: message })}\n\n`);
                
                // Check if status indicates completion
                if (status === 'completed' || status === 'done' || status === 'finished' || status === 'success') {
                  // If there's data in the message, treat it as result
                  if (message.data || message.result) {
                    result = message.data || message.result || message;
                    isComplete = true;
                    safeEnqueue(`data: ${JSON.stringify({ type: 'result', data: result })}\n\n`);
                    safeEnqueue(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                    safeClose();
                  }
                }
              } else if (message.type === 'result' || message.type === 'complete' || message.type === 'finished') {
                result = message.data || message.result || message;
                isComplete = true;
                safeEnqueue(`data: ${JSON.stringify({ type: 'result', data: result })}\n\n`);
                safeEnqueue(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                safeClose();
              } else if (message.type === 'error') {
                safeEnqueue(`data: ${JSON.stringify({ type: 'error', error: message.message || message.error || 'Unknown error' })}\n\n`);
                safeEnqueue(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                safeClose();
              } else if (message.type === 'progress') {
                safeEnqueue(`data: ${JSON.stringify({ type: 'progress', bytes: message.bytes, progress: message.progress })}\n\n`);
              } else {
                // Handle any other message types - check if it contains result data
                console.log('Unknown message type, checking for result data:', message.type);
                
                // If message has data/result fields, treat as result
                if (message.data || message.result || (message.status && (message.status === 'completed' || message.status === 'done'))) {
                  result = message.data || message.result || message;
                  isComplete = true;
                  safeEnqueue(`data: ${JSON.stringify({ type: 'result', data: result })}\n\n`);
                  safeEnqueue(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                  safeClose();
                } else {
                  // Forward as generic message
                  safeEnqueue(`data: ${JSON.stringify({ type: 'message', data: message })}\n\n`);
                }
              }
            } catch (e) {
              // Handle binary data or non-JSON messages
              if (e instanceof Error && e.message.includes('Controller is already closed')) {
                // Controller is closed, ignore this message
                console.warn('Received message after controller closed, ignoring');
              } else {
                // Actual non-JSON message or other error
                console.log('Received non-JSON message or parsing error:', e);
              }
            }
          });

          ws.on('error', (error: Error & { code?: string }) => {
            console.error('WebSocket error:', error);
            const errorMessage = error.message || error.code || 'WebSocket connection error';
            safeEnqueue(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
            safeEnqueue(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
            isComplete = true;
            safeClose();
          });

          ws.on('close', (code: number, reason: Buffer) => {
            console.log('WebSocket closed', { code, reason: reason.toString() });
            
            // If connection closed with error code and no result, send error
            if (!isComplete && code !== 1000) {
              // 1000 = normal closure
              // 1008 = policy violation (often 403)
              // 1006 = abnormal closure
              let errorMsg = 'WebSocket connection closed';
              if (code === 1008 || code === 403) {
                errorMsg = 'Authentication failed (403). Please check your credentials.';
              } else if (code === 1006) {
                errorMsg = 'Connection failed. Please check the server and try again.';
              } else if (code !== 1000) {
                errorMsg = `Connection closed with code ${code}. ${reason.toString() || ''}`;
              }
              
              if (!result) {
                safeEnqueue(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
              }
            } else if (!isComplete && result) {
              safeEnqueue(`data: ${JSON.stringify({ type: 'result', data: result })}\n\n`);
            }
            
            safeEnqueue(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
            safeClose();
          });

          // Set timeout (30 minutes)
          setTimeout(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              console.log('WebSocket timeout, closing connection');
              safeEnqueue(`data: ${JSON.stringify({ type: 'error', error: 'Request timeout' })}\n\n`);
              safeClose();
            }
          }, 30 * 60 * 1000);

        } catch (error) {
          console.error('WebSocket connection error:', error);
          safeEnqueue(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
          safeClose();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error processing WebSocket request:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

