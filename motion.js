// Motion: headline reveal, scroll reveals, count-up, scroll-linked 3D, pointer tilt.
// Everything here steps aside when the visitor prefers reduced motion.
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Headline: split into words that rise out of a mask ──────────
(() => {
  const h1 = document.querySelector('h1');
  if (!h1 || calm) return;
  let i = 0;
  const split = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span'); w.className = 'w';
          const inner = document.createElement('span'); inner.textContent = part;
          inner.style.setProperty('--i', i++);
          w.append(inner); frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) split(child);
    });
  };
  h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
  split(h1);
})();

// ── Scroll reveals, a different kind per element type ───────────
(() => {
  const plan = [
    ['.figure-stat', 'up', true],
    ['.section__head', null, false],
    ['.section__no', 'left', false],
    ['.section__head h2', 'decode', false],
    ['.section__note', 'up', false],
    ['.filters', 'up', false],
    ['.project__meta', 'left', false],
    ['.project__body > *', 'up', true],
    ['.project__fig', 'swing', false],
    ['.plates__row .plate', 'fold', true],
    ['.entry:nth-child(odd)', 'up', false],
    ['.entry:nth-child(even)', 'left', false],
    ['.honours__title', 'left', false],
    ['.honours__list li', 'up', true],
    ['.toolbox > div', 'fold', true],
    ['.langs', 'up', false],
    ['.contact__list li', 'up', true],
    ['.colophon', 'scale', false],
  ];
  const targets = [];
  plan.forEach(([sel, kind, stagger]) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (kind) el.dataset.r = kind;
      if (stagger) el.style.setProperty('--i', [...el.parentElement.children].indexOf(el));
      targets.push(el);
    });
  });
  if (calm || !('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      if (en.target.dataset.r === 'decode') decode(en.target);
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  targets.forEach((el) => io.observe(el));
})();

// ── Key figures count up once ───────────────────────────────────
(() => {
  if (calm || !('IntersectionObserver' in window)) return;
  const fmt = (v, dec) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const el = en.target, end = +el.dataset.count, dec = +el.dataset.dec;
      const t0 = performance.now(), dur = 1400;
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        el.textContent = fmt(end * (1 - Math.pow(1 - k, 4)), dec);
        if (k < 1) requestAnimationFrame(tick); else el.textContent = fmt(end, dec);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((n) => io.observe(n));
})();

// ── Scroll-linked: progress bar, 3D deck, drifting numbers ──────
(() => {
  const root = document.documentElement;
  const decks = [...document.querySelectorAll('.deck')];
  const nos = [...document.querySelectorAll('.project__no')];
  let queued = false;
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const update = () => {
    queued = false;
    const vh = innerHeight;
    const max = root.scrollHeight - vh;
    root.style.setProperty('--scroll', max > 0 ? (scrollY / max).toFixed(4) : 0);
    if (calm) return;
    decks.forEach((d) => {
      const r = d.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (vh * 0.98 - r.top) / (vh * 0.62)));
      d.style.setProperty('--p', ease(p).toFixed(3));
    });
    nos.forEach((n) => {
      const r = n.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      n.style.setProperty('--drift', (((r.top - vh / 2) / vh) * -26).toFixed(1));
    });
  };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
})();

// ── Pointer tilt on figures (mouse only) ────────────────────────
if (!calm && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.classList.add('is-tilting');
      el.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (y * -7).toFixed(2) + 'deg');
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('is-tilting');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--rx', '0deg');
    });
  });
}

// ── Headings resolve out of noise ───────────────────────────────
function decode(el) {
  const final = el.textContent;
  const pool = '01<>/\\_#=+*';
  const dur = Math.min(1100, 380 + final.length * 45);
  const t0 = performance.now();
  el.setAttribute('aria-label', final);
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const shown = Math.floor(final.length * k);
    let out = final.slice(0, shown);
    for (let i = shown; i < final.length; i++) {
      out += final[i] === ' ' ? ' ' : pool[(Math.random() * pool.length) | 0];
    }
    el.textContent = out;
    if (k < 1) requestAnimationFrame(tick); else el.textContent = final;
  };
  requestAnimationFrame(tick);
}

// ── Local time readout (Jakarta) ────────────────────────────────
(() => {
  const clock = document.getElementById('clock');
  if (!clock) return;
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const tick = () => { clock.textContent = 'WIB ' + fmt.format(new Date()); };
  tick(); setInterval(tick, 1000);
})();
