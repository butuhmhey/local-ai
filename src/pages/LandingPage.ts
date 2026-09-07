/**
 * LandingPage — the welcoming front door for Ember.
 * Warm, minimal, mobile-first. No app shell — a public landing with a CTA.
 */

export class LandingPage {
  private element: HTMLElement;

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  async onShow(): Promise<void> {
    // Landing needs no per-show work
  }

  private createElement(): HTMLElement {
    const root = document.createElement('div');
    root.className = 'landing';
    root.innerHTML = `
      <div class="landing-glow" aria-hidden="true"></div>
      <header class="landing-nav">
        <div class="landing-brand">
          <div class="sidebar-logo-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 17 10a5 5 0 1 1-10 0c0-1 .5-2.5 1.5-3.5C9.5 5.5 11 5 12 2z"></path>
            </svg>
          </div>
          <span class="landing-brand-name">Ember</span>
        </div>
        <button class="btn btn-primary" data-landing-start>Start chatting</button>
      </header>

      <main class="landing-main">
        <section class="landing-hero">
          <div class="welcome-icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 17 10a5 5 0 1 1-10 0c0-1 .5-2.5 1.5-3.5C9.5 5.5 11 5 12 2z"></path>
            </svg>
          </div>
          <h1 class="landing-title">Your private AI,<br/>burning in your browser.</h1>
          <p class="landing-subtitle">Ember runs large language models directly on your device — nothing leaves, everything remembers, and it costs €0 forever.</p>
          <button class="btn btn-primary btn-lg" data-landing-start>
            Start chatting
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          <p class="landing-note">No account · No cloud · No subscription</p>
        </section>

        <section class="landing-features">
          <div class="landing-feature">
            <div class="welcome-feature-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h3>Fully private</h3>
            <p>Your words never leave your device. No servers, no logs, no surveillance.</p>
          </div>
          <div class="landing-feature">
            <div class="welcome-feature-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </div>
            <h3>Blazing fast</h3>
            <p>Powered by WebGPU, running 100+ models from 1B to 70B right on your hardware.</p>
          </div>
          <div class="landing-feature">
            <div class="welcome-feature-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round"><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 4 7.5L12 20l3-3.5c2-2 4-4.5 4-7.5a7 7 0 0 0-7-7z"></path><circle cx="12" cy="9" r="2"></circle></svg>
            </div>
            <h3>Never forgets</h3>
            <p>Auto-compacting smart memory keeps every detail for long conversations.</p>
          </div>
        </section>
      </main>

      <footer class="landing-footer">
        <span>Ember v1.0.0 · Open source · 100% local AI</span>
      </footer>
    `;
    return root;
  }

  private bindEvents(): void {
    this.element.querySelectorAll('[data-landing-start]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.hash = '#chat';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
    });
  }
}