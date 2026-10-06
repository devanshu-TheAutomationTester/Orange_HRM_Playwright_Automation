// Copies the latest Playwright HTML report and the test videos into ./test-artifacts
// so a clean run can be committed to the repository as evidence.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const report = path.join(root, 'playwright-report');
const results = path.join(root, 'test-results');
const dest = path.join(root, 'test-artifacts');

if (!fs.existsSync(report)) {
  console.error('playwright-report/ not found - run the tests first (npm test).');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(report, path.join(dest, 'html-report'), { recursive: true });
console.log('Copied playwright-report -> test-artifacts/html-report');

// test-results/<test-folder>/video.webm -> test-artifacts/videos/<test-folder>.webm
const videosDir = path.join(dest, 'videos');
fs.mkdirSync(videosDir, { recursive: true });
let count = 0;
if (fs.existsSync(results)) {
  for (const folder of fs.readdirSync(results)) {
    const dir = path.join(results, folder);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.webm'))) {
      const suffix = file === 'video.webm' ? '' : `-${path.parse(file).name}`;
      fs.copyFileSync(path.join(dir, file), path.join(videosDir, `${folder}${suffix}.webm`));
      count += 1;
    }
  }
}
console.log(`Copied ${count} video(s) -> test-artifacts/videos`);
