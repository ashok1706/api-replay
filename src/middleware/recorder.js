import { generateId } from '../utils/id.js';
import { sanitizeHeaders, sanitizeBody } from '../core/sanitizer.js';
import { saveRecording, setRecordingsDir } from '../core/storage.js';

function tryParse(body) {
  if (Buffer.isBuffer(body)) {
    body = body.toString('utf-8');
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

export function apiReplay(options = {}) {
  if (options.recordingsDir) {
    setRecordingsDir(options.recordingsDir);
  }

  const ignoreRoutes = options.ignore || [];
  const onError = options.onError || (() => {});

  return function recorder(req, res, next) {
    // Skip ignored routes
    for (const route of ignoreRoutes) {
      if (req.originalUrl.startsWith(route)) {
        return next();
      }
    }

    const start = Date.now();
    const id = generateId();
    let recorded = false;

    const requestData = {
      id,
      method: req.method,
      url: req.originalUrl,
      headers: sanitizeHeaders(req.headers, options),
      body: sanitizeBody(req.body, options),
      query: req.query,
      timestamp: new Date().toISOString()
    };

    function record(body) {
      if (recorded) return; // prevent double-recording
      recorded = true;

      const duration = Date.now() - start;

      const recording = {
        request: requestData,
        response: {
          status: res.statusCode,
          body: tryParse(body),
          duration
        }
      };

      // Async save — never blocks the response
      saveRecording(recording).catch(err => {
        onError(err, recording);
      });
    }

    // Hook res.send
    const originalSend = res.send;
    res.send = function (body) {
      record(body);
      return originalSend.call(this, body);
    };

    // Hook res.json
    const originalJson = res.json;
    res.json = function (body) {
      record(body);
      return originalJson.call(this, body);
    };

    // Hook res.end (catches responses that bypass send/json)
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
      record(chunk || null);
      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}
