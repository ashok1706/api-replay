import fs from 'fs';
import path from 'path';

const MAX_BODY_SIZE = 1024 * 1024; // 1MB default

let recordingsDir = path.join(process.cwd(), 'recordings');
let maxBodySize = MAX_BODY_SIZE;

export function setRecordingsDir(dir) {
  if (typeof dir !== 'string' || dir.length === 0) {
    throw new Error('recordingsDir must be a non-empty string');
  }
  recordingsDir = path.resolve(dir);
}

export function getRecordingsDir() {
  return recordingsDir;
}

export function setMaxBodySize(bytes) {
  maxBodySize = bytes;
}

export function getMaxBodySize() {
  return maxBodySize;
}

function ensureDir() {
  // Use recursive: true — safe even if dir already exists (no EEXIST race)
  fs.mkdirSync(recordingsDir, { recursive: true });
}

function truncateBody(body) {
  if (body === null || body === undefined) return body;

  let serialized;
  try {
    serialized = JSON.stringify(body);
  } catch {
    return '[unserializable]';
  }

  if (serialized.length > maxBodySize) {
    return {
      __truncated: true,
      __originalSize: serialized.length,
      __preview: serialized.slice(0, 500)
    };
  }

  return body;
}

function safeStringify(data) {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    // Handle circular references
    const seen = new WeakSet();
    return JSON.stringify(data, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[circular]';
        seen.add(value);
      }
      return value;
    }, 2);
  }
}

// ── Async API (default) ──────────────────────────────────

export async function saveRecording(data) {
  ensureDir();

  // Truncate large bodies before saving
  const safeData = {
    request: {
      ...data.request,
      body: truncateBody(data.request.body)
    },
    response: {
      ...data.response,
      body: truncateBody(data.response.body)
    }
  };

  const file = path.join(recordingsDir, `${safeData.request.id}.json`);
  await fs.promises.writeFile(file, safeStringify(safeData));
  return file;
}

export function loadRecording(id) {
  const safeName = path.basename(id); // prevent path traversal
  const file = path.join(recordingsDir, `${safeName}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Recording not found: ${id}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

export function listRecordings() {
  ensureDir();

  const files = fs.readdirSync(recordingsDir).filter(f => f.endsWith('.json'));

  return files.map(f => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(recordingsDir, f), 'utf-8'));
      return {
        id: path.basename(f, '.json'),
        method: data.request.method,
        url: data.request.url,
        status: data.response.status,
        timestamp: data.request.timestamp
      };
    } catch {
      return {
        id: path.basename(f, '.json'),
        method: '???',
        url: '???',
        status: 0,
        timestamp: 'corrupt'
      };
    }
  });
}
