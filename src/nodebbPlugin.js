'use strict';

const { safeUpdate } = require('./safeUpdater');

let updateInProgress = false;

function renderSafeUpdaterPage(req, res) {
  res.render('admin/plugins/nodebb-safe-updater', {
    title: 'NodeBB Safe Updater',
    directory: process.env.NODEBB_DIRECTORY || process.cwd(),
    branch: process.env.NODEBB_BRANCH || 'main',
    remote: process.env.NODEBB_REMOTE || 'origin'
  });
}

const plugin = {
  async init(params) {
    const { router, middleware } = params;
    const adminRoute = '/admin/plugins/nodebb-safe-updater';
    const apiRoute = '/api/v3/plugins/nodebb-safe-updater/update';

    router.get(adminRoute, middleware.admin.build, renderSafeUpdaterPage);

    // Updating changes the server's code and runs its package manager, so this
    // endpoint must be restricted to administrators, not merely logged-in users.
    router.post(apiRoute, middleware.admin.build, async (req, res) => {
      if (updateInProgress) {
        return res.status(409).json({ ok: false, error: 'An update is already in progress.' });
      }

      updateInProgress = true;
      try {
        const result = safeUpdate({
          directory: process.env.NODEBB_DIRECTORY || process.cwd(),
          branch: process.env.NODEBB_BRANCH || 'main',
          remote: process.env.NODEBB_REMOTE || 'origin',
          allowDirty: process.env.NODEBB_ALLOW_DIRTY === 'true',
          skipInstall: process.env.NODEBB_SKIP_INSTALL === 'true',
          backupRoot: process.env.NODEBB_BACKUP_ROOT
        });
        return res.json({ ok: true, result });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message || String(error) });
      } finally {
        updateInProgress = false;
      }
    });
  },

  addAdminNavigation(header, callback) {
    // NodeBB ACP navigation routes are relative to /admin.
    header.plugins.push({
      route: '/plugins/nodebb-safe-updater',
      icon: 'fa-rocket',
      name: 'NodeBB Safe Updater'
    });
    callback(null, header);
  }
};

module.exports = plugin;
