# NodeBB Safe Updater

A conservative utility for keeping a NodeBB forum up to date safely.

It supports two modes:
- CLI mode for automation in scripts and cron jobs
- One-click web mode with a button that triggers the update from the browser

## Features
- Verifies the target directory is a valid Git repository
- Refuses to run on a dirty working tree unless explicitly allowed
- Creates a backup before pulling changes
- Fetches and fast-forwards the selected branch
- Runs `npm install`, `yarn install`, or `pnpm install` when a `package.json` is present
- Exposes a simple web page that triggers the update in one click

## Install

```bash
npm install
```

## CLI usage

Update the current directory:

```bash
node src/index.js
```

Update a specific NodeBB installation:

```bash
node src/index.js --directory /srv/nodebb --branch main --remote origin
```

Allow dirty working trees:

```bash
node src/index.js --directory /srv/nodebb --allow-dirty
```

Skip post-update install:

```bash
node src/index.js --directory /srv/nodebb --skip-install
```

## Browser button mode

Start the updater web panel:

```bash
npm start
```

Then open:

```text
http://localhost:3000/
```

Click the update button to trigger a safe pull of the latest version.

Set the target directory and options with environment variables:

```bash
NODEBB_DIRECTORY=/srv/nodebb NODEBB_BRANCH=main NODEBB_REMOTE=origin npm start
```

## Safety checks

This updater intentionally prefers a cautious workflow:
- it aborts if the repo is dirty,
- it creates a backup before the change,
- it uses a fast-forward pull strategy,
- and it keeps the update process explicit and inspectable.

## Example output

```json
{
  "ok": true,
  "directory": "/srv/nodebb",
  "branch": "main",
  "remote": "origin",
  "backupDir": "/tmp/nodebb-safe-updater/nodebb-backup-2026-10-24T12-00-00.000Z",
  "statusAfter": ""
}
```
