import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Profile' }).click();
await page.waitForTimeout(800);
const d = page.getByRole('dialog');
// Scroll the panel's scroll container to the bottom to force all content into view.
const headers = await d.locator('h3').allInnerTexts();
console.log('section headers:', JSON.stringify(headers, null, 1));
await browser.close();
