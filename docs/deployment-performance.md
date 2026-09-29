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

The tracked script was deployed on 2026-09-29 after preserving the previous
server-only script under .git/deploy.sh.pre-67476b0. This does not make in-place .next builds
atomic; active users can still be affected while a build replaces output.

Production validation: dependency reuse succeeded. Enabling the filesystem cache
caused a kernel OOM kill on the 1.9 GiB/no-swap instance, including a retry with
reduced cache generations and a 768 MiB Node heap. The production environment now
sets NEXT_DISABLE_BUILD_CACHE=true. With cache disabled, compilation succeeded in
71 seconds and TypeScript in 8.2 seconds; these are stage times, not total deploy
time. No warm-cache speed improvement is claimed on this host. The default cache
configuration remains available for hosts with sufficient memory.
