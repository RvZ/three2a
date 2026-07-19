/**
 * Headless boot smoke test.
 *
 * Builds are served by `vite preview`; this script drives a real Chromium via
 * Playwright and asserts the game boots: a canvas is present, it has non-zero
 * size, and no uncaught errors reached the console.
 *
 * Usage:
 *   npm run build && npm run preview &   # serves http://localhost:4173
 *   node test/e2e/boot.mjs
 *
 * Env:
 *   SMOKE_URL          target URL (default http://localhost:4173/)
 *   CHROMIUM_PATH      explicit Chromium executable (else Playwright's default)
 *
 * Not wired into CI: headless WebGL is unreliable on hosted runners. Run it
 * locally or in an environment with a GPU / SwiftShader.
 */
import { chromium } from 'playwright';

const URL = process.env.SMOKE_URL || 'http://localhost:4173/';
const errors = [];
const logs = [];

const launchOpts = {
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
};
if (process.env.CHROMIUM_PATH) {
  launchOpts.executablePath = process.env.CHROMIUM_PATH;
}

const browser = await chromium.launch(launchOpts);
const page = await browser.newPage();
page.on('console', (msg) => {
  logs.push(`[${msg.type()}] ${msg.text()}`);
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));

await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500); // let the game init + run a few frames

const result = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  return {
    hasCanvas: !!canvas,
    width: canvas?.width ?? 0,
    height: canvas?.height ?? 0,
  };
});

await browser.close();

const ok = errors.length === 0 && result.hasCanvas && result.width > 0 && result.height > 0;
console.log(ok ? 'BOOT OK' : 'BOOT FAILED');
console.log(JSON.stringify(result));
if (errors.length) console.error('Errors:\n' + errors.join('\n'));
process.exit(ok ? 0 : 1);
