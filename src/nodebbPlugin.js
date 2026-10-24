'use strict';

const { safeUpdate } = require('./safeUpdater');

const plugin = {
  async init(params) {
    const { router, middleware } = params;

    const adminRoute = '/admin/plugins/nodebb-safe-updater';
    const apiRoute = '/api/v3/plugins/nodebb-safe-updater/update';

    router.get(adminRoute, middleware.admin.build, async (req, res) => {
      const context = {
        title: 'NodeBB Safe Updater',
        directory: process.env.NODEBB_DIRECTORY || process.cwd(),
        branch: process.env.NODEBB_BRANCH || 'main',
        remote: process.env.NODEBB_REMOTE || 'origin'
      };

      res.render('admin/plugins/nodebb-safe-updater', context);
    });

    router.post(apiRoute, middleware.ensureLoggedIn, async (req, res) => {
      try {
        const result = safeUpdate({
          directory: process.env.NODEBB_DIRECTORY || process.cwd(),
          branch: process.env.NODEBB_BRANCH || 'main',
          remote: process.env.NODEBB_REMOTE || 'origin',
          allowDirty: Boolean(process.env.NODEBB_ALLOW_DIRTY === 'true'),
          skipInstall: Boolean(process.env.NODEBB_SKIP_INSTALL === 'true')
        });

        res.json({ ok: true, result });
      } catch (error) {
        res.status(500).json({ ok: false, error: error.message || String(error) });
      }
    });
  },

  addAdminNavigation(header, callback) {
    header.plugins.push({
      route: '/admin/plugins/nodebb-safe-updater',
      icon: 'fa-rocket',
      name: 'NodeBB Safe Updater'
    });

    callback(null, header);
  }
};

module.exports = plugin;
