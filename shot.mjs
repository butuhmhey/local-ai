import { chromium } from 'playwright';

const screenType = process.argv[2]; // 'desktop', 'mobile', or '--all'
const allMode = screenType === '--all';

const shots = [
  {
    name: 'landing',
    routes: [
      { path: '/', wait: 1200, label: 'desktop' },
      { path: '/', wait: 1200, label: 'mobile' },
    ],
  },
  {
    name: 'chat',
    routes: [
      { path: '/#chat', wait: 1200, label: 'desktop' },
      { path: '/#chat', wait: 1200, label: 'mobile' },
    ],
  },
  {
    name: 'memory',
    routes: [
      { path: '/#memory', wait: 1200, label: 'desktop' },
      { path: '/#memory', wait: 1200, label: 'mobile' },
    ],
  },
  {
    name: 'settings',
    routes: [
      { path: '/#settings', wait: 1200, label: 'desktop' },
      { path: '/#settings', wait: 1200, label: 'mobile' },
    ],
  },
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();

for (const shot of shots) {
  for (const route of shot.routes) {
    if (!allMode && route.label !== screenType) continue;

    const width = route.label === 'mobile' ? 390 : 1440;
    const height = route.label === 'mobile' ? 844 : 900;

    await ctx.pages()[0]?.close().catch(() => {});
    const page = await ctx.newPage();
    await page.setViewportSize({ width, height });
    await page.goto(`http://localhost:5173${route.path}`, { waitUntil: 'networkidle', timeout: 8000 });
    await page.waitForTimeout(route.wait);
    await page.screenshot({ path: `/tmp/${shot.name}-${route.label}.png`, fullPage: false });
    console.log(`${shot.name} ${route.label} ok`);
  }
}

await browser.close();
console.log('all done');
