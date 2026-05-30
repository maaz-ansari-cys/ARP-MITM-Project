import { NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

/**
 * Proxy a request to the Python microservice.
 * 
 * @param path The API path in the Python service (e.g., '/network/scan')
 * @param method HTTP method (GET, POST, etc.)
 * @param body Optional request body
 * @returns NextResponse from the Python service or an error response
 */
export async function proxyToPython(path: string, method: string = 'GET', body?: any) {
  try {
    const url = `${PYTHON_SERVICE_URL}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      // Increase timeout for long-running operations like ARP scans
      signal: AbortSignal.timeout(120000), // 120 seconds timeout
      cache: 'no-store', // Prevent Next.js from caching the Python backend response
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    logger.info(`Proxying ${method} to ${url}`);
    
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Python service proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with network service' },
      { status: 503 }
    );
  }
}

// Simple logger mock since I don't have a logger lib yet in Next.js
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};
