# api-replay

> Record real API traffic, replay it anywhere, and instantly spot what changed.

**api-replay** is a lightweight Node.js tool that records real API requests (in production or staging), replays them against any environment, and diffs the responses to detect breaking changes or unexpected behavior.

## Install

```bash
npm install api-replay
```

## Quick Start

### 1. Record API traffic

```js
import express from 'express';
import { apiReplay } from 'api-replay';

const app = express();

// Important: add body parser BEFORE apiReplay
app.use(express.json());

app.use(apiReplay({
  maskHeaders: ['authorization', 'cookie'],
  maskBody: ['password', 'token', 'secret'],
  ignore: ['/health', '/metrics'],
}));

app.get('/api/users', (req, res) => {
  res.json({ users: [{ id: 1, name: 'Alice' }] });
});

app.listen(3000);
```

Every request/response is saved as a JSON file in `./recordings/`.

### 2. List and inspect recordings

```bash
npx api-replay list
# abc123def456  GET    /api/users  [200]  2025-01-15T10:30:00.000Z

npx api-replay show abc123def456
```

### 3. Replay against another environment

```bash
npx api-replay replay abc123def456 --base-url http://localhost:3000
```

```
--- API Replay Diff ---

Status: 200 (unchanged)
Duration: 42ms → 38ms

No body changes detected.
```

### 4. Spot differences instantly

If the response changed:

```
--- API Replay Diff ---

Status: 200 (unchanged)
Duration: 42ms → 55ms

2 change(s) detected:

  ~ users[0].name
    - "Alice"
    + "Alicia"
  + users[0].email: "alicia@example.com"
```

## API

### `apiReplay(options?)`

Express middleware that records all requests/responses.

```js
app.use(apiReplay(options));
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maskHeaders` | `string[]` | `[]` | Header names to mask with `***` |
| `maskBody` | `string[]` | `[]` | Body field names to deep-mask with `***` |
| `ignore` | `string[]` | `[]` | Route prefixes to skip recording |
| `recordingsDir` | `string` | `./recordings` | Custom storage directory |
| `onError` | `function` | `noop` | Callback when recording fails: `(err, recording) => {}` |

> **Note:** The middleware hooks `res.send()`, `res.json()`, and `res.end()` to capture responses. Add `express.json()` before `apiReplay()` to capture request bodies.

### `replay(id, options?)`

Replay a recorded request against a target environment.

```js
import { replay } from 'api-replay';

const result = await replay('abc123', {
  baseUrl: 'http://localhost:3000',
  timeout: 5000,
  overrides: {
    body: { price: 200 },
    headers: { 'x-debug': 'true' },
    query: { page: '2' },
  },
});

console.log(result.status);   // 200
console.log(result.body);     // { ... }
console.log(result.original); // original recorded response
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | — | Target base URL (required for replay) |
| `timeout` | `number` | `30000` | Request timeout in ms |
| `overrides.headers` | `object` | — | Merge with original headers |
| `overrides.body` | `any` | — | Replace original body |
| `overrides.query` | `object` | — | Add/override query params |

### `diff(original, replayed)`

Deep-diff two responses.

```js
import { diff, formatDiff } from 'api-replay';

const result = diff(originalResponse, replayedResponse);

console.log(result.hasChanges);    // true/false
console.log(result.statusChanged); // true/false
console.log(result.body);          // { 'field.path': { before, after, type? } }

// Pretty-print for terminal
console.log(formatDiff(result));
```

### `loadRecording(id)` / `listRecordings()`

```js
import { loadRecording, listRecordings } from 'api-replay';

const recordings = listRecordings();
const recording = loadRecording('abc123');
```

### `setRecordingsDir(dir)` / `setMaxBodySize(bytes)`

```js
import { setRecordingsDir, setMaxBodySize } from 'api-replay';

setRecordingsDir('/var/data/recordings');
setMaxBodySize(5 * 1024 * 1024); // 5MB (default: 1MB)
```

Bodies exceeding the max size are automatically truncated with a preview.

## CLI

```
api-replay <command> [options]

Commands:
  list                         List all recordings
  show  <id>                   Show a stored recording
  replay <id> [options]        Replay a request and show diff

Options:
  --base-url <url>             Target base URL for replay
  --timeout <ms>               Request timeout (default: 30000)
```

## Production Safety

- **Async I/O** — recordings are saved asynchronously, never blocking your request handlers
- **Body size limits** — large bodies are auto-truncated (configurable, default 1MB)
- **Deep masking** — `maskHeaders` and `maskBody` work on nested objects
- **Error isolation** — recording failures never crash your app (use `onError` callback)
- **Path traversal protection** — recording IDs are sanitized before file access
- **Circular reference handling** — safe JSON serialization for edge cases

## Use Cases

- **Debug production-only bugs** — replay the exact failing request locally
- **Validate API changes** — replay old traffic against new code, spot diffs
- **Reuse real requests for testing** — turn recordings into regression tests
- **Detect breaking changes in CI** — automate replay + diff in your pipeline
- **Investigate third-party API issues** — record and compare payment/webhook calls

## Requirements

- Node.js >= 18.0.0
- Express (for middleware recording)

## License

MIT
