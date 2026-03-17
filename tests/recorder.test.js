import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { apiReplay } from '../src/middleware/recorder.js';

const testDir = path.join(process.cwd(), 'test-recordings-middleware');

describe('apiReplay middleware', () => {
  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  function mockReq(overrides = {}) {
    return {
      method: 'GET',
      originalUrl: '/api/test',
      headers: { 'content-type': 'application/json' },
      body: null,
      query: {},
      ...overrides
    };
  }

  function mockRes() {
    return {
      statusCode: 200,
      send(body) { return body; },
      json(body) { return body; },
      end(chunk) { return chunk; }
    };
  }

  function waitForRecording(dir, count = 1, timeout = 3000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        try {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
            if (files.length >= count) {
              const results = files.map(f => {
                const content = fs.readFileSync(path.join(dir, f), 'utf-8');
                return { file: f, data: JSON.parse(content) };
              });
              return resolve(results);
            }
          }
        } catch {
          // file still being written
        }
        if (Date.now() - start > timeout) return reject(new Error('Timed out waiting for recording'));
        setTimeout(check, 50);
      };
      check();
    });
  }

  function createMiddleware(extraOpts = {}) {
    return apiReplay({ recordingsDir: testDir, ...extraOpts });
  }

  it('records a request/response via res.json', async () => {
    const middleware = createMiddleware({ maskHeaders: ['authorization'] });
    const req = mockReq({ headers: { authorization: 'Bearer token', 'content-type': 'application/json' } });
    const res = mockRes();

    await new Promise(resolve => middleware(req, res, resolve));
    res.json({ message: 'hello' });

    const [{ data }] = await waitForRecording(testDir);
    expect(data.request.method).toBe('GET');
    expect(data.request.url).toBe('/api/test');
    expect(data.request.headers.authorization).toBe('***');
    expect(data.response.status).toBe(200);
    expect(data.response.body).toEqual({ message: 'hello' });
  });

  it('records via res.send with string body', async () => {
    const middleware = createMiddleware();
    const req = mockReq();
    const res = mockRes();

    await new Promise(resolve => middleware(req, res, resolve));
    res.send(JSON.stringify({ ok: true }));

    const [{ data }] = await waitForRecording(testDir);
    expect(data.response.body).toEqual({ ok: true });
  });

  it('records via res.end', async () => {
    const middleware = createMiddleware();
    const req = mockReq();
    const res = mockRes();

    await new Promise(resolve => middleware(req, res, resolve));
    res.end('plain text');

    const [{ data }] = await waitForRecording(testDir);
    expect(data.response.body).toBe('plain text');
  });

  it('records res.end with no body', async () => {
    const middleware = createMiddleware();
    const req = mockReq();
    const res = mockRes();
    res.statusCode = 204;

    await new Promise(resolve => middleware(req, res, resolve));
    res.end();

    const [{ data }] = await waitForRecording(testDir);
    expect(data.response.status).toBe(204);
    expect(data.response.body).toBeNull();
  });

  it('does not double-record when send triggers end', async () => {
    const middleware = createMiddleware();
    const req = mockReq();
    const res = mockRes();

    await new Promise(resolve => middleware(req, res, resolve));
    res.send('body');
    res.end();

    const results = await waitForRecording(testDir);
    expect(results).toHaveLength(1);
  });

  it('skips ignored routes', async () => {
    const middleware = createMiddleware({ ignore: ['/health'] });
    const req = mockReq({ originalUrl: '/health' });
    const res = mockRes();

    await new Promise(resolve => middleware(req, res, resolve));
    await new Promise(r => setTimeout(r, 200));
    const exists = fs.existsSync(testDir) && fs.readdirSync(testDir).filter(f => f.endsWith('.json')).length > 0;
    expect(exists).toBe(false);
  });

  it('records POST with body', async () => {
    const middleware = createMiddleware();
    const req = mockReq({ method: 'POST', body: { name: 'alice', age: 30 } });
    const res = mockRes();

    await new Promise(resolve => middleware(req, res, resolve));
    res.json({ id: 1 });

    const [{ data }] = await waitForRecording(testDir);
    expect(data.request.method).toBe('POST');
    expect(data.request.body).toEqual({ name: 'alice', age: 30 });
  });

  it('records error responses (500)', async () => {
    const middleware = createMiddleware();
    const req = mockReq();
    const res = mockRes();
    res.statusCode = 500;

    await new Promise(resolve => middleware(req, res, resolve));
    res.json({ error: 'Internal Server Error' });

    const [{ data }] = await waitForRecording(testDir);
    expect(data.response.status).toBe(500);
    expect(data.response.body.error).toBe('Internal Server Error');
  });

  it('records 404 responses', async () => {
    const middleware = createMiddleware();
    const req = mockReq({ originalUrl: '/api/missing' });
    const res = mockRes();
    res.statusCode = 404;

    await new Promise(resolve => middleware(req, res, resolve));
    res.json({ error: 'Not Found' });

    const [{ data }] = await waitForRecording(testDir);
    expect(data.response.status).toBe(404);
  });

  it('handles DELETE method', async () => {
    const middleware = createMiddleware();
    const req = mockReq({ method: 'DELETE', originalUrl: '/api/users/1' });
    const res = mockRes();
    res.statusCode = 204;

    await new Promise(resolve => middleware(req, res, resolve));
    res.end();

    const [{ data }] = await waitForRecording(testDir);
    expect(data.request.method).toBe('DELETE');
    expect(data.response.status).toBe(204);
  });

  it('handles PUT method with body', async () => {
    const middleware = createMiddleware();
    const req = mockReq({ method: 'PUT', body: { name: 'updated' } });
    const res = mockRes();

    await new Promise(resolve => middleware(req, res, resolve));
    res.json({ ok: true });

    const [{ data }] = await waitForRecording(testDir);
    expect(data.request.method).toBe('PUT');
    expect(data.request.body.name).toBe('updated');
  });

  it('handles PATCH method', async () => {
    const middleware = createMiddleware();
    const req = mockReq({ method: 'PATCH', body: { age: 31 } });
    const res = mockRes();

    await new Promise(resolve => middleware(req, res, resolve));
    res.json({ ok: true });

    const [{ data }] = await waitForRecording(testDir);
    expect(data.request.method).toBe('PATCH');
  });

  it('deep-masks body fields', async () => {
    const middleware = createMiddleware({ maskBody: ['password'] });
    const req = mockReq({
      method: 'POST',
      body: { user: { password: 'secret', name: 'alice' } }
    });
    const res = mockRes();

    await new Promise(resolve => middleware(req, res, resolve));
    res.json({ ok: true });

    const [{ data }] = await waitForRecording(testDir);
    expect(data.request.body.user.password).toBe('***');
    expect(data.request.body.user.name).toBe('alice');
  });

  it('records query params', async () => {
    const middleware = createMiddleware();
    const req = mockReq({ originalUrl: '/api/test?page=2', query: { page: '2' } });
    const res = mockRes();

    await new Promise(resolve => middleware(req, res, resolve));
    res.json({ items: [] });

    const [{ data }] = await waitForRecording(testDir);
    expect(data.request.query.page).toBe('2');
    expect(data.request.url).toBe('/api/test?page=2');
  });

  it('records duration and timestamp', async () => {
    const middleware = createMiddleware();
    const req = mockReq();
    const res = mockRes();

    await new Promise(resolve => middleware(req, res, resolve));
    res.json({ ok: true });

    const [{ data }] = await waitForRecording(testDir);
    expect(typeof data.response.duration).toBe('number');
    expect(data.response.duration).toBeGreaterThanOrEqual(0);
    expect(data.request.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
