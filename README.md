# NodeBB Safe Updater

A conservative CLI utility for updating a NodeBB installation in a safe way.

Features:
- Verifies the target directory is a valid Git repository.
- Refuses to run on a dirty working tree unless explicitly allowed.
- Creates a backup before pulling changes.
- Fetches and fast-forwards the selected branch.
- Runs `npm install` (or equivalent) when a `package.json` is present.
- Reports the result in a machine-readable summary.

## Installation

```bash
npm install
```

## Usage

Update the current directory:

```bash
node src/index.js
```

Update a specific NodeBB installation:

```bash
node src/index.js --directory /srv/nodebb --branch main --remote origin
```

Allow updates despite local modifications:

```bash
node src/index.js --directory /srv/nodebb --allow-dirty
```

Skip package installation after the pull:

```bash
node src/index.js --directory /srv/nodebb --skip-install
```

## Why this is safe

This updater intentionally prefers a cautious workflow:
- it bails out when the repo is dirty,
- it creates a backup before the change,
- it uses a fast-forward pull strategy,
- and it keeps the update process explicit and inspectable.

## Example JSON output

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
