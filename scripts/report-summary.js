// Turns a Playwright JSON report into a Markdown summary (used for the GitHub Actions job summary).
// Usage: node scripts/report-summary.js results.json >> "$GITHUB_STEP_SUMMARY"
const fs = require('fs');

const file = process.argv[2] || 'results.json';
if (!fs.existsSync(file)) {
  console.log(`## E2E results\n\nNo report found at \`${file}\` - did any shard run?`);
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(file, 'utf8'));
const { expected = 0, unexpected = 0, flaky = 0, skipped = 0, duration = 0 } = report.stats || {};

/** Walks suites recursively and yields { title, status, tags } for every test. */
function* allTests(suite, parents = []) {
  for (const child of suite.suites || []) yield* allTests(child, [...parents, child.title].filter(Boolean));
  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      yield { title: [...parents, spec.title].join(' › '), status: test.status, tags: spec.tags || [] };
    }
  }
}

const tests = (report.suites || []).flatMap((suite) => [...allTests(suite)]);
const list = (status) =>
  tests
    .filter((t) => t.status === status)
    .map((t) => `- ${t.title}`)
    .join('\n') || '_none_';

console.log(`## E2E results - ${report.config?.metadata?.environment || 'unknown'} environment

| ✅ Passed | ❌ Failed | ⚠️ Flaky | ⏭️ Skipped | ⏱️ Duration |
|---|---|---|---|---|
| ${expected} | ${unexpected} | ${flaky} | ${skipped} | ${(duration / 1000).toFixed(0)} s |

### Failed
${list('unexpected')}

### Flaky (passed on retry)
${list('flaky')}
`);
