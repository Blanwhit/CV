/*
 * index.html behaviour.
 *
 * Extracted from the original self-contained bundle: the dc-runtime/React
 * component became a plain class, its editor props are frozen below as
 * config, and element refs are plain getElementById lookups.
 */
(function () {
  'use strict';

  // Settings that used to be editable in the design tool, frozen at their defaults.
  const PROPS = {
    "accent": "#ff5c22",
    "blueprint": true,
    "ticker": true
  };

  class BrutalistCv {
    constructor(props) {
      this.props = props;
      this.root = document.getElementById('cv-root');
    }

    applyAccent() {
      if (this.root) this.root.style.setProperty('--accent', this.props.accent || '#ff5c22');
    }

    init() {
      this.applyAccent();
      const root = this.root || document;

      // Pointer-tracked glow in the hero
      const hero = root.querySelector('#cv-hero');
      const glow = root.querySelector('#cv-glow');
      if (hero && glow) {
        this._move = (e) => {
          const r = hero.getBoundingClientRect();
          glow.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          glow.style.setProperty('--my', (e.clientY - r.top) + 'px');
        };
        hero.addEventListener('pointermove', this._move);
      }

      // Count-up on reveal
      const ease = (t) => 1 - Math.pow(1 - t, 4);
      const counters = Array.prototype.slice.call(root.querySelectorAll('[data-count]'));
      const run = (el) => {
        if (el.dataset.counted) return;
        el.dataset.counted = '1';
        const raw = (el.textContent || '').trim();
        const m = raw.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
        if (!m) return;
        const pre = m[1], suf = m[3];
        const numStr = m[2].replace(/,/g, '');
        const target = parseFloat(numStr);
        const dec = (numStr.split('.')[1] || '').length;
        const grouped = m[2].indexOf(',') > -1;
        const dur = 1400, t0 = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / dur);
          const v = target * ease(p);
          const shown = dec ? v.toFixed(dec) : (grouped ? Math.round(v).toLocaleString('en-US') : String(Math.round(v)));
          el.textContent = pre + shown + suf;
          if (p < 1) requestAnimationFrame(tick); else el.textContent = raw;
        };
        requestAnimationFrame(tick);
      };
      if ('IntersectionObserver' in window) {
        this._co = new IntersectionObserver((entries) => {
          entries.forEach((e) => { if (e.isIntersecting) { run(e.target); this._co.unobserve(e.target); } });
        }, { threshold: 0.4 });
        counters.forEach((el) => this._co.observe(el));

        // Rail active-section tracking
        const ids = ['cv-education', 'cv-achievements', 'cv-research', 'cv-technical', 'cv-skills'];
        const links = ids.map((id, i) => root.querySelector('#cv-rail-' + i));
        const setActive = (i) => {
          links.forEach((a, j) => {
            if (!a) return;
            const on = j === i;
            a.style.color = on ? '#f7f5ef' : '#6e6a63';
            a.style.textShadow = on ? '0 0 18px rgba(255,255,255,0.35)' : 'none';
            a.style.transform = on ? 'scale(1.32)' : 'scale(1)';
          });
        };
        this._so = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              const i = ids.indexOf(e.target.id);
              if (i > -1) setActive(i);
            }
          });
        }, { rootMargin: '-45% 0px -50% 0px' });
        ids.forEach((id) => { const s = root.querySelector('#' + id); if (s) this._so.observe(s); });
      }
    }

    destroy() {
      const hero = this.root && this.root.querySelector('#cv-hero');
      if (hero && this._move) hero.removeEventListener('pointermove', this._move);
      if (this._co) this._co.disconnect();
      if (this._so) this._so.disconnect();
    }
  }

  const start = () => new BrutalistCv(PROPS).init();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
