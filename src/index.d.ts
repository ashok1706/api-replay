import type { RequestHandler } from 'express';

// ── Options ──────────────────────────────────────────────

export interface ApiReplayOptions {
  /** Storage backend (default: 'file') */
  storage?: 'file';
  /** Header names to mask with '***' */
  maskHeaders?: string[];
  /** Body field names to mask with '***' (deep — works on nested objects) */
  maskBody?: string[];
  /** Route prefixes to skip recording (e.g., ['/health']) */
  ignore?: string[];
  /** Custom directory for recordings (default: process.cwd()/recordings) */
  recordingsDir?: string;
  /** Error callback when a recording fails to save */
  onError?: (error: Error, recording: Recording) => void;
}

export interface ReplayOptions {
  /** Override the target base URL (e.g., 'http://localhost:3000') */
  baseUrl?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Override parts of the original request */
  overrides?: {
    headers?: Record<string, string>;
    body?: unknown;
    query?: Record<string, string>;
  };
}

// ── Data Types ───────────────────────────────────────────

export interface RecordedRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  query: Record<string, string>;
  timestamp: string;
}

export interface RecordedResponse {
  status: number;
  body: unknown;
  duration: number;
}

export interface Recording {
  request: RecordedRequest;
  response: RecordedResponse;
}

export interface RecordingSummary {
  id: string;
  method: string;
  url: string;
  status: number;
  timestamp: string;
}

// ── Replay Result ────────────────────────────────────────

export interface ReplayResult {
  status: number;
  body: unknown;
  duration: number;
  original: RecordedResponse;
}

// ── Diff Types ───────────────────────────────────────────

export interface DiffChange {
  before: unknown;
  after: unknown;
  type?: 'added' | 'removed';
}

export interface DiffResult {
  statusChanged: boolean;
  status: { before: number; after: number };
  body: Record<string, DiffChange>;
  duration: { before: number; after: number };
  hasChanges: boolean;
}

// ── Functions ────────────────────────────────────────────

/**
 * Express middleware that records API requests and responses.
 *
 * **Important:** Add `express.json()` middleware before `apiReplay()` to capture request bodies.
 *
 * @example
 * ```js
 * import express from 'express';
 * import { apiReplay } from 'api-replay';
 *
 * const app = express();
 * app.use(express.json());
 * app.use(apiReplay({
 *   maskHeaders: ['authorization'],
 *   ignore: ['/health'],
 * }));
 * ```
 */
export function apiReplay(options?: ApiReplayOptions): RequestHandler;

/**
 * Replay a recorded request against a target environment.
 * Supports timeout, baseUrl override, and request overrides (headers, body, query).
 *
 * @throws {Error} On network failure, timeout, or invalid URL
 *
 * @example
 * ```js
 * const result = await replay('abc123', {
 *   baseUrl: 'http://localhost:3000',
 *   timeout: 5000,
 *   overrides: { query: { debug: 'true' } },
 * });
 * ```
 */
export function replay(id: string, options?: ReplayOptions): Promise<ReplayResult>;

/**
 * Deep-diff two responses and return structured changes.
 */
export function diff(original: RecordedResponse, replayed: RecordedResponse): DiffResult;

/**
 * Format a diff result as a colored string for terminal output.
 */
export function formatDiff(result: DiffResult): string;

/**
 * Load a recording by ID from the recordings directory.
 * @throws {Error} If recording not found
 */
export function loadRecording(id: string): Recording;

/**
 * List all stored recordings with summary info.
 */
export function listRecordings(): RecordingSummary[];

/**
 * Set the recordings directory path.
 * @throws {Error} If dir is not a non-empty string
 */
export function setRecordingsDir(dir: string): void;

/**
 * Set the max body size (in bytes) before truncation. Default: 1MB.
 */
export function setMaxBodySize(bytes: number): void;

/**
 * Mask specified headers in a headers object. Case-insensitive matching.
 */
export function sanitizeHeaders(
  headers: Record<string, string>,
  options?: Pick<ApiReplayOptions, 'maskHeaders'>
): Record<string, string>;

/**
 * Deep-mask specified field names in a body object (works on nested objects).
 */
export function sanitizeBody(
  body: Record<string, unknown>,
  options?: Pick<ApiReplayOptions, 'maskBody'>
): Record<string, unknown>;
