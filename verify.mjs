import { chromium } from 'playwright-core';

const errors = [];
const consoleErrors = [];
const failedRequests = [];

const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();

page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('requestfailed', (r) => failedRequests.push(`${r.url()} ${r.failure()?.errorText}`));

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 45000 });
// Give the dynamically-imported WebGL canvas time to mount and render frames.
await page.waitForTimeout(4000);

const canvasCount = await page.locator('canvas').count();
const canvasBox = canvasCount ? await page.locator('canvas').first().boundingBox() : null;
const chips = await page.getByRole('button', { name: /superpower/i }).count();
const micLabel = await page.getByRole('button', { name: /start recording/i }).count();
const status = await page.locator('[role="status"]').first().innerText().catch(() => '(none)');

// Does the WebGL context actually exist and have drawn something?
const glInfo = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return { ok: false, reason: 'no canvas element' };
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return { ok: false, reason: 'no webgl context' };
  return { ok: true, w: c.width, h: c.height, renderer: gl.getParameter(gl.VERSION) };
});

// Open the profile panel and confirm résumé content rendered.
let panel = {};
try {
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.waitForTimeout(900);
  const dialog = page.getByRole('dialog');
  const text = await dialog.innerText();
  panel = {
    opened: await dialog.isVisible(),
    hasAspora: text.includes('Aspora'),
    hasGameskraft: text.includes('Gameskraft'),
    hasCodeforces: text.includes('Codeforces'),
    hasNSUT: text.includes('NSUT'),
    hasAES: text.includes('AES-SIV'),
    projectCards: await dialog.getByRole('button', { name: /Ask about this/i }).count(),
  };
} catch (e) {
  panel = { opened: false, error: String(e).slice(0, 120) };
}

console.log(JSON.stringify({
  canvasCount,
  canvasSize: canvasBox && { w: Math.round(canvasBox.width), h: Math.round(canvasBox.height) },
  glInfo,
  suggestionChip: chips,
  micButton: micLabel,
  status,
  panel,
  pageErrors: errors,
  consoleErrors,
  failedRequests,
}, null, 2));

await browser.close();
if (errors.length) process.exitCode = 1;
