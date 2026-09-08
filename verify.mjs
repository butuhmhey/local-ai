import { execSync } from 'child_process';

const server = execSync('lsof -ti:5173 2>/dev/null || true').toString().trim();
if (server) {
  try { execSync(`kill ${server}`); } catch {}
  await new Promise(r => setTimeout(r, 500));
}

execSync('npx vite --host 0.0.0.0 --port 5173 &', { stdio: 'inherit', shell: true });
await new Promise(r => setTimeout(r, 1500));

try {
  execSync('node shot.mjs --all', { stdio: 'inherit' });
} catch (e) {
  console.error('shot.mjs failed:', e.message);
  process.exit(1);
}

console.log('\nDone! Screenshots saved to /tmp/');
console.log('  Landing: /tmp/landing-desktop.png, /tmp/landing-mobile.png');
console.log('  Chat:    /tmp/chat-desktop.png, /tmp/chat-mobile.png');
console.log('  Memory:  /tmp/memory-desktop.png, /tmp/memory-mobile.png');
console.log('  Settings:/tmp/settings-desktop.png, /tmp/settings-mobile.png');

process.exit(0);
