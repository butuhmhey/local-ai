import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://localhost:5173/#/chat', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.screenshot({ path: '/tmp/chat-mobile.png' });
await b.close();
console.log('done');
