import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errors = [];
p.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});
p.on('pageerror', err => errors.push('PAGE_ERR: ' + err.message));
await p.goto('http://localhost:5173/#/chat', { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);
console.log('=== ERRORS ===');
errors.forEach(e => console.log(e));
console.log('=== URL ===');
console.log(p.url());
await b.close();
