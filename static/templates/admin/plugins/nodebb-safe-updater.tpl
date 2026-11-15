<div class="acp">
  <div class="acp-head">
    <div class="acp-title">
      <h1>NodeBB Safe Updater</h1>
      <p>Update the configured NodeBB installation. A backup is created before changes are applied.</p>
    </div>
  </div>
  <div class="acp-section">
    <p><strong>Directory:</strong> {directory}</p>
    <p><strong>Branch:</strong> {branch}</p>
    <p><strong>Remote:</strong> {remote}</p>
    <button id="safe-updater-run" class="btn btn-primary">Update now</button>
    <pre id="safe-updater-result" aria-live="polite">Waiting for action...</pre>
  </div>
</div>
<script src="/plugins/nodebb-safe-updater/admin.js"></script>
