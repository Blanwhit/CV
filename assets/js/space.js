/*
 * space.html behaviour.
 *
 * Extracted from the original self-contained bundle: the dc-runtime/React
 * component became a plain class, its editor props are frozen below as
 * config, and element refs are plain getElementById lookups.
 */
(function () {
  'use strict';

  // Settings that used to be editable in the design tool, frozen at their defaults.
  const PROPS = {
    "accent": "oklch(0.79 0.13 82)",
    "starfield": true,
    "scrollReveal": true,
    "motion": "bold"
  };

  class CosmicCv {
    constructor(props) {
      this.props = props;
    }
    init() {
      this.applyVars();
      this.setupReveal();
      this.setupRail();
      this.setupMagnets();
      this.setupCharts();
      this.setupParallax();
    }

    // Bars + IB meter are driven off a scroll sweep re-queried each frame, so they
    // survive template streaming / re-renders swapping the nodes out.
    setupCharts() {
      if (this._chartsBound) return;
      this._chartsBound = true;
      const fire = () => {
        const h = window.innerHeight;
        const bars = Array.from(document.querySelectorAll('[data-bar]'));
        if (bars.length && !this._barsDone) {
          const r = bars[0].getBoundingClientRect();
          if (r.top < h * 0.92 && r.bottom > 0) {
            this._barsDone = true;
            bars.forEach((b, i) => setTimeout(() => { b.style.width = b.getAttribute('data-bar') + '%'; }, i * 170));
          }
        }
        const ticks = Array.from(document.querySelectorAll('[data-ib-tick]'));
        if (ticks.length && !this._ticksDone) {
          const w = document.querySelector('[data-ib]');
          const r = (w || ticks[0]).getBoundingClientRect();
          if (r.top < h * 0.9 && r.bottom > 0) {
            this._ticksDone = true;
            ticks.forEach((t, i) => setTimeout(() => {
              const core = t.hasAttribute('data-core');
              t.style.background = core ? 'oklch(0.86 0.075 82 / 0.55)' : 'var(--accent, oklch(0.79 0.13 82))';
              t.style.boxShadow = core ? '0 0 8px oklch(0.79 0.13 82 / 0.35)' : '0 0 12px oklch(0.79 0.13 82 / 0.55)';
            }, i * 42));
          }
        }
        if (this._barsDone && this._ticksDone) {
          window.removeEventListener('scroll', onScroll);
          clearInterval(this._chartPoll);
        }
      };
      let raf = null;
      const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = null; fire(); }); };
      window.addEventListener('scroll', onScroll, { passive: true });
      this._chartPoll = setInterval(fire, 500);
      fire();
    }

    applyVars() {
      const r = document.documentElement.style;
      r.setProperty('--accent', this.props.accent || 'oklch(0.79 0.13 82)');
      r.setProperty('--star-opacity', (this.props.starfield ?? true) ? '1' : '0');
    }

    setupReveal() {
      if (this._io) { this._io.disconnect(); this._io = null; }
      const els = Array.from(document.querySelectorAll('[data-reveal]'));
      const on = this.props.scrollReveal ?? true;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const clear = (e) => { e.style.opacity = ''; e.style.transform = ''; e.style.filter = ''; e.style.clipPath = ''; };
      if (!on || reduce || !('IntersectionObserver' in window)) { els.forEach(clear); return; }
      const bold = (this.props.motion || 'bold') === 'bold';
      const EASE = 'cubic-bezier(.16,1,.3,1)';
      const hide = (el) => {
        const kind = el.getAttribute('data-reveal') || 'rise';
        const d = bold ? 1 : 0.55;
        el.style.willChange = 'opacity, transform, filter, clip-path';
        if (kind === 'wipe') {
          el.style.opacity = '0';
          el.style.transform = 'translateX(' + (-38 * d).toFixed(1) + 'px)';
          el.style.filter = 'blur(' + (6 * d).toFixed(1) + 'px)';
          el.style.transition = 'opacity .8s ' + EASE + ', transform 1.15s ' + EASE + ', filter .8s ' + EASE;
        } else if (kind === 'hero') {
          el.style.opacity = '0';
          el.style.transform = 'translateY(' + (46 * d).toFixed(1) + 'px) scale(' + (1 - 0.035 * d).toFixed(3) + ')';
          el.style.filter = 'blur(' + (16 * d).toFixed(1) + 'px)';
          el.style.transition = 'opacity 1.2s ' + EASE + ', transform 1.45s ' + EASE + ', filter 1.2s ' + EASE;
        } else if (kind === 'scale') {
          el.style.opacity = '0';
          el.style.transform = 'translateY(' + (44 * d).toFixed(1) + 'px) scale(' + (1 - 0.028 * d).toFixed(3) + ')';
          el.style.filter = 'blur(' + (9 * d).toFixed(1) + 'px)';
          el.style.transition = 'opacity 1s ' + EASE + ', transform 1.25s ' + EASE + ', filter 1s ' + EASE;
        } else {
          el.style.opacity = '0';
          el.style.transform = 'translateY(' + (52 * d).toFixed(1) + 'px)';
          el.style.filter = 'blur(' + (7 * d).toFixed(1) + 'px)';
          el.style.transition = 'opacity .95s ' + EASE + ', transform 1.15s ' + EASE + ', filter .95s ' + EASE;
        }
      };
      const show = (el, i) => {
        el.style.transitionDelay = Math.min(i * (bold ? 105 : 60), 560) + 'ms';
        el.style.opacity = '1';
        el.style.transform = 'translate(0,0) scale(1)';
        el.style.filter = 'blur(0px)';
        el.style.clipPath = '';
        setTimeout(() => { el.style.willChange = 'auto'; el.style.filter = ''; }, 1900);
      };
      const vh = window.innerHeight;
      els.forEach(e => { if (e.getBoundingClientRect().top > vh * 0.86) hide(e); });
      this._io = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          const el = en.target;
          const sibs = Array.from(el.parentElement ? el.parentElement.children : []).filter(n => n.hasAttribute && n.hasAttribute('data-reveal'));
          show(el, Math.max(0, sibs.indexOf(el)));
          this._io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
      els.forEach(e => this._io.observe(e));
      const sweep = () => {
        const h = window.innerHeight;
        els.forEach(e => {
          if (e.style.opacity !== '0') return;
          const r = e.getBoundingClientRect();
          if (r.top < h * 0.9 && r.bottom > -80) { show(e, 0); this._io.unobserve(e); }
        });
      };
      if (!this._sweepBound) {
        this._sweepBound = true;
        window.addEventListener('scroll', () => {
          if (this._swRaf) return;
          this._swRaf = requestAnimationFrame(() => { this._swRaf = null; sweep(); });
        }, { passive: true });
      }
      clearTimeout(this._safety);
      this._safety = setTimeout(() => {
        const h = window.innerHeight;
        els.forEach(e => {
          const r = e.getBoundingClientRect();
          if (r.top < h * 0.95 && r.bottom > 0 && e.style.opacity === '0') { show(e, 0); this._io.unobserve(e); }
        });
      }, 2600);
    }

    setupParallax() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const grid = document.querySelector('[data-parallax="grid"]');
      const stars = document.querySelector('[data-parallax="stars"]');
      if (!grid && !stars) return;
      let raf = null;
      const tick = () => {
        raf = null;
        const y = window.scrollY || document.documentElement.scrollTop;
        // wrap on the tile period so the layers never run out of coverage on long pages
        if (grid) grid.style.transform = 'translate3d(0,' + ((y * 0.045) % 78).toFixed(1) + 'px,0)';
        if (stars) stars.style.transform = 'translate3d(0,' + (-((y * 0.026) % 1426)).toFixed(1) + 'px,0)';
      };
      window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
      tick();
    }

    setupRail() {
      const rail = document.querySelector('[data-rail]');
      if (!rail) return;
      const fill = rail.querySelector('[data-rail-fill]');
      const items = Array.from(rail.querySelectorAll('[data-rail-item]'));
      const show = () => { rail.style.display = window.innerWidth > 1320 ? 'flex' : 'none'; };
      show();
      window.addEventListener('resize', show);
      const dim = 'oklch(0.55 0.014 250)';
      const update = () => {
        const doc = document.documentElement;
        const p = Math.min(1, Math.max(0, doc.scrollTop / Math.max(1, doc.scrollHeight - doc.clientHeight)));
        const h = rail.getBoundingClientRect().height - 12;
        if (fill) fill.style.height = (p * h) + 'px';
        const secs = Array.from(document.querySelectorAll('[data-section]'));
        let active = -1;
        secs.forEach((s, i) => { if (s.getBoundingClientRect().top < window.innerHeight * 0.42) active = i; });
        items.forEach((it, i) => {
          const dot = it.querySelector('[data-rail-dot]');
          const lab = it.querySelector('[data-rail-label]');
          const isOn = i === active;
          it.style.color = isOn ? 'oklch(0.95 0.006 250)' : dim;
          if (dot) {
            dot.style.background = isOn ? 'var(--accent, oklch(0.79 0.13 82))' : 'oklch(0.148 0.014 258)';
            dot.style.borderColor = isOn ? 'var(--accent, oklch(0.79 0.13 82))' : 'oklch(1 0 0 / 0.28)';
            dot.style.boxShadow = isOn ? '0 0 10px var(--accent, oklch(0.79 0.13 82))' : 'none';
            dot.style.transform = isOn ? 'scale(1.15)' : 'scale(1)';
          }
          if (lab) { lab.style.opacity = isOn ? '1' : '0'; lab.style.transform = isOn ? 'translateX(0)' : 'translateX(-6px)'; }
        });
      };
      let raf = null;
      const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = null; update(); }); };
      window.addEventListener('scroll', onScroll, { passive: true });
      rail.addEventListener('mouseenter', () => items.forEach(it => {
        const lab = it.querySelector('[data-rail-label]');
        if (lab) { lab.style.opacity = '1'; lab.style.transform = 'translateX(0)'; }
      }));
      rail.addEventListener('mouseleave', update);
      update();
    }

    setupMagnets() {
      if (window.matchMedia('(hover: none)').matches) return;
      document.querySelectorAll('[data-magnet]').forEach(el => {
        el.style.willChange = 'transform';
        el.addEventListener('mousemove', (e) => {
          const r = el.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width - 0.5) * 7;
          const y = ((e.clientY - r.top) / r.height - 0.5) * 5;
          el.style.transition = 'transform .12s ease-out, background .45s ease';
          el.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1), background .45s ease';
          el.style.transform = 'translate(0,0)';
        });
      });
    }
  }

  const start = () => new CosmicCv(PROPS).init();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
