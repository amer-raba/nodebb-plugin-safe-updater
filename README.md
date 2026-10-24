# NodeBB Safe Updater

A conservative utility that keeps a NodeBB forum up to date safely.

This repository now includes both:
- a CLI update tool
- a NodeBB plugin-style integration that exposes a one-click update action from the admin area

## Features
- Validates that the target directory is a Git repository
- Refuses to run on a dirty working tree unless explicitly allowed
- Creates a backup before updating
- Fetches and fast-forwards the selected branch
- Runs `npm install`, `yarn install`, or `pnpm install` when a project uses dependencies
- Exposes an admin route and an API endpoint suitable for a NodeBB plugin integration

## Install as a NodeBB plugin

1. Copy the repository contents into your NodeBB plugin directory, for example:

```bash
plugins/nodebb-safe-updater/
```

2. Make sure the NodeBB server has environment variables configured, for example:

```bash
export NODEBB_DIRECTORY=/srv/nodebb
export NODEBB_BRANCH=main
export NODEBB_REMOTE=origin
export NODEBB_ALLOW_DIRTY=false
export NODEBB_SKIP_INSTALL=false
```

3. Restart NodeBB.

4. Open the admin area and use the new "NodeBB Safe Updater" item.

5. Trigger the update from the browser by clicking the button in the plugin page.

## Browser update flow

The plugin registers:
- `/admin/plugins/nodebb-safe-updater` as the admin page
- `/api/v3/plugins/nodebb-safe-updater/update` as the POST endpoint used by the button

The page executes a safe update using the configured repo directory and then prints the JSON result.

## CLI usage

Update the current directory:

```bash
node src/index.js
```

Update a specific installation:

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

## Safety checks

This updater intentionally prefers a cautious workflow:
- it aborts if the repo is dirty,
- it creates a backup before the change,
- it uses a fast-forward pull strategy,
- and it keeps the update process explicit and inspectable.

## Example response

```json
{
  "ok": true,
  "result": {
    "directory": "/srv/nodebb",
    "branch": "main",
    "remote": "origin",
    "backupDir": "/tmp/nodebb-safe-updater/nodebb-backup-2026-10-24T12-00-00.000Z",
    "statusAfter": ""
  }
}
```
