const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  if (result.error) {
    throw new Error(`${command} ${args.join(' ')} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    const reason = result.signal ? `signal ${result.signal}` : `exit code ${result.status}`;
    throw new Error(`${command} ${args.join(' ')} failed with ${reason}. ${output}`);
  }

  return (result.stdout || '').trim();
}

function ensureGitRepository(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error(`Directory does not exist: ${directory}`);
  }

  try {
    runCommand('git', ['-C', directory, 'rev-parse', '--is-inside-work-tree']);
  } catch {
    throw new Error(`Not a git repository: ${directory}`);
  }
}

function getGitStatus(directory) {
  return runCommand('git', ['-C', directory, 'status', '--porcelain', '--untracked-files=all']);
}

function isPathInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function createBackup(directory, backupRoot) {
  if (isPathInside(directory, backupRoot)) {
    throw new Error('Backup directory must be outside the target repository.');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(backupRoot, `nodebb-backup-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const entries = fs.readdirSync(directory);
  for (const entry of entries) {
    if (['.git', 'node_modules', '.cache', 'tmp'].includes(entry)) {
      continue;
    }

    const sourcePath = path.join(directory, entry);
    const targetPath = path.join(backupDir, entry);
    fs.cpSync(sourcePath, targetPath, { recursive: true, force: true, errorOnExist: false });
  }

  return backupDir;
}

function detectPackageManager(directory) {
  if (fs.existsSync(path.join(directory, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (fs.existsSync(path.join(directory, 'yarn.lock'))) {
    return 'yarn';
  }

  return 'npm';
}

function parseArgs(argv = []) {
  const options = {
    directory: process.cwd(),
    branch: 'main',
    remote: 'origin',
    allowDirty: false,
    skipInstall: false,
    backupRoot: path.join(os.tmpdir(), 'nodebb-safe-updater')
  };
  let positionalDirectorySet = false;

  function readValue(arg, index) {
    const value = argv[index + 1];
    if (!value || value.startsWith('-')) {
      throw new Error(`Missing value for ${arg}`);
    }
    return value;
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--directory' || arg === '-d') {
      options.directory = readValue(arg, index);
      index += 1;
      continue;
    }

    if (arg === '--branch' || arg === '-b') {
      options.branch = readValue(arg, index);
      index += 1;
      continue;
    }

    if (arg === '--remote' || arg === '-r') {
      options.remote = readValue(arg, index);
      index += 1;
      continue;
    }

    if (arg === '--backup-root') {
      options.backupRoot = readValue(arg, index);
      index += 1;
      continue;
    }

    if (arg === '--allow-dirty') {
      options.allowDirty = true;
      continue;
    }

    if (arg === '--skip-install') {
      options.skipInstall = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (positionalDirectorySet) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    options.directory = arg;
    positionalDirectorySet = true;
  }

  if (!path.isAbsolute(options.directory)) {
    options.directory = path.resolve(options.directory);
  }
  if (!path.isAbsolute(options.backupRoot)) {
    options.backupRoot = path.resolve(options.backupRoot);
  }

  return options;
}

function safeUpdate(options = {}) {
  const finalOptions = {
    directory: path.resolve(options.directory || process.cwd()),
    branch: options.branch || 'main',
    remote: options.remote || 'origin',
    allowDirty: Boolean(options.allowDirty),
    skipInstall: Boolean(options.skipInstall),
    backupRoot: path.resolve(options.backupRoot || path.join(os.tmpdir(), 'nodebb-safe-updater'))
  };

  ensureGitRepository(finalOptions.directory);
  runCommand('git', ['check-ref-format', '--branch', finalOptions.branch]);

  const statusBefore = getGitStatus(finalOptions.directory);
  if (statusBefore && !finalOptions.allowDirty) {
    throw new Error(`Working tree is not clean. Commit or stash your changes before updating, or use --allow-dirty.\n${statusBefore}`);
  }

  if (isPathInside(finalOptions.directory, finalOptions.backupRoot)) {
    throw new Error('Backup directory must be outside the target repository.');
  }

  fs.mkdirSync(finalOptions.backupRoot, { recursive: true });
  const backupDir = createBackup(finalOptions.directory, finalOptions.backupRoot);

  runCommand('git', ['-C', finalOptions.directory, 'fetch', finalOptions.remote, finalOptions.branch]);
  const localBranches = runCommand('git', [
    '-C', finalOptions.directory,
    'branch', '--list', '--format=%(refname:short)'
  ]).split('\n').filter(Boolean);

  if (localBranches.includes(finalOptions.branch)) {
    runCommand('git', ['-C', finalOptions.directory, 'checkout', finalOptions.branch]);
  } else {
    runCommand('git', [
      '-C', finalOptions.directory,
      'checkout', '--track', '-b', finalOptions.branch,
      `${finalOptions.remote}/${finalOptions.branch}`
    ]);
  }

  runCommand('git', ['-C', finalOptions.directory, 'pull', '--ff-only', finalOptions.remote, finalOptions.branch]);

  let packageManager = null;
  if (!finalOptions.skipInstall && fs.existsSync(path.join(finalOptions.directory, 'package.json'))) {
    packageManager = detectPackageManager(finalOptions.directory);
    const installCommand = packageManager === 'pnpm'
      ? ['pnpm', 'install']
      : packageManager === 'yarn'
        ? ['yarn', 'install']
        : ['npm', 'install'];
    runCommand(installCommand[0], installCommand.slice(1), { cwd: finalOptions.directory });
  } else if (fs.existsSync(path.join(finalOptions.directory, 'package.json'))) {
    packageManager = detectPackageManager(finalOptions.directory);
  }

  return {
    ok: true,
    directory: finalOptions.directory,
    branch: finalOptions.branch,
    remote: finalOptions.remote,
    backupDir,
    statusBefore,
    statusAfter: getGitStatus(finalOptions.directory),
    packageManager
  };
}

module.exports = {
  parseArgs,
  safeUpdate,
  createBackup,
  ensureGitRepository,
  getGitStatus,
  runCommand
};
