import { NextResponse } from "next/server";

/**
 * Create a Request object for testing API route handlers.
 */
export function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Request {
  const init: RequestInit = {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

/**
 * Wrap params in a Promise to match Next.js 16 App Router signature.
 */
export function makeParams<T extends Record<string, string>>(obj: T): { params: Promise<T> } {
  return { params: Promise.resolve(obj) };
}

/**
 * Parse a NextResponse body as JSON.
 */
export async function parseResponse(res: NextResponse | Response) {
  return res.json();
}
