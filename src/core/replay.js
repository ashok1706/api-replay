import { loadRecording } from './storage.js';

export async function replay(id, options = {}) {
  const recording = loadRecording(id);
  const { request } = recording;

  // Build target URL
  let url;
  try {
    if (options.baseUrl) {
      const parsed = new URL(request.url, 'http://placeholder');
      const base = options.baseUrl.replace(/\/$/, '');

      // Apply query overrides
      if (options.overrides?.query) {
        for (const [k, v] of Object.entries(options.overrides.query)) {
          parsed.searchParams.set(k, v);
        }
      }

      url = `${base}${parsed.pathname}${parsed.search}`;
    } else {
      url = request.url;
    }
  } catch (err) {
    throw new Error(`Invalid URL: ${err.message}`);
  }

  // Merge headers with overrides
  const headers = { ...request.headers, ...options.overrides?.headers };
  const body = options.overrides?.body ?? request.body;
  const method = request.method;

  // Remove headers that fetch sets automatically
  delete headers.host;
  delete headers['content-length'];
  delete headers['transfer-encoding'];

  // Build fetch options
  const fetchOptions = { method, headers };

  if (method !== 'GET' && method !== 'HEAD' && body != null) {
    const contentType = headers['content-type'] || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      fetchOptions.body = new URLSearchParams(body).toString();
    } else if (contentType.includes('text/')) {
      fetchOptions.body = String(body);
    } else {
      // Default to JSON
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (!contentType) {
        headers['content-type'] = 'application/json';
      }
    }
  }

  // Add timeout
  const timeout = options.timeout || 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  fetchOptions.signal = controller.signal;

  let res;
  try {
    const start = Date.now();
    res = await fetch(url, fetchOptions);
    const duration = Date.now() - start;

    let responseBody;
    const responseType = res.headers.get('content-type') || '';
    if (responseType.includes('application/json')) {
      try {
        responseBody = await res.json();
      } catch {
        responseBody = await res.text();
      }
    } else {
      responseBody = await res.text();
    }

    return {
      status: res.status,
      body: responseBody,
      duration,
      original: recording.response
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Replay timed out after ${timeout}ms for ${method} ${url}`);
    }
    throw new Error(`Replay failed for ${method} ${url}: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}
