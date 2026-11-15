const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parseArgs, safeUpdate, ensureGitRepository } = require('../src/safeUpdater');

test('parseArgs reads standard flags', () => {
  const args = parseArgs(['--directory', '/srv/nodebb', '--branch', 'develop', '--remote', 'upstream', '--allow-dirty']);

  assert.equal(args.directory, '/srv/nodebb');
  assert.equal(args.branch, 'develop');
  assert.equal(args.remote, 'upstream');
  assert.equal(args.allowDirty, true);
});

test('safeUpdate rejects non-git directories', (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodebb-safe-updater-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  assert.throws(() => safeUpdate({ directory: tempDir }), /Not a git repository/);
});

test('parseArgs accepts a positional directory', () => {
  const args = parseArgs(['/srv/nodebb']);
  assert.equal(args.directory, '/srv/nodebb');
});

test('parseArgs rejects options without a value', () => {
  for (const option of ['--directory', '--branch', '--remote', '--backup-root']) {
    assert.throws(() => parseArgs([option]), new RegExp(`Missing value for ${option}`));
  }
});

test('ensureGitRepository accepts a Git worktree with a .git file', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nodebb-safe-updater-worktree-'));
  const repository = path.join(root, 'repository');
  const worktree = path.join(root, 'worktree');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const { spawnSync } = require('node:child_process');
  const run = (args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  fs.mkdirSync(repository);
  run(['init', repository]);
  run(['-C', repository, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '--allow-empty', '-m', 'init']);
  run(['-C', repository, 'worktree', 'add', '-b', 'test-worktree', worktree]);

  assert.equal(fs.statSync(path.join(worktree, '.git')).isFile(), true);
  assert.doesNotThrow(() => ensureGitRepository(worktree));
});

test('safeUpdate rejects a backup directory inside the target repository', (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodebb-safe-updater-backup-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const { spawnSync } = require('node:child_process');
  const result = spawnSync('git', ['init', tempDir], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);

  assert.throws(
    () => safeUpdate({ directory: tempDir, backupRoot: path.join(tempDir, 'backups') }),
    /Backup directory must be outside/
  );
});
