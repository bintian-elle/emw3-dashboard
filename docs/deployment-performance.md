# Deployment performance

The deployment volume is now 16 GiB, but the host still has about 2 GiB RAM
and no swap. Keep Webpack memory optimizations; do not assume disk expansion
fixes the previous Turbopack process termination.

- Production builds reuse Next.js filesystem caches instead of deleting them.
- deploy.sh runs npm ci only when package manifests, .npmrc, Node version,
  platform/architecture, or relevant environment inputs change (or the stamp
  is absent). The first deployment installs once to establish the stamp.
- A lock prevents concurrent deployments. Build failures do not run PM2 restart.
- FORCE_INSTALL=1 ./deploy.sh forces a dependency reinstall if needed.
- npm run clean:build-cache manually clears the disposable Next build cache.
- npm run build:turbo is available for controlled testing on a sufficiently
  provisioned host; the normal deployment command remains Webpack.
- Security auditing is separate from the hot deployment path: use npm audit.

The existing server-only deploy.sh has not been overwritten. Before publishing
the tracked script, preserve/compare that file and make it executable. Deploy
only after publication is approved. This does not make in-place .next builds
atomic; active users can still be affected while a build replaces output.

No production speed benchmark has been run with this change. The first cached
build may still be cold; later builds can reuse artifacts.
