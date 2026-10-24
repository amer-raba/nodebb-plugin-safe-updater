const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe']
  });

  if (result.error) {
    throw new Error(`${command} ${args.join(' ')} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}. ${output}`);
  }

  return (result.stdout || '').trim();
}

function ensureGitRepository(directory) {
  const gitDir = path.join(directory, '.git');
  if (!fs.existsSync(directory)) {
    throw new Error(`Directory does not exist: ${directory}`);
  }

  if (!fs.existsSync(gitDir)) {
    throw new Error(`Not a git repository: ${directory}`);
  }
}

function getGitStatus(directory) {
  return runCommand('git', ['-C', directory, 'status', '--porcelain']);
}

function createBackup(directory, backupRoot) {
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

    if (fs.existsSync(sourcePath)) {
      fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
    }
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

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--directory' || arg === '-d') {
      options.directory = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--branch' || arg === '-b') {
      options.branch = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--remote' || arg === '-r') {
      options.remote = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--backup-root') {
      options.backupRoot = argv[index + 1];
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

    if (!options.directory || options.directory === process.cwd()) {
      options.directory = arg;
    }
  }

  if (options.directory && options.directory !== process.cwd() && !path.isAbsolute(options.directory)) {
    options.directory = path.resolve(options.directory);
  }

  return options;
}

function safeUpdate(options = {}) {
  const finalOptions = {
    directory: options.directory || process.cwd(),
    branch: options.branch || 'main',
    remote: options.remote || 'origin',
    allowDirty: Boolean(options.allowDirty),
    skipInstall: Boolean(options.skipInstall),
    backupRoot: options.backupRoot || path.join(os.tmpdir(), 'nodebb-safe-updater')
  };

  ensureGitRepository(finalOptions.directory);

  const statusBefore = getGitStatus(finalOptions.directory);
  if (statusBefore && !finalOptions.allowDirty) {
    throw new Error(`Working tree is not clean. Commit or stash your changes before updating, or use --allow-dirty.\n${statusBefore}`);
  }

  fs.mkdirSync(finalOptions.backupRoot, { recursive: true });
  const backupDir = createBackup(finalOptions.directory, finalOptions.backupRoot);

  runCommand('git', ['-C', finalOptions.directory, 'fetch', finalOptions.remote, finalOptions.branch]);
  runCommand('git', ['-C', finalOptions.directory, 'checkout', finalOptions.branch]);
  runCommand('git', ['-C', finalOptions.directory, 'pull', '--ff-only', finalOptions.remote, finalOptions.branch]);

  if (!finalOptions.skipInstall && fs.existsSync(path.join(finalOptions.directory, 'package.json'))) {
    const packageManager = detectPackageManager(finalOptions.directory);
    const installCommand =
      packageManager === 'pnpm'
        ? ['pnpm', 'install']
        : packageManager === 'yarn'
          ? ['yarn', 'install']
          : ['npm', 'install'];

    runCommand(installCommand[0], installCommand.slice(1), { cwd: finalOptions.directory });
  }

  const statusAfter = getGitStatus(finalOptions.directory);

  return {
    ok: true,
    directory: finalOptions.directory,
    branch: finalOptions.branch,
    remote: finalOptions.remote,
    backupDir,
    statusBefore,
    statusAfter,
    packageManager: fs.existsSync(path.join(finalOptions.directory, 'package.json')) ? detectPackageManager(finalOptions.directory) : null
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
