import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 200 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);

const before = await page.evaluate(() => document.querySelector('header nav')?.parentElement?.textContent);
console.log('Lang before click:', await page.locator('button[aria-label^="Switch to"]').first().textContent());

await page.locator('button[aria-label^="Switch to"]').first().click();
await page.waitForTimeout(300);
console.log('Lang after click:', await page.locator('header button').filter({ hasText: /^(EN|ने)$/ }).first().textContent());

console.log('ERRORS:', JSON.stringify(errors));
await browser.close();
