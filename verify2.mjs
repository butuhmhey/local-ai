import { chromium } from 'playwright';
const b = await chromium.launch();
// Desktop landing
const p1 = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p1.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p1.waitForTimeout(2000);
await p1.screenshot({ path: '/tmp/landing-desktop.png' });
// Desktop chat
const p2 = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p2.goto('http://localhost:5173/#chat', { waitUntil: 'networkidle' });
await p2.waitForTimeout(2000);
await p2.screenshot({ path: '/tmp/chat-desktop.png' });
await b.close();
console.log('done');
