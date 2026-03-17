import { describe, it, expect } from 'vitest';
import { diff, formatDiff } from '../src/core/diff.js';

describe('diff', () => {
  it('detects no changes for identical responses', () => {
    const original = { status: 200, body: { name: 'john' }, duration: 50 };
    const replayed = { status: 200, body: { name: 'john' }, duration: 45 };
    const result = diff(original, replayed);
    expect(result.statusChanged).toBe(false);
    expect(result.hasChanges).toBe(false);
    expect(Object.keys(result.body)).toHaveLength(0);
  });

  it('detects status change', () => {
    const original = { status: 200, body: {}, duration: 50 };
    const replayed = { status: 500, body: {}, duration: 50 };
    const result = diff(original, replayed);
    expect(result.statusChanged).toBe(true);
    expect(result.hasChanges).toBe(true);
    expect(result.status.before).toBe(200);
    expect(result.status.after).toBe(500);
  });

  it('detects changed fields', () => {
    const original = { status: 200, body: { price: 100 }, duration: 50 };
    const replayed = { status: 200, body: { price: 200 }, duration: 50 };
    const result = diff(original, replayed);
    expect(result.hasChanges).toBe(true);
    expect(result.body.price.before).toBe(100);
    expect(result.body.price.after).toBe(200);
  });

  it('detects added fields', () => {
    const original = { status: 200, body: {}, duration: 50 };
    const replayed = { status: 200, body: { newField: 'hello' }, duration: 50 };
    const result = diff(original, replayed);
    expect(result.body.newField.type).toBe('added');
    expect(result.body.newField.after).toBe('hello');
  });

  it('detects removed fields', () => {
    const original = { status: 200, body: { old: 'value' }, duration: 50 };
    const replayed = { status: 200, body: {}, duration: 50 };
    const result = diff(original, replayed);
    expect(result.body.old.type).toBe('removed');
    expect(result.body.old.before).toBe('value');
  });

  it('handles nested objects', () => {
    const original = { status: 200, body: { user: { name: 'john', age: 30 } }, duration: 50 };
    const replayed = { status: 200, body: { user: { name: 'jane', age: 30 } }, duration: 50 };
    const result = diff(original, replayed);
    expect(result.body['user.name'].before).toBe('john');
    expect(result.body['user.name'].after).toBe('jane');
    expect(result.body['user.age']).toBeUndefined(); // unchanged
  });

  it('handles arrays', () => {
    const original = { status: 200, body: { items: [1, 2, 3] }, duration: 50 };
    const replayed = { status: 200, body: { items: [1, 2, 4] }, duration: 50 };
    const result = diff(original, replayed);
    expect(result.body['items[2]'].before).toBe(3);
    expect(result.body['items[2]'].after).toBe(4);
  });

  it('handles array length changes', () => {
    const original = { status: 200, body: { items: [1, 2] }, duration: 50 };
    const replayed = { status: 200, body: { items: [1, 2, 3] }, duration: 50 };
    const result = diff(original, replayed);
    expect(result.body['items[2]'].type).toBe('added');
    expect(result.body['items[2]'].after).toBe(3);
  });

  it('handles null vs object', () => {
    const original = { status: 200, body: null, duration: 50 };
    const replayed = { status: 200, body: { data: 'hello' }, duration: 50 };
    const result = diff(original, replayed);
    expect(result.hasChanges).toBe(true);
    expect(result.body['(root)'].before).toBeNull();
  });

  it('handles both null bodies as no change', () => {
    const original = { status: 200, body: null, duration: 50 };
    const replayed = { status: 200, body: null, duration: 50 };
    const result = diff(original, replayed);
    expect(result.hasChanges).toBe(false);
  });

  it('handles string vs object body', () => {
    const original = { status: 200, body: 'error text', duration: 50 };
    const replayed = { status: 200, body: { error: 'text' }, duration: 50 };
    const result = diff(original, replayed);
    expect(result.hasChanges).toBe(true);
  });

  it('handles empty objects', () => {
    const original = { status: 200, body: {}, duration: 50 };
    const replayed = { status: 200, body: {}, duration: 50 };
    const result = diff(original, replayed);
    expect(result.hasChanges).toBe(false);
  });

  it('tracks duration changes without marking hasChanges', () => {
    const original = { status: 200, body: { ok: true }, duration: 50 };
    const replayed = { status: 200, body: { ok: true }, duration: 500 };
    const result = diff(original, replayed);
    expect(result.hasChanges).toBe(false);
    expect(result.duration.before).toBe(50);
    expect(result.duration.after).toBe(500);
  });
});

describe('formatDiff', () => {
  it('formats unchanged response', () => {
    const result = diff(
      { status: 200, body: { ok: true }, duration: 50 },
      { status: 200, body: { ok: true }, duration: 45 }
    );
    const output = formatDiff(result);
    expect(output).toContain('200');
    expect(output).toContain('No body changes detected');
  });

  it('formats changes with added/removed/changed', () => {
    const result = diff(
      { status: 200, body: { a: 1, b: 2 }, duration: 50 },
      { status: 404, body: { a: 9, c: 3 }, duration: 50 }
    );
    const output = formatDiff(result);
    expect(output).toContain('200');
    expect(output).toContain('404');
    expect(output).toContain('change(s) detected');
  });

  it('handles missing durations gracefully', () => {
    const result = {
      statusChanged: false,
      status: { before: 200, after: 200 },
      body: {},
      duration: { before: undefined, after: undefined },
      hasChanges: false
    };
    const output = formatDiff(result);
    expect(output).toContain('?ms');
  });
});
