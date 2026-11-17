// Small, dependency-free behaviour: project filter, figure lightbox,
// current-section highlight, and the chart's draw-in.
document.documentElement.classList.add('js');

// ── Project filter ──────────────────────────────────────────────
const chips = document.querySelectorAll('.chip');
const projects = document.querySelectorAll('.project');

chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    const want = chip.dataset.filter;
    chips.forEach((c) => {
      const on = c === chip;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', String(on));
    });
    const apply = () => projects.forEach((p) => {
      p.hidden = want !== 'all' && p.dataset.cat !== want;
    });
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(apply);
    } else apply();
  });
});

// ── Lightbox ────────────────────────────────────────────────────
const box = document.getElementById('lightbox');
const boxImg = document.getElementById('lightbox-img');
const boxCap = document.getElementById('lightbox-cap');

document.querySelectorAll('.zoom').forEach((btn) => {
  btn.addEventListener('click', () => {
    boxImg.src = btn.dataset.src;
    boxImg.alt = btn.querySelector('img')?.alt || btn.dataset.cap || '';
    boxCap.textContent = btn.dataset.cap || '';
    if (typeof box.showModal === 'function') box.showModal();
    else window.open(btn.dataset.src, '_blank', 'noopener');
  });
});
// Click on the backdrop closes it.
box.addEventListener('click', (e) => {
  if (e.target === box) box.close();
});

// ── Current section in the masthead ─────────────────────────────
const navLinks = [...document.querySelectorAll('.masthead__nav a')];
const sections = navLinks
  .map((a) => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) =>
          a.classList.toggle('is-here', a.getAttribute('href') === `#${entry.target.id}`)
        );
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  sections.forEach((s) => spy.observe(s));

  // Chart bars draw in once, when first seen.
  const seen = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-seen');
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.35 }
  );
  document.querySelectorAll('.chart').forEach((c) => seen.observe(c));
} else {
  document.querySelectorAll('.chart').forEach((c) => c.classList.add('is-seen'));
}

document.getElementById('year').textContent = new Date().getFullYear();

// ── Theme toggle (paper by default, ink on request) ─────────────
const themeBtn = document.getElementById("theme");
const root = document.documentElement;
const paint = () => { themeBtn.textContent = root.dataset.theme !== "light" ? "Light" : "Dark"; };
themeBtn.addEventListener("click", () => {
  const next = root.dataset.theme !== "light" ? "light" : "dark";
  const swap = () => {
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    paint();
  };
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return swap();
  const r = themeBtn.getBoundingClientRect();
  root.style.setProperty("--tx", r.left + r.width / 2 + "px");
  root.style.setProperty("--ty", r.top + r.height / 2 + "px");
  root.classList.add("theme-swap");
  document.startViewTransition(swap).finished.finally(() => root.classList.remove("theme-swap"));
});
paint();
