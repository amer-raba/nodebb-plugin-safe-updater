const { safeUpdate, parseArgs } = require('./safeUpdater');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const HTML_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>NodeBB Safe Updater</title>
    <style>
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
      }

      .panel {
        width: min(520px, 90vw);
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 14px;
        padding: 28px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.5);
      }

      h1 {
        margin-top: 0;
        font-size: 1.8rem;
      }

      button {
        background: #22c55e;
        color: #052e16;
        border: none;
        border-radius: 10px;
        padding: 14px 22px;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.15s ease;
      }

      button:hover {
        transform: translateY(-1px);
      }

      button:disabled {
        opacity: 0.6;
        cursor: wait;
      }

      #result {
        margin-top: 20px;
        min-height: 80px;
        background: rgba(15, 118, 110, 0.1);
        border: 1px solid rgba(45, 212, 191, 0.2);
        border-radius: 10px;
        padding: 12px 14px;
        white-space: pre-wrap;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <div class="panel">
      <h1>NodeBB Safe Updater</h1>
      <p>Click the button below to update the forum to the latest version safely.</p>
      <button id="updateButton">Update to latest version</button>
      <div id="result">Waiting for action...</div>
    </div>

    <script>
      const button = document.getElementById('updateButton');
      const result = document.getElementById('result');

      button.addEventListener('click', async () => {
        button.disabled = true;
        result.textContent = 'Updating...';

        try {
          const response = await fetch('/api/update', { method: 'POST' });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Update failed');
          }

          result.textContent = JSON.stringify(data, null, 2);
        } catch (error) {
          result.textContent = 'ERROR: ' + (error.message || String(error));
        } finally {
          button.disabled = false;
        }
      });
    </script>
  </body>
</html>`;

function parseOptionsFromEnv() {
  return {
    directory: process.env.NODEBB_DIRECTORY || process.cwd(),
    branch: process.env.NODEBB_BRANCH || 'main',
    remote: process.env.NODEBB_REMOTE || 'origin',
    allowDirty: (process.env.NODEBB_ALLOW_DIRTY || '').toLowerCase() === 'true',
    skipInstall: (process.env.NODEBB_SKIP_INSTALL || '').toLowerCase() === 'true',
    port: Number(process.env.NODEBB_UPDATER_PORT || 3000),
    backupRoot: process.env.NODEBB_BACKUP_ROOT || path.join(process.cwd(), '.nodebb-safe-updater-backups')
  };
}

function createServer(options) {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML_PAGE);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/update') {
      try {
        const result = safeUpdate(options);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, result }, null, 2));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: error.message || String(error) }, null, 2));
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Not found' }, null, 2));
  });

  return server;
}

function main() {
  const options = parseOptionsFromEnv();
  const server = createServer(options);

  server.listen(options.port, () => {
    console.log(JSON.stringify({
      status: 'ready',
      port: options.port,
      directory: options.directory,
      endpoint: `http://localhost:${options.port}/`
    }, null, 2));
  });
}

if (require.main === module) {
  main();
}

module.exports = { parseOptionsFromEnv, createServer, main };
