import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { saveRecording, loadRecording, listRecordings, setRecordingsDir, setMaxBodySize } from '../src/core/storage.js';

const testDir = path.join(process.cwd(), 'test-recordings');

function mockRecording(overrides = {}) {
  return {
    request: {
      id: 'test-123',
      method: 'GET',
      url: '/api/users',
      headers: {},
      body: null,
      query: {},
      timestamp: '2025-01-01T00:00:00.000Z',
      ...overrides.request
    },
    response: {
      status: 200,
      body: { users: [] },
      duration: 42,
      ...overrides.response
    }
  };
}

describe('storage', () => {
  beforeEach(() => {
    setRecordingsDir(testDir);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    setMaxBodySize(1024 * 1024); // reset
  });

  it('saves and loads a recording', async () => {
    const rec = mockRecording();
    await saveRecording(rec);
    const loaded = loadRecording('test-123');
    expect(loaded).toEqual(rec);
  });

  it('creates directory if missing', async () => {
    expect(fs.existsSync(testDir)).toBe(false);
    await saveRecording(mockRecording());
    expect(fs.existsSync(testDir)).toBe(true);
  });

  it('throws when loading non-existent recording', () => {
    expect(() => loadRecording('nope')).toThrow('Recording not found');
  });

  it('lists recordings', async () => {
    await saveRecording(mockRecording());
    const list = listRecordings();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('test-123');
    expect(list[0].method).toBe('GET');
    expect(list[0].url).toBe('/api/users');
    expect(list[0].status).toBe(200);
  });

  it('lists empty directory gracefully', () => {
    const list = listRecordings();
    expect(list).toHaveLength(0);
  });

  it('truncates large bodies', async () => {
    setMaxBodySize(100); // very small limit
    const bigBody = { data: 'x'.repeat(200) };
    const rec = mockRecording({ response: { status: 200, body: bigBody, duration: 10 } });
    await saveRecording(rec);
    const loaded = loadRecording('test-123');
    expect(loaded.response.body.__truncated).toBe(true);
    expect(loaded.response.body.__originalSize).toBeGreaterThan(100);
  });

  it('handles concurrent saves without crashing', async () => {
    const promises = [];
    for (let i = 0; i < 20; i++) {
      const rec = mockRecording({ request: { id: `concurrent-${i}` } });
      promises.push(saveRecording(rec));
    }
    await Promise.all(promises);
    const list = listRecordings();
    expect(list).toHaveLength(20);
  });

  it('prevents path traversal in loadRecording', () => {
    expect(() => loadRecording('../../../etc/passwd')).toThrow('Recording not found');
  });

  it('handles corrupt JSON files in listRecordings', async () => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, 'corrupt.json'), 'not valid json');
    const list = listRecordings();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('corrupt');
    expect(list[0].method).toBe('???');
  });

  it('rejects invalid recordingsDir', () => {
    expect(() => setRecordingsDir('')).toThrow();
    expect(() => setRecordingsDir(123)).toThrow();
  });
});
