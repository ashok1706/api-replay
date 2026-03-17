import { describe, it, expect } from 'vitest';
import { sanitizeHeaders, sanitizeBody } from '../src/core/sanitizer.js';

describe('sanitizeHeaders', () => {
  it('masks specified headers', () => {
    const headers = { authorization: 'Bearer secret', 'content-type': 'application/json' };
    const result = sanitizeHeaders(headers, { maskHeaders: ['authorization'] });
    expect(result.authorization).toBe('***');
    expect(result['content-type']).toBe('application/json');
  });

  it('returns headers unchanged when no maskHeaders', () => {
    const headers = { authorization: 'Bearer secret' };
    expect(sanitizeHeaders(headers)).toEqual(headers);
    expect(sanitizeHeaders(headers, {})).toEqual(headers);
  });

  it('handles null/undefined headers', () => {
    expect(sanitizeHeaders(null, { maskHeaders: ['auth'] })).toBeNull();
    expect(sanitizeHeaders(undefined)).toBeUndefined();
  });

  it('is case-insensitive for header keys', () => {
    const headers = { authorization: 'secret' };
    const result = sanitizeHeaders(headers, { maskHeaders: ['Authorization'] });
    expect(result.authorization).toBe('***');
  });

  it('masks multiple headers', () => {
    const headers = { authorization: 'token', cookie: 'session=abc', host: 'example.com' };
    const result = sanitizeHeaders(headers, { maskHeaders: ['authorization', 'cookie'] });
    expect(result.authorization).toBe('***');
    expect(result.cookie).toBe('***');
    expect(result.host).toBe('example.com');
  });

  it('does not mutate original headers', () => {
    const headers = { authorization: 'secret' };
    sanitizeHeaders(headers, { maskHeaders: ['authorization'] });
    expect(headers.authorization).toBe('secret');
  });
});

describe('sanitizeBody', () => {
  it('masks specified body fields', () => {
    const body = { password: '123', name: 'john' };
    const result = sanitizeBody(body, { maskBody: ['password'] });
    expect(result.password).toBe('***');
    expect(result.name).toBe('john');
  });

  it('does not mutate original body', () => {
    const body = { password: '123' };
    sanitizeBody(body, { maskBody: ['password'] });
    expect(body.password).toBe('123');
  });

  it('returns body unchanged when no maskBody', () => {
    const body = { name: 'john' };
    expect(sanitizeBody(body)).toEqual(body);
  });

  it('deep-masks nested objects', () => {
    const body = {
      user: { password: 'secret', name: 'john' },
      meta: { nested: { token: 'abc' } }
    };
    const result = sanitizeBody(body, { maskBody: ['password', 'token'] });
    expect(result.user.password).toBe('***');
    expect(result.user.name).toBe('john');
    expect(result.meta.nested.token).toBe('***');
  });

  it('deep-masks inside arrays', () => {
    const body = {
      users: [
        { name: 'alice', password: 'p1' },
        { name: 'bob', password: 'p2' }
      ]
    };
    const result = sanitizeBody(body, { maskBody: ['password'] });
    expect(result.users[0].password).toBe('***');
    expect(result.users[1].password).toBe('***');
    expect(result.users[0].name).toBe('alice');
  });

  it('handles null, undefined, and non-object bodies', () => {
    expect(sanitizeBody(null, { maskBody: ['x'] })).toBeNull();
    expect(sanitizeBody(undefined, { maskBody: ['x'] })).toBeUndefined();
    expect(sanitizeBody('string', { maskBody: ['x'] })).toBe('string');
    expect(sanitizeBody(42, { maskBody: ['x'] })).toBe(42);
  });
});
