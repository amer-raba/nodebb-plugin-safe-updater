const { safeUpdate } = require('./safeUpdater');
const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');

const HTML_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>NodeBB Safe Updater</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; display: grid; place-items: center; min-height: 100vh; margin: 0; }
      .panel { width: min(520px, 90vw); background: rgba(15, 23, 42, .8); border: 1px solid rgba(148, 163, 184, .25); border-radius: 14px; padding: 28px; }
      button { background: #22c55e; color: #052e16; border: 0; border-radius: 10px; padding: 14px 22px; font-size: 1rem; font-weight: 700; cursor: pointer; }
      button:disabled { opacity: .6; cursor: wait; }
      #result { margin-top: 20px; min-height: 80px; white-space: pre-wrap; word-break: break-word; }
    </style>
  </head>
  <body>
    <div class="panel">
      <h1>NodeBB Safe Updater</h1>
      <p>Click below to update the configured NodeBB installation.</p>
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
          const response = await fetch('/api/update', {
            method: 'POST',
            headers: { 'x-updater-token': '__UPDATER_TOKEN__' }
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Update failed');
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
  const port = Number(process.env.NODEBB_UPDATER_PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('NODEBB_UPDATER_PORT must be an integer between 1 and 65535.');
  }

  return {
    directory: process.env.NODEBB_DIRECTORY || process.cwd(),
    branch: process.env.NODEBB_BRANCH || 'main',
    remote: process.env.NODEBB_REMOTE || 'origin',
    allowDirty: (process.env.NODEBB_ALLOW_DIRTY || '').toLowerCase() === 'true',
    skipInstall: (process.env.NODEBB_SKIP_INSTALL || '').toLowerCase() === 'true',
    port,
    host: process.env.NODEBB_UPDATER_HOST || '127.0.0.1',
    token: process.env.NODEBB_UPDATER_TOKEN || crypto.randomBytes(32).toString('hex'),
    backupRoot: process.env.NODEBB_BACKUP_ROOT || path.join(require('node:os').tmpdir(), 'nodebb-safe-updater')
  };
}

function isLoopbackHost(hostHeader) {
  if (!hostHeader) return false;
  try {
    const hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
  } catch {
    return false;
  }
}

function createServer(options) {
  const token = options.token || crypto.randomBytes(32).toString('hex');
  let updateInProgress = false;

  const server = http.createServer(async (req, res) => {
    if (!isLoopbackHost(req.headers.host)) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Requests must use a loopback host.' }));
      return;
    }

    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(HTML_PAGE.replace('__UPDATER_TOKEN__', token));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/update') {
      const origin = req.headers.origin;
      if (origin) {
        try {
          if (new URL(origin).host !== req.headers.host) throw new Error('Origin mismatch');
        } catch {
          res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'Cross-origin requests are not allowed.' }));
          return;
        }
      }

      const suppliedToken = req.headers['x-updater-token'];
      const expected = Buffer.from(token);
      const supplied = Buffer.from(typeof suppliedToken === 'string' ? suppliedToken : '');
      if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Invalid updater token.' }));
        return;
      }

      if (updateInProgress) {
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'An update is already in progress.' }));
        return;
      }

      updateInProgress = true;
      try {
        const result = safeUpdate(options);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, result }, null, 2));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: error.message || String(error) }, null, 2));
      } finally {
        updateInProgress = false;
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
  server.listen(options.port, options.host, () => {
    console.log(JSON.stringify({
      status: 'ready',
      host: options.host,
      port: options.port,
      directory: options.directory,
      endpoint: `http://${options.host}:${options.port}/`
    }, null, 2));
  });
}

if (require.main === module) {
  main();
}

module.exports = { parseOptionsFromEnv, createServer, main, isLoopbackHost };
