export function sanitizeHeaders(headers, options = {}) {
  if (!headers || !options.maskHeaders?.length) return headers;

  const masked = { ...headers };

  for (const key of options.maskHeaders) {
    const lower = key.toLowerCase();
    if (masked[lower] !== undefined) {
      masked[lower] = '***';
    }
  }

  return masked;
}

export function sanitizeBody(body, options = {}) {
  if (!body || typeof body !== 'object' || !options.maskBody?.length) return body;

  const maskSet = new Set(options.maskBody);
  return deepMask(structuredClone(body), maskSet);
}

function deepMask(obj, maskSet) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = deepMask(obj[i], maskSet);
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (maskSet.has(key)) {
      obj[key] = '***';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      obj[key] = deepMask(obj[key], maskSet);
    }
  }

  return obj;
}
