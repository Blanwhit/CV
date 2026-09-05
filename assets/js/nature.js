/*
 * nature.html behaviour.
 *
 * Extracted from the original self-contained bundle: the dc-runtime/React
 * component became a plain class, its editor props are frozen below as
 * config, and element refs are plain getElementById lookups.
 */
(function () {
  'use strict';

  // Settings that used to be editable in the design tool, frozen at their defaults.
  const PROPS = {
    "ambientDensity": 78,
    "showFilaments": true,
    "motionIntensity": 1
  };

  class OrganicCv {
    constructor(props) {
      this.props = props;
      this.root = document.getElementById('cv-root');
      this.canvas = document.getElementById('cv-canvas');
      this.cursor = document.getElementById('cv-cursor');
    }



    init() {
      const root = this.root;
      if (!root) return;
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // How far below the viewport top a rail click parks a section heading.
      // The scroll-spy anchors to the same number so clicking a rail item leaves
      // the fill exactly on that item's dot.
      this.navOffset = 70;
      this.disposers = [];
      this.pointerSubs = [];
      this.resizeHooks = [];
      this.scrollHooks = [];

      this.initPointer();
      this.splitName(root);
      this.initReveal(root);
      this.initScroll(root);
      this.initTilt(root);
      this.initCursor(root);
      this.initNav(root);
      this.initCanvas();
      this.initCurve(root);
      this.applyResponsive();

      // One rAF-coalesced resize fan-out. Previously four separate listeners each
      // did their own layout reads on every resize event.
      let rq = 0;
      this.on(window, 'resize', () => {
        if (rq) return;
        rq = requestAnimationFrame(() => { rq = 0; this.applyResponsive(); this.fireResize(); });
      });

      // Web fonts and late layout shifts move the cached geometry; re-measure.
      const re = () => this.fireResize();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(re).catch(() => {});
      this.tids = [setTimeout(re, 600), setTimeout(re, 2200)];
    }

    onResize(fn) { this.resizeHooks.push(fn); }
    fireResize() { for (let i = 0; i < this.resizeHooks.length; i++) this.resizeHooks[i](); }

    /* A single window pointermove feeds every consumer (cursor light, ambient
       field). Was three separate window-level listeners. */
    initPointer() {
      this.on(window, 'pointermove', (e) => {
        const x = e.clientX, y = e.clientY, s = this.pointerSubs;
        for (let i = 0; i < s.length; i++) s[i](x, y);
      }, { passive: true });
    }
    onPointer(fn) { this.pointerSubs.push(fn); }

    applyResponsive() {
      const root = this.root;
      if (!root) return;
      if (!this.railEl) {
        this.railEl = root.querySelector('[data-rail]');
        this.labelEls = Array.prototype.slice.call(root.querySelectorAll('[data-label]'));
      }
      const w = window.innerWidth;
      const labels = w >= 1370;
      const flipped = labels !== this.railLabels;
      this.railLabels = labels;
      const rail = this.railEl;
      if (rail) {
        const disp = w < 1150 ? 'none' : 'flex';
        if (rail.style.display !== disp) rail.style.display = disp;
        if (disp !== 'none') {
          const left = labels ? '34px' : '13px';
          if (rail.style.left !== left) rail.style.left = left;
        }
      }
      if (!labels) {
        this.labelEls.forEach(l => { l.style.opacity = '0'; l.style.transform = 'translateX(-6px)'; });
      }
      const cur = this.cursor;
      if (cur) {
        const d = w < 860 ? 'none' : 'block';
        if (cur.style.display !== d) cur.style.display = d;
      }
      if (flipped && this.paintDots) this.paintDots(true);
    }

    initCurve(root) {
      const line = root.querySelector('[data-curve-line]');
      if (line && line.getTotalLength) {
        try {
          const L = line.getTotalLength();
          if (L > 0) { line.style.strokeDasharray = L + ''; line.style.strokeDashoffset = L + ''; }
        } catch (e) {}
      }
    }

    playCurve(el) {
      const q = (s) => el.querySelector(s);
      const clip = q('[data-curve-clip]');
      const line = q('[data-curve-line]');
      const mean = q('[data-curve-mean]');
      const you = q('[data-curve-you]');
      const dot = q('[data-curve-dot]');
      const ring = q('[data-curve-ring]');
      const trav = q('[data-curve-travel]');
      if (clip) clip.style.transform = 'scaleX(1)';
      if (line) line.style.strokeDashoffset = '0';
      if (mean) mean.style.transform = 'scaleY(1)';
      if (you) you.style.transform = 'scaleY(1)';
      if (dot) { dot.style.opacity = '1'; dot.style.transform = 'scale(1)'; }
      if (ring) { ring.style.opacity = '1'; ring.style.animation = 'omRing 2.9s ease-out 2.1s infinite'; }
      if (trav) trav.style.opacity = '0.9';
      el.querySelectorAll('[data-curve-fade]').forEach(f => {
        f.style.opacity = '1';
        f.style.transform = f.dataset.to || 'none';
      });
    }

    destroy() {
      (this.disposers || []).forEach(fn => { try { fn(); } catch (e) {} });
      (this.tids || []).forEach(clearTimeout);
      if (this.raf) cancelAnimationFrame(this.raf);
      if (this.craf) cancelAnimationFrame(this.craf);
    }

    on(target, ev, fn, opts) {
      target.addEventListener(ev, fn, opts);
      this.disposers.push(() => target.removeEventListener(ev, fn, opts));
    }

    /* ---------- hero name: split into per-letter spans and cascade in ---------- */
    splitName(root) {
      const el = root.querySelector('[data-split]');
      if (!el) return;
      if (el.dataset.done !== '1') {
      el.dataset.done = '1';
      const text = el.textContent;
      el.textContent = '';
      const frag = document.createDocumentFragment();
      const words = text.split(' ');
      words.forEach((word, wi) => {
        const w = document.createElement('span');
        w.style.cssText = 'display:inline-block;white-space:nowrap';
        word.split('').forEach((ch, i) => {
          const outer = document.createElement('span');
          outer.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;padding-bottom:0.06em';
          const inner = document.createElement('span');
          inner.dataset.l = '1';
          inner.textContent = ch;
          inner.style.cssText = 'display:inline-block;transform:translateY(112%) rotate(6deg);opacity:0;filter:blur(12px);' +
            'transition:transform 1.15s cubic-bezier(.16,1,.3,1),opacity .9s ease,filter .9s ease;' +
            'transition-delay:' + (140 + (wi * 5 + i) * 42) + 'ms';
          outer.appendChild(inner);
          w.appendChild(outer);
        });
        frag.appendChild(w);
        if (wi < words.length - 1) frag.appendChild(document.createTextNode(' '));
      });
      el.appendChild(frag);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.querySelectorAll('span > span').forEach(s => {
          s.style.transform = 'translateY(0) rotate(0deg)';
          s.style.opacity = '1';
          s.style.filter = 'blur(0px)';
        });
      }));
      }

      const glyphs = Array.prototype.slice.call(el.querySelectorAll('[data-l]'));

      // settle the intro transition into a short one so hover reads smoothly
      setTimeout(() => {
        glyphs.forEach(s => {
          s.style.transitionDelay = '0ms';
          s.style.transition = 'color .45s ease';
          s.style.filter = '';
          s.style.willChange = '';
        });
      }, 2000);

      let centers = null, cx = -1, queued = false;
      const measure = () => {
        centers = glyphs.map(s => { const r = s.getBoundingClientRect(); return r.left + r.width / 2; });
      };
      const apply = () => {
        queued = false;
        for (let i = 0; i < glyphs.length; i++) {
          let w = 0;
          if (cx >= 0 && centers) {
            w = Math.max(0, 1 - Math.abs(centers[i] - cx) / 130);
            w = w * w * (3 - 2 * w);
          }
          const c = w > 0.02
            ? 'rgb(' + Math.round(242 - 25 * w) + ',' + Math.round(236 - 76 * w) + ',' + Math.round(222 - 131 * w) + ')'
            : '';
          if (glyphs[i].style.color !== c) glyphs[i].style.color = c;
        }
      };
      const queue = () => { if (!queued) { queued = true; requestAnimationFrame(apply); } };
      this.on(el, 'pointerenter', measure);
      this.on(el, 'pointermove', (e) => {
        if (!centers) measure();
        cx = e.clientX;
        queue();
      }, { passive: true });
      this.on(el, 'pointerleave', () => { cx = -1; centers = null; queue(); });
      this.onResize(() => { centers = null; });
      this.scrollHooks.push(() => { centers = null; });
    }

    /* ---------- scroll reveal ---------- */
    initReveal(root) {
      this.revealed = [];
      this.staggered = [];
      const io = new IntersectionObserver((entries) => {
        for (let i = 0; i < entries.length; i++) {
          const en = entries[i];
          if (!en.isIntersecting) continue;
          io.unobserve(en.target);
          this.applyReveal(en.target);
        }
      }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
      root.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

      const ios = new IntersectionObserver((entries) => {
        for (let i = 0; i < entries.length; i++) {
          const en = entries[i];
          if (!en.isIntersecting) continue;
          ios.unobserve(en.target);
          this.applyStagger(en.target);
        }
      }, { threshold: 0.2 });
      root.querySelectorAll('[data-stagger]').forEach(el => ios.observe(el));
      this.disposers.push(() => { io.disconnect(); ios.disconnect(); });
    }

    applyReveal(el) {
      if (this.revealed.indexOf(el) < 0) this.revealed.push(el);
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.filter = 'none';
      el.querySelectorAll('[data-rule]').forEach(r => { r.style.transform = 'scaleX(1)'; });
      el.querySelectorAll('[data-bar]').forEach(b => { b.style.width = b.dataset.bar + '%'; });
      el.querySelectorAll('[data-count]').forEach(c => this.countUp(c));
      if (el.hasAttribute('data-count')) this.countUp(el);
      el.querySelectorAll('[data-curve]').forEach(c => this.playCurve(c));
      // Drop the blur filter once the reveal transition has finished so the
      // element stops being a filtered (repaint-heavy) layer for the rest of
      // the session.
      setTimeout(() => { el.style.filter = ''; el.style.willChange = ''; }, 1400);
    }

    applyStagger(el) {
      if (this.staggered.indexOf(el) < 0) this.staggered.push(el);
      const chips = Array.prototype.slice.call(el.querySelectorAll('[data-chip]'));
      chips.forEach((c, i) => {
        c.style.transitionDelay = (i * 65) + 'ms';
        c.style.opacity = '1';
        c.style.transform = 'none';
      });
      setTimeout(() => { chips.forEach(c => { c.style.transitionDelay = '0ms'; }); }, chips.length * 65 + 1000);
    }

    countUp(el) {
      const dec0 = parseInt(el.dataset.dec || '0', 10);
      if (el.dataset.ran === '1') {
        const done = parseFloat(el.dataset.count).toFixed(dec0);
        if (el.textContent !== done) el.textContent = done;
        return;
      }
      el.dataset.ran = '1';
      const target = parseFloat(el.dataset.count);
      const dur = 1700;
      const t0 = performance.now();
      let shown = null;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 4);
        const s = (target * e).toFixed(dec0);
        if (s !== shown) { shown = s; el.textContent = s; }
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toFixed(dec0);
      };
      requestAnimationFrame(step);
    }

    /* ---------- scroll-linked chrome ----------
       All geometry is measured into document space once per resize, so a scroll
       frame is pure arithmetic plus a diffed write pass — no per-element
       getBoundingClientRect, and no read-after-write layout thrash. */
    initScroll(root) {
      const bar = root.querySelector('[data-progress]');
      const railFill = root.querySelector('[data-railfill]');
      const railNav = root.querySelector('[data-rail]');
      const btns = Array.prototype.slice.call(root.querySelectorAll('[data-goto]'));
      const sections = btns.map(b => root.querySelector('#' + b.dataset.goto));
      const dotEls = btns.map(b => b.querySelector('[data-dot]'));
      const labEls = btns.map(b => b.querySelector('[data-label]'));
      const timelines = Array.prototype.slice.call(root.querySelectorAll('[data-timeline]'));
      const parallax = Array.prototype.slice.call(root.querySelectorAll('[data-parallax]'));
      const nodes = Array.prototype.slice.call(root.querySelectorAll('[data-node]'));

      let secTop = [], tlGeo = [], nodeTop = [], pxMid = [], docMax = 1, lastSH = -1;
      // anchor[i] = scrollY at which section i becomes current;
      // railPos[i] = where dot i sits along the rail track, as a 0..1 fraction.
      let anchor = [], railPos = [];

      const measure = () => {
        const sy = window.scrollY;
        secTop = sections.map(s => s ? s.getBoundingClientRect().top + sy : Infinity);
        tlGeo = timelines.map(tl => {
          const r = tl.parentElement.getBoundingClientRect();
          return { top: r.top + sy, h: Math.max(1, r.height) };
        });
        nodeTop = nodes.map(n => n.getBoundingClientRect().top + sy);
        pxMid = parallax.map(el => {
          const t = el.style.transform;
          if (t) el.style.transform = 'none';
          const r = el.getBoundingClientRect();
          if (t) el.style.transform = t;
          return r.top + sy + r.height / 2;
        });
        lastSH = document.documentElement.scrollHeight;
        const vh = window.innerHeight;
        docMax = Math.max(1, lastSH - vh);

        /* A section becomes current exactly where a rail click parks it — its
           heading `navOffset` below the top of the viewport. Anchoring both to
           the same number is what keeps the fill on a dot after clicking it.
           (The old rule used a line fixed at 42% of the viewport, which is a
           different position entirely, so the fill always overshot its dot.)

           The last section is the exception: it sits inside the final screenful,
           so `top - navOffset` lands past the maximum scroll and its dot could
           never light — that is why "connect" was unreachable. Reserve a slice
           of the tail for it, then walk backwards keeping every earlier anchor
           strictly before the one after it. */
        const reserve = Math.min(vh * 0.3, docMax * 0.15);
        anchor = secTop.map(t => isFinite(t) ? t - this.navOffset : Infinity);
        let cap = docMax - reserve;
        for (let i = anchor.length - 1; i >= 0; i--) {
          if (anchor[i] > cap) anchor[i] = cap;
          cap = anchor[i] - 1;
        }
        for (let i = 0; i < anchor.length; i++) if (anchor[i] < 0) anchor[i] = 0;

        /* Where each dot actually sits on the rail. The fill is interpolated
           between these, not through raw scroll progress, so it reaches a dot
           exactly as that dot lights up. */
        railPos = [];
        if (railNav) {
          const nb = railNav.getBoundingClientRect();
          const trackH = nb.height - 12;
          if (trackH > 0) {
            railPos = dotEls.map(d => {
              if (!d) return 0;
              const r = d.getBoundingClientRect();
              const v = (r.top + r.height / 2 - nb.top - 6) / trackH;
              return v < 0 ? 0 : (v > 1 ? 1 : v);
            });
          }
        }
      };

      // Maps a scroll position onto the rail so the fill tracks the dots.
      const railProgress = (sy) => {
        const n = anchor.length;
        if (!n || railPos.length !== n) return sy / docMax;
        if (sy <= anchor[0]) return anchor[0] > 0 ? (sy / anchor[0]) * railPos[0] : railPos[0];
        for (let i = 0; i < n - 1; i++) {
          if (sy < anchor[i + 1]) {
            const span = anchor[i + 1] - anchor[i];
            const t = span > 0 ? (sy - anchor[i]) / span : 1;
            return railPos[i] + (railPos[i + 1] - railPos[i]) * t;
          }
        }
        const span = docMax - anchor[n - 1];
        const t = span > 0 ? (sy - anchor[n - 1]) / span : 1;
        return railPos[n - 1] + (1 - railPos[n - 1]) * (t > 1 ? 1 : t);
      };

      const st = { bar: -1, rail: -1, active: -2, tl: [], node: [], px: [] };

      const paintDots = (force) => {
        for (let i = 0; i < btns.length; i++) {
          const on = i === st.active;
          const d = dotEls[i];
          const key = on ? '1' : '0';
          if (d && (force || d.dataset.on !== key)) {
            d.dataset.on = key;
            d.style.background = on ? '#D9A05B' : '#0B0A08';
            d.style.borderColor = on ? '#D9A05B' : 'rgba(234,228,214,0.22)';
            d.style.transform = on ? 'scale(1.35)' : 'scale(1)';
            d.style.boxShadow = on ? '0 0 16px rgba(217,160,91,0.75)' : 'none';
          }
          const l = labEls[i];
          if (l && !btns[i].dataset.hover) {
            const show = on && this.railLabels !== false;
            const lk = show ? '1' : '0';
            if (force || l.dataset.on !== lk) {
              l.dataset.on = lk;
              l.style.opacity = show ? '1' : '0';
              l.style.transform = show ? 'translateX(0)' : 'translateX(-6px)';
              l.style.color = show ? 'rgba(234,228,214,0.78)' : 'rgba(234,228,214,0.42)';
            }
          }
        }
      };
      this.paintDots = paintDots;

      let ticking = false;
      const update = () => {
        ticking = false;

        /* ---- read phase: nothing above this line writes to the DOM ---- */
        for (let i = 0; i < this.scrollHooks.length; i++) this.scrollHooks[i]();
        const sh = document.documentElement.scrollHeight;
        if (sh !== lastSH) measure();
        const sy = window.scrollY;
        const vh = window.innerHeight;
        const p = sy < 0 ? 0 : (sy > docMax ? 1 : sy / docMax);

        // Browsers land scrollTo a fraction of a pixel short of the requested
        // offset (device-pixel snapping), which would leave a section one hair
        // below its own anchor and stop its dot lighting. Absorb that.
        const at = sy + 1;
        let active = -1;
        for (let i = 0; i < anchor.length; i++) if (at >= anchor[i]) active = i;
        const rp = railProgress(at);

        /* ---- write phase: every write is diffed against the last value ---- */
        // Top bar = raw document progress. Rail fill = section progress, so the
        // fill and the dots stay in lockstep.
        const q = Math.round(p * 1000) / 1000;
        if (bar && q !== st.bar) { st.bar = q; bar.style.transform = 'scaleX(' + q + ')'; }
        const rq = Math.round(rp * 1000) / 1000;
        if (railFill && rq !== st.rail) { st.rail = rq; railFill.style.transform = 'scaleY(' + rq + ')'; }
        if (active !== st.active) { st.active = active; paintDots(false); }

        for (let i = 0; i < tlGeo.length; i++) {
          const g = tlGeo[i];
          let pr = (vh * 0.62 - (g.top - sy)) / g.h;
          pr = pr < 0 ? 0 : (pr > 1 ? 1 : pr);
          const v = Math.round(pr * 1000) / 1000;
          if (v !== st.tl[i]) { st.tl[i] = v; timelines[i].style.transform = 'scaleY(' + v + ')'; }
        }

        for (let i = 0; i < nodeTop.length; i++) {
          const on = (nodeTop[i] - sy) < vh * 0.62;
          if (on !== st.node[i]) {
            st.node[i] = on;
            const n = nodes[i];
            n.style.background = on ? '#9DB07A' : '#0B0A08';
            n.style.boxShadow = on ? '0 0 16px rgba(157,176,122,0.8)' : 'none';
            n.style.transform = on ? 'scale(1.15)' : 'scale(1)';
          }
        }

        for (let i = 0; i < pxMid.length; i++) {
          const el = parallax[i];
          const s = parseFloat(el.dataset.parallax) || 0.05;
          // s/(1+s) reproduces the fixed point the old self-referential
          // (measure-the-transformed-rect) loop settled on.
          const off = ((pxMid[i] - sy) - vh / 2) * (-s / (1 + s));
          const v = Math.round(off * 10) / 10;
          if (v !== st.px[i]) { st.px[i] = v; el.style.transform = 'translate3d(0,' + v + 'px,0)'; }
        }
      };

      const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
      this.on(window, 'scroll', onScroll, { passive: true });
      this.onResize(() => { measure(); update(); });
      measure();
      update();
    }

    /* ---------- pointer-reactive cards ---------- */
    initTilt(root) {
      root.querySelectorAll('[data-tilt]').forEach(card => {
        const glow = card.querySelector('[data-glow]');
        const dot = card.querySelector('[data-glowdot]');
        let rect = null, px = 0, py = 0, queued = false;

        const paint = () => {
          queued = false;
          if (!rect) return;
          const x = px - rect.left, y = py - rect.top;
          const rx = ((y / rect.height) - 0.5) * -4.2;
          const ry = ((x / rect.width) - 0.5) * 4.6;
          card.style.transform = 'perspective(1100px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
          // Moving a pre-rendered gradient layer is a compositor job; rebuilding
          // the radial-gradient string every frame was a full card repaint.
          if (dot) dot.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
        };

        const sync = () => { rect = card.getBoundingClientRect(); };

        const enter = (e) => {
          sync();
          px = e.clientX; py = e.clientY;
          card.style.transition = 'transform .16s ease-out, border-color .5s ease, box-shadow .6s ease';
          card.style.willChange = 'transform';
          if (glow) { glow.style.opacity = '1'; glow.style.boxShadow = 'inset 0 0 0 1px rgba(157,176,122,0.34)'; }
          if (dot) dot.style.opacity = '1';
          this.tiltSync = sync;
          paint();
        };
        const move = (e) => {
          px = e.clientX; py = e.clientY;
          if (!queued) { queued = true; requestAnimationFrame(paint); }
        };
        const leave = () => {
          rect = null;
          if (this.tiltSync === sync) this.tiltSync = null;
          if (glow) { glow.style.opacity = '0'; glow.style.boxShadow = 'none'; }
          if (dot) dot.style.opacity = '0';
          card.style.transition = 'transform .8s cubic-bezier(.16,1,.3,1)';
          card.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg) translateY(0px)';
          setTimeout(() => { if (!rect) card.style.willChange = ''; }, 850);
        };

        this.on(card, 'pointerenter', enter);
        this.on(card, 'pointermove', move, { passive: true });
        this.on(card, 'pointerleave', leave);
      });

      // Keep the hovered card's cached rect honest while the page scrolls.
      this.scrollHooks.push(() => { if (this.tiltSync) this.tiltSync(); });
      this.onResize(() => { if (this.tiltSync) this.tiltSync(); });

      root.querySelectorAll('[data-icon]').forEach(icon => {
        const a = icon.closest('a');
        if (!a) return;
        this.on(a, 'pointerenter', () => { icon.style.transform = 'translateY(-5px) scale(1.16) rotate(-7deg)'; });
        this.on(a, 'pointerleave', () => { icon.style.transform = ''; });
      });
    }

    initCursor(root) {
      const c = this.cursor;
      if (!c || this.reduced) return;
      let shown = false;
      // Pinned exactly to the pointer: no easing, no chase loop.
      this.onPointer((x, y) => {
        c.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
        if (!shown) { shown = true; c.style.opacity = '1'; }
      });
      this.on(window, 'pointerleave', () => { shown = false; c.style.opacity = '0'; });
    }

    initNav(root) {
      root.querySelectorAll('[data-goto]').forEach(btn => {
        const lab = btn.querySelector('[data-label]');
        this.on(btn, 'click', () => {
          const t = root.querySelector('#' + btn.dataset.goto);
          if (!t) return;
          const top = t.getBoundingClientRect().top + window.scrollY - this.navOffset;
          try { window.scrollTo({ top: top, behavior: 'smooth' }); }
          catch (e) { window.scrollTo(0, top); }
        });
        this.on(btn, 'pointerenter', () => {
          if (this.railLabels === false) return;
          btn.dataset.hover = '1';
          if (lab) { lab.style.opacity = '1'; lab.style.transform = 'translateX(0)'; lab.style.color = 'rgba(234,228,214,0.85)'; }
        });
        this.on(btn, 'pointerleave', () => {
          delete btn.dataset.hover;
          if (this.paintDots) this.paintDots(true);
        });
      });
    }

    /* ---------- ambient mycelium field ---------- */
    initCanvas() {
      const cv = this.canvas;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      const density = this.props.ambientDensity != null ? this.props.ambientDensity : 78;
      const links = this.props.showFilaments !== false;
      const intensity = this.props.motionIntensity != null ? this.props.motionIntensity : 1;
      const TAU = Math.PI * 2;
      let W = 0, H = 0, dpr = 1, parts = [];
      let poolA = null, poolB = null, rA = 0, rB = 0;
      const mouse = { x: -9999, y: -9999 };

      const seed = () => {
        const n = this.reduced ? 24 : Math.round(density);
        parts = [];
        for (let i = 0; i < n; i++) {
          parts.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: 0.6 + Math.random() * 1.9,
            vy: -(0.07 + Math.random() * 0.22) * intensity,
            vx: (Math.random() - 0.5) * 0.16 * intensity,
            ph: Math.random() * Math.PI * 2,
            sp: 0.004 + Math.random() * 0.01,
            amber: Math.random() < 0.32
          });
        }
      };

      /* The two canopy pools used to be two full-viewport createRadialGradient +
         fillRect passes per frame — millions of gradient pixel evaluations every
         frame. They are radially symmetric and only ever translate, so bake each
         one into a quarter-scale sprite and blit it instead. */
      const makePool = (rgb, alpha, radius) => {
        const size = Math.max(16, Math.round(radius * 2 * 0.25));
        const oc = document.createElement('canvas');
        oc.width = size; oc.height = size;
        const o = oc.getContext('2d');
        const h = size / 2;
        const g = o.createRadialGradient(h, h, 0, h, h, h);
        g.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')');
        g.addColorStop(1, 'rgba(' + rgb + ',0)');
        o.fillStyle = g;
        o.fillRect(0, 0, size, size);
        return oc;
      };

      const resize = () => {
        const nw = cv.clientWidth, nh = cv.clientHeight;
        const nd = Math.min(2, window.devicePixelRatio || 1);
        if (nw === W && nh === H && nd === dpr) return;
        W = nw; H = nh; dpr = nd;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const m = Math.max(W, H);
        rA = m * 0.42; rB = m * 0.38;
        poolA = makePool('157,176,122', 0.055, rA);
        poolB = makePool('217,160,91', 0.045, rB);
        seed();
      };

      this.onResize(resize);
      this.onPointer((x, y) => { mouse.x = x; mouse.y = y; });
      resize();

      // Reusable per-frame batching buffers — allocated once, never per frame.
      const LB = 5, LD2 = 17000, LMAX = 0.13;
      const lbuf = [];
      for (let i = 0; i < LB; i++) lbuf.push([]);
      const DB = 8, TWMAX = 0.78;
      const dbuf = [];
      for (let i = 0; i < DB * 2; i++) dbuf.push([]);

      let t = 0;
      const draw = () => {
        t += 1;
        ctx.clearRect(0, 0, W, H);

        // slow canopy light pools
        const ax = W * (0.22 + 0.10 * Math.sin(t * 0.0013));
        const ay = H * (0.30 + 0.10 * Math.cos(t * 0.0011));
        const bx = W * (0.80 + 0.09 * Math.cos(t * 0.0009));
        const by = H * (0.68 + 0.08 * Math.sin(t * 0.0014));
        if (poolA) ctx.drawImage(poolA, ax - rA, ay - rA, rA * 2, rA * 2);
        if (poolB) ctx.drawImage(poolB, bx - rB, by - rB, rB * 2, rB * 2);

        const n = parts.length;
        for (let i = 0; i < n; i++) {
          const p = parts[i];
          p.ph += p.sp;
          p.x += p.vx + Math.sin(p.ph) * 0.24 * intensity;
          p.y += p.vy;
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 26000 && d2 > 0.01) {
            const f = (1 - d2 / 26000) * 0.9;
            const d = Math.sqrt(d2);
            p.x += (dx / d) * f; p.y += (dy / d) * f;
          }
          if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
          if (p.x < -12) p.x = W + 12;
          if (p.x > W + 12) p.x = -12;
        }

        /* Filaments: bucket by opacity and stroke each bucket as ONE path.
           Was one beginPath/stroke round-trip per connected pair. */
        if (links) {
          for (let k = 0; k < LB; k++) lbuf[k].length = 0;
          for (let i = 0; i < n; i++) {
            const a = parts[i];
            for (let j = i + 1; j < n; j++) {
              const b = parts[j];
              const dx = a.x - b.x, dy = a.y - b.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < LD2) {
                const al = (1 - d2 / LD2) * LMAX;
                let k = (al / LMAX * LB) | 0;
                if (k >= LB) k = LB - 1;
                const buf = lbuf[k];
                buf.push(a.x, a.y, b.x, b.y);
              }
            }
          }
          ctx.lineWidth = 0.6;
          for (let k = 0; k < LB; k++) {
            const buf = lbuf[k];
            if (!buf.length) continue;
            ctx.strokeStyle = 'rgba(157,176,122,' + (LMAX * (k + 0.5) / LB).toFixed(3) + ')';
            ctx.beginPath();
            for (let m = 0; m < buf.length; m += 4) {
              ctx.moveTo(buf[m], buf[m + 1]);
              ctx.lineTo(buf[m + 2], buf[m + 3]);
            }
            ctx.stroke();
          }
        }

        /* Spores: same trick — bucket by hue+twinkle, one fill per bucket. */
        for (let k = 0; k < dbuf.length; k++) dbuf[k].length = 0;
        for (let i = 0; i < n; i++) {
          const p = parts[i];
          const tw = 0.42 + 0.36 * Math.sin(p.ph * 1.7);
          let k = (tw / TWMAX * DB) | 0;
          if (k < 0) k = 0; else if (k >= DB) k = DB - 1;
          const buf = dbuf[(p.amber ? DB : 0) + k];
          buf.push(p.x, p.y, p.r);
        }
        for (let k = 0; k < dbuf.length; k++) {
          const buf = dbuf[k];
          if (!buf.length) continue;
          const amber = k >= DB;
          const tw = (k - (amber ? DB : 0) + 0.5) / DB * TWMAX;
          ctx.fillStyle = amber
            ? 'rgba(224,176,110,' + (tw * 0.72).toFixed(3) + ')'
            : 'rgba(174,192,140,' + (tw * 0.6).toFixed(3) + ')';
          ctx.beginPath();
          for (let m = 0; m < buf.length; m += 3) {
            const x = buf[m], y = buf[m + 1], r = buf[m + 2];
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, TAU);
          }
          ctx.fill();
        }

        this.craf = requestAnimationFrame(draw);
      };

      // Don't burn frames on a backgrounded tab.
      this.on(document, 'visibilitychange', () => {
        if (document.hidden) {
          if (this.craf) { cancelAnimationFrame(this.craf); this.craf = 0; }
        } else if (!this.craf) {
          this.craf = requestAnimationFrame(draw);
        }
      });
      draw();
    }
  }

  const start = () => new OrganicCv(PROPS).init();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
