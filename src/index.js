#!/usr/bin/env node

const { safeUpdate, parseArgs } = require('./safeUpdater');

function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);

    if (options.help) {
      console.log('Usage: nodebb-safe-updater [--directory /path/to/nodebb] [--branch main] [--remote origin] [--allow-dirty] [--skip-install] [--backup-root /path/to/backups]');
      return 0;
    }

    const result = safeUpdate(options);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  } catch (error) {
    console.error(error.message || error);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { main };
