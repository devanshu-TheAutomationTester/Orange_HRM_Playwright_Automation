// Cross-platform cleanup of generated reports, videos, traces, screenshots and saved sessions.
const fs = require('fs');
const path = require('path');

for (const dir of ['test-results', 'playwright-report', 'blob-report', 'all-blob-reports', '.auth']) {
  const target = path.resolve(__dirname, '..', dir);
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Removed ${target}`);
}
