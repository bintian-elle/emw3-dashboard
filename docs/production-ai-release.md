# Production AI tools release

This branch backports the approved AI dashboard landing/navigation and reporting-period changes onto deployed content base 8afdfc1, retaining the existing staging-login entry. Testing report business changes and staging annotations are excluded. Shared Nova composer/date-picker/button presentation dependencies are carried inside the AI tool directory for this backport so existing production report pages keep their deployed presentation. The primary source on codex/staging continues to use canonical shared components.

The workflow is workflow_dispatch only and builds a production artifact without runtime credentials. It does not deploy. Build output must match this source commit and be tested as a candidate before the production PM2 process is switched. Preserve the prior production build for rollback. Runtime remains in the existing production checkout, using its existing private configuration, cached data and worker integration.
