// Runtime verification for: edit-version badge, version dropdown, instructions modal.
// Uses vite dev so we can import source modules (MessageBubble) directly.
import { chromium } from 'playwright';
import { execSync, spawn } from 'child_process';

const PORT = 5199;
const results = [];
const ok = (name, pass, extra = '') => results.push({ name, pass, extra });

const server = execSync(`lsof -ti:${PORT} 2>/dev/null || true`).toString().trim();
if (server) { try { execSync(`kill ${server}`); } catch {} }

spawn('npx vite --host 0.0.0.0 --port ' + PORT, { stdio: 'ignore', detached: true, shell: true }).unref();
await new Promise(r => setTimeout(r, 2500));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// 1. Instructions button renders in chat header (need to be on #chat)
await page.goto(`http://localhost:${PORT}/#chat`, { waitUntil: 'networkidle' });
await page.waitForSelector('.instructions-btn', { timeout: 5000 });
const hasInstructionsBtn = await page.locator('.instructions-btn').count();
ok('instructions button in chat header', hasInstructionsBtn === 1,
  hasInstructionsBtn ? '' : 'expected 1, got ' + hasInstructionsBtn);

// Click it → modal opens
await page.click('.instructions-btn');
await page.waitForTimeout(300);
const modalOpen = await page.locator('.instructions-modal').count();
ok('instructions modal opens', modalOpen === 1, modalOpen ? '' : 'modal not found');
// Type + save
await page.fill('.instructions-textarea', 'Always answer in two short sentences.');
await page.click('.instructions-modal .btn-primary');
await page.waitForTimeout(400);
const btnActive = await page.locator('.instructions-btn.active').count();
ok('instructions badge activates after save', btnActive === 1, btnActive ? '' : 'btn not active');

// 2. MessageBubble version badge (edited message) — import source module in-page
const bubbleCheck = await page.evaluate(async () => {
  const { MessageBubble } = await import('/src/components/MessageBubble.ts');
  const holder = document.createElement('div');
  document.body.appendChild(holder);
  const bubble = new MessageBubble({
    message: {
      id: 'm1', role: 'user', content: 'v2 edited content', timestamp: Date.now(),
      editHistory: [{ version: 1, content: 'v1 original content', timestamp: Date.now() }],
      editVersion: 2,
    },
    onEdit: () => {},
  });
  holder.appendChild(bubble.getElement());
  const badge = holder.querySelector('.version-badge');
  const badgeVisible = badge && badge.style.display !== 'none';
  const label = badge ? badge.querySelector('.version-badge-label').textContent : null;
  // click badge → dropdown lists v1 with Restore
  if (badge) badge.click();
  await new Promise(r => setTimeout(r, 100));
  const dropdown = holder.querySelector('.version-dropdown');
  const hasRow = !!dropdown && !!dropdown.querySelector('.version-row');
  const restoreLabel = dropdown ? dropdown.querySelector('.version-num')?.textContent : null;
  // test restore path: click Restore → becomes v3, content updated, onEdit called
  let editedContent = null;
  const b2 = new MessageBubble({
    message: { id: 'm2', role: 'user', content: 'current', timestamp: Date.now(),
      editHistory: [{ version: 1, content: 'v1', timestamp: 1 }, { version: 2, content: 'current', timestamp: 2 }],
      editVersion: 3 },
    onEdit: (id, c) => { editedContent = c; },
  });
  holder.appendChild(b2.getElement());
  b2.getElement().querySelector('.version-badge').click();
  await new Promise(r => setTimeout(r, 100));
  // Click "Restore" on the v1 row (the version we want to restore to).
  const v1Row = Array.from(b2.getElement().querySelectorAll('.version-row'))
    .find(row => row.querySelector('.version-num')?.textContent === 'v1');
  const restoreBtn = v1Row?.querySelector('.version-restore');
  if (restoreBtn) restoreBtn.click();
  await new Promise(r => setTimeout(r, 100));
  const newVersion = b2.getElement().querySelector('.version-badge-label')?.textContent;
  return { badgeVisible, label, hasRow, restoreLabel, editedContent, newVersion };
});
ok('version badge visible on edited message', bubbleCheck.badgeVisible === true, JSON.stringify(bubbleCheck));
ok('version badge label = v2', bubbleCheck.label === 'v2', 'label=' + bubbleCheck.label);
ok('dropdown lists a version row', bubbleCheck.hasRow === true, 'row=' + bubbleCheck.hasRow);
ok('dropdown first row shows v1', bubbleCheck.restoreLabel === 'v1', 'restoreLabel=' + bubbleCheck.restoreLabel);
ok('restore updates onEdit content', bubbleCheck.editedContent === 'v1', 'editedContent=' + bubbleCheck.editedContent);
ok('restore bumps version to v4', bubbleCheck.newVersion === 'v4', 'newVersion=' + bubbleCheck.newVersion);

// 3. No console errors (excluding known WebGPU/streaming/dev-SW noise)
const cleanErrors = errors.filter(e => !/WebGPU|navigator|loadModel|webllm|ServiceWorker|unsupported MIME/i.test(e));
ok('no unexpected console/page errors', cleanErrors.length === 0, cleanErrors.join(' | ').slice(0, 400));

await browser.close();
execSync(`lsof -ti:${PORT} 2>/dev/null | xargs -r kill`);

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.extra ? '  → ' + r.extra : ''}`);
}
console.log(failed === 0 ? '\nALL CHECKS PASSED' : `\n${failed} CHECK(S) FAILED`);
process.exit(failed ? 1 : 0);
