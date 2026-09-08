/**
 * DownloadPrompt — modal that asks the user to confirm a model download
 * *before* a model becomes usable.
 *
 * Flow: confirm → download (with live progress) → resolve true on success.
 * Returns false when the user cancels or the download fails.
 */

import { createElement, formatBytes, formatNumber } from '../utils/helpers.js';
import type { ModelInfo } from '../models/modelRegistry.js';
import type { ModelLoadProgress } from '../types/index.js';

export type DownloadHandler = (
  model: ModelInfo,
  onProgress?: (p: ModelLoadProgress) => void
) => Promise<boolean>;

const STAGE_LABEL: Record<string, string> = {
  downloading: 'Downloading',
  compiling: 'Compiling shaders',
  loading: 'Loading into memory',
  ready: 'Ready',
  error: 'Error',
};

/** Ask the user to download a model. Resolves true once it's downloaded & ready. */
export function requestModelDownload(
  model: ModelInfo,
  onDownload: DownloadHandler
): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = createElement('div', { class: 'modal-overlay download-prompt-overlay' });
    const modal = createElement('div', { class: 'modal download-prompt' });

    // ---------- Confirmation view ----------
    const view = createElement('div');

    const header = createElement('div', { class: 'modal-header' });
    const title = createElement('h2', { class: 'modal-title', children: ['Download model'] });
    const closeBtn = createElement('button', {
      class: 'modal-close',
      type: 'button',
      'aria-label': 'Close',
      children: ['✕'],
    });

    const body = createElement('div', { class: 'modal-body' });

    const name = createElement('h3', { class: 'download-prompt-name', children: [model.name] });
    const desc = createElement('p', {
      class: 'download-prompt-desc',
      children: [model.description || 'Run this model locally, fully private.'],
    });
    const note = createElement('div', {
      class: 'download-prompt-note',
      children: [
        'This downloads the model weights to your device so it can run fully offline — you only do this once per model.',
      ],
    });

    const specs = createElement('div', { class: 'download-prompt-specs' });
    specs.append(
      createElement('span', { class: 'download-prompt-chip', children: [
        formatBytes((model.downloadSizeMB ?? 0) * 1024 * 1024),
      ]}),
      createElement('span', { class: 'download-prompt-chip', children: [`${model.ramGB} GB VRAM`] }),
      createElement('span', { class: 'download-prompt-chip', children: [
        `${formatNumber(model.contextWindow ?? 4096)} ctx`,
      ]})
    );

    // Progress (revealed when the download starts)
    const progress = createElement('div', { class: 'download-prompt-progress hidden' });
    const stageEl = createElement('span', { class: 'download-prompt-stage', children: ['Preparing…'] });
    const statusEl = createElement('span', { class: 'download-prompt-status', children: ['Starting download…'] });
    const bar = createElement('div', { class: 'download-prompt-bar' });
    const fill = createElement('div', { class: 'download-prompt-fill' });
    bar.appendChild(fill);
    const pctEl = createElement('span', { class: 'download-prompt-pct', children: ['0%'] });
    progress.append(stageEl, bar, statusEl, pctEl);

    body.append(name, desc, note, specs, progress);

    const footer = createElement('div', { class: 'modal-footer' });
    const cancelBtn = createElement('button', {
      class: 'btn btn-secondary',
      type: 'button',
      children: ['Not now'],
    });
    const dlBtn = createElement('button', {
      class: 'btn btn-primary',
      type: 'button',
      children: [`Download ${formatBytes((model.downloadSizeMB ?? 0) * 1024 * 1024)}`],
    });
    const retryBtn = createElement('button', {
      class: 'btn btn-primary hidden',
      type: 'button',
      children: ['Retry download'],
    });

    header.append(title, closeBtn);
    footer.append(cancelBtn, dlBtn, retryBtn);
    view.append(header, body, footer);
    modal.appendChild(view);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    let running = false;

    function close(): void {
      overlay.remove();
      resolve(false);
    }

    function setButtons(mode: 'confirm' | 'downloading' | 'failed'): void {
      dlBtn.classList.toggle('hidden', mode !== 'confirm');
      retryBtn.classList.toggle('hidden', mode !== 'failed');
      if (mode === 'downloading') {
        cancelBtn.textContent = 'Cancel';
      } else if (mode === 'failed') {
        cancelBtn.textContent = 'Close';
      } else {
        cancelBtn.textContent = 'Not now';
      }
    }

    function renderProgress(p: ModelLoadProgress): void {
      const progressNum = p == null ? 0 : typeof p === 'number' ? p : p.progress ?? 0;
      const stage = (p as any)?.stage as string | undefined;
      const msg = (p as any)?.message as string | undefined;
      const pct = Math.min(100, Math.max(0, Math.round(progressNum * 100)));
      const label = (stage && STAGE_LABEL[stage]) || 'Downloading';

      fill.style.width = `${pct}%`;
      pctEl.textContent = `${pct}%`;
      stageEl.textContent = label;
      statusEl.textContent = msg && msg.length < 90
        ? msg
        : `${pct}% — first download can take a few minutes.`;
    }

    function beginDownload(): void {
      if (running) return;
      running = true;
      progress.classList.remove('hidden');
      setButtons('downloading');

      Promise.resolve(onDownload(model, renderProgress))
        .then((ok) => {
          if (ok) {
            fill.style.width = '100%';
            pctEl.textContent = '100%';
            stageEl.textContent = 'Downloaded';
            statusEl.textContent = `${model.name} is ready — switching now…`;
            footer.querySelectorAll('button').forEach(b => b.classList.add('hidden'));
            setTimeout(() => {
              overlay.remove();
              resolve(true);
            }, 700);
          } else {
            throw new Error('download returned false');
          }
        })
        .catch(() => {
          running = false;
          stageEl.textContent = 'Download failed';
          statusEl.textContent = 'Could not download this model right now. Check your connection and try again.';
          setButtons('failed');
        });
    }

    dlBtn.addEventListener('click', beginDownload);
    retryBtn.addEventListener('click', beginDownload);
    cancelBtn.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    requestAnimationFrame(() => dlBtn.focus());
  });
}