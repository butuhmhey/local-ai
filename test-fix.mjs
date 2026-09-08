import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });

// Desktop: landing page
const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p1 = await ctx1.newPage();
await p1.goto('http://localhost:5173/#home');
await p1.waitForTimeout(1500);
await p1.screenshot({ path: '/tmp/fix-landing-desktop.png' });
await ctx1.close();

// Desktop: chat page
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto('http://localhost:5173/#chat');
await p2.waitForTimeout(1500);
await p2.screenshot({ path: '/tmp/fix-chat-desktop.png' });
await ctx2.close();

// Mobile: chat page
const ctx5 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p5 = await ctx5.newPage();
await p5.goto('http://localhost:5173/#chat');
await p5.waitForTimeout(1500);
await p5.screenshot({ path: '/tmp/fix-chat-mobile.png' });
await ctx5.close();

await browser.close();
console.log('Screenshots taken');
