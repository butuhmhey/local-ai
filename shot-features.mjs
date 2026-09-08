// Visual check: inject an edited message bubble + open version dropdown, screenshot it.
import { chromium } from 'playwright';
import { execSync, spawn } from 'child_process';

const PORT = 5197;
const server = execSync(`lsof -ti:${PORT} 2>/dev/null || true`).toString().trim();
if (server) { try { execSync(`kill ${server}`); } catch {} }
spawn('npx vite --host 0.0.0.0 --port ' + PORT, { stdio: 'ignore', detached: true, shell: true }).unref();
await new Promise(r => setTimeout(r, 2500));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://localhost:${PORT}/#chat`, { waitUntil: 'networkidle' });
await page.waitForSelector('.instructions-btn', { timeout: 5000 });
await page.waitForTimeout(500);

// Inject an edited user message + a reply into the chat container.
await page.evaluate(async () => {
  const { MessageBubble } = await import('/src/components/MessageBubble.ts');
  const container = document.querySelector('.chat-container');
  if (!container) return;
  // hide welcome
  document.querySelector('#chat-welcome')?.remove();
  const edited = new MessageBubble({
    message: {
      id: 'u1', role: 'user', content: 'What is WebGPU and why does Ember need it?',
      timestamp: Date.now() - 60000,
      editHistory: [
        { version: 1, content: 'explain webgpu briefly?', timestamp: Date.now() - 120000 },
      ],
      editVersion: 2,
    },
  });
  container.appendChild(edited.getElement());
  const reply = new MessageBubble({
    message: {
      id: 'a1', role: 'assistant',
      content: 'WebGPU is a browser API that lets web apps talk directly to the GPU. Ember runs its models entirely in your browser using it — nothing leaves your machine.',
      timestamp: Date.now(),
    },
  });
  container.appendChild(reply.getElement());
  // open the version dropdown so the screenshot shows it
  setTimeout(() => edited.getElement().querySelector('.version-badge')?.click(), 300);
});
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/features-version-dropdown.png' });
console.log('saved /tmp/features-version-dropdown.png');

// Also hover the edit pencil (default hover actions) and shoot input with stop button state
await page.evaluate(() => {
  const sendBtn = document.querySelector('.send-btn');
  if (sendBtn) {
    sendBtn.classList.add('stopping');
    sendBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"/></svg><span>Stop</span>';
  }
});
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/features-stop-state.png' });
console.log('saved /tmp/features-stop-state.png');

await browser.close();
execSync(`lsof -ti:${PORT} 2>/dev/null | xargs -r kill`);