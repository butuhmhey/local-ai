import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto('http://localhost:5173/#home');
await page.waitForTimeout(1800);
await page.screenshot({ path: '/tmp/landing.png' });

await page.goto('http://localhost:5173/#chat');
await page.waitForTimeout(1800);
await page.screenshot({ path: '/tmp/chat.png' });

await page.goto('http://localhost:5173/#models');
await page.waitForTimeout(1800);
await page.screenshot({ path: '/tmp/models.png' });

await page.goto('http://localhost:5173/#settings');
await page.waitForTimeout(1800);
await page.screenshot({ path: '/tmp/settings.png' });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:5173/#home');
await page.waitForTimeout(1800);
await page.screenshot({ path: '/tmp/mobile-landing.png' });

await page.goto('http://localhost:5173/#chat');
await page.waitForTimeout(1800);
await page.screenshot({ path: '/tmp/mobile-chat.png' });

await browser.close();
console.log('Screenshots taken');
