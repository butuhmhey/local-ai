import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// Desktop landing
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/v2-landing-desktop.png', fullPage: false });
console.log('desktop landing ok');

// Desktop chat
await page.goto('http://localhost:5173/#chat', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/v2-chat-desktop.png', fullPage: false });
console.log('desktop chat ok');

// Mobile chat
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:5173/#chat', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/v2-chat-mobile.png', fullPage: false });
console.log('mobile chat ok');

// Mobile landing
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/v2-landing-mobile.png', fullPage: false });
console.log('mobile landing ok');

await browser.close();
console.log('all done');
