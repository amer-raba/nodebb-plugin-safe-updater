const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parseArgs, safeUpdate } = require('../src/safeUpdater');

test('parseArgs reads standard flags', () => {
  const args = parseArgs(['--directory', '/srv/nodebb', '--branch', 'develop', '--remote', 'upstream', '--allow-dirty']);

  assert.equal(args.directory, '/srv/nodebb');
  assert.equal(args.branch, 'develop');
  assert.equal(args.remote, 'upstream');
  assert.equal(args.allowDirty, true);
});

test('safeUpdate rejects non-git directories', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodebb-safe-updater-'));

  assert.throws(() => safeUpdate({ directory: tempDir }), /Not a git repository/);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('parseArgs accepts a positional directory', () => {
  const args = parseArgs(['/srv/nodebb']);
  assert.equal(args.directory, '/srv/nodebb');
});
