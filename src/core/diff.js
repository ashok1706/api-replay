export function diff(original, replayed) {
  const result = {
    statusChanged: original.status !== replayed.status,
    status: {
      before: original.status,
      after: replayed.status
    },
    body: deepDiff(original.body, replayed.body),
    duration: {
      before: original.duration,
      after: replayed.duration
    }
  };

  result.hasChanges = result.statusChanged || Object.keys(result.body).length > 0;
  return result;
}

function deepDiff(a, b, path = '') {
  const changes = {};

  // Identical values (including both null/undefined)
  if (a === b) return changes;

  // One is null/undefined or type mismatch
  if (a == null || b == null || typeof a !== typeof b) {
    changes[path || '(root)'] = { before: a, after: b };
    return changes;
  }

  // Primitives
  if (typeof a !== 'object') {
    if (a !== b) {
      changes[path || '(root)'] = { before: a, after: b };
    }
    return changes;
  }

  // Arrays
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
      changes[path || '(root)'] = { before: a, after: b };
      return changes;
    }
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      const childPath = path ? `${path}[${i}]` : `[${i}]`;
      if (i >= a.length) {
        changes[childPath] = { before: undefined, after: b[i], type: 'added' };
      } else if (i >= b.length) {
        changes[childPath] = { before: a[i], after: undefined, type: 'removed' };
      } else {
        Object.assign(changes, deepDiff(a[i], b[i], childPath));
      }
    }
    return changes;
  }

  // Objects — guard against circular refs with depth limit
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of allKeys) {
    const childPath = path ? `${path}.${key}` : key;
    if (!(key in a)) {
      changes[childPath] = { before: undefined, after: b[key], type: 'added' };
    } else if (!(key in b)) {
      changes[childPath] = { before: a[key], after: undefined, type: 'removed' };
    } else {
      Object.assign(changes, deepDiff(a[key], b[key], childPath));
    }
  }

  return changes;
}

// ── ANSI Colors ──────────────────────────────────────────

const colors = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`
};

export function formatDiff(result) {
  const lines = [];

  lines.push(colors.bold('--- API Replay Diff ---'));
  lines.push('');

  // Status
  if (result.statusChanged) {
    lines.push(colors.yellow(`Status: ${result.status.before} → ${result.status.after}`));
  } else {
    lines.push(colors.green(`Status: ${result.status.before} (unchanged)`));
  }

  // Duration
  const dBefore = result.duration.before ?? '?';
  const dAfter = result.duration.after ?? '?';
  lines.push(colors.dim(`Duration: ${dBefore}ms → ${dAfter}ms`));
  lines.push('');

  // Body changes
  const bodyChanges = result.body;
  const keys = Object.keys(bodyChanges);

  if (keys.length === 0) {
    lines.push(colors.green('No body changes detected.'));
  } else {
    lines.push(colors.bold(`${keys.length} change(s) detected:`));
    lines.push('');

    for (const key of keys) {
      const change = bodyChanges[key];
      const label = colors.cyan(key);

      if (change.type === 'added') {
        lines.push(`  ${colors.green('+')} ${label}: ${JSON.stringify(change.after)}`);
      } else if (change.type === 'removed') {
        lines.push(`  ${colors.red('-')} ${label}: ${JSON.stringify(change.before)}`);
      } else {
        lines.push(`  ${colors.yellow('~')} ${label}`);
        lines.push(`    ${colors.red('- ' + JSON.stringify(change.before))}`);
        lines.push(`    ${colors.green('+ ' + JSON.stringify(change.after))}`);
      }
    }
  }

  lines.push('');
  return lines.join('\n');
}
