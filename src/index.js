#!/usr/bin/env node

const { safeUpdate, parseArgs } = require('./safeUpdater');

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
      console.log('Usage: nodebb-safe-updater [--directory /path/to/nodebb] [--branch main] [--remote origin] [--allow-dirty] [--skip-install]');
      process.exit(0);
    }

    const result = safeUpdate(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
