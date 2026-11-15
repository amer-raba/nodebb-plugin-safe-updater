'use strict';

(function () {
  const button = document.getElementById('safe-updater-run');
  const result = document.getElementById('safe-updater-result');
  if (!button || !result) return;

  button.addEventListener('click', async () => {
    button.disabled = true;
    result.textContent = 'Updating...';
    try {
      const csrfToken = window.ajaxify && window.ajaxify.data && window.ajaxify.data.csrf_token;
      const headers = {};
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const response = await fetch('/api/v3/plugins/nodebb-safe-updater/update', {
        method: 'POST',
        credentials: 'same-origin',
        headers
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Update failed');
      result.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      result.textContent = `ERROR: ${error.message || String(error)}`;
    } finally {
      button.disabled = false;
    }
  });
}());
